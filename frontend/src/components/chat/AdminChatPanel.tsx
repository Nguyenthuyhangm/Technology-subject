import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, CheckCheck, UserCheck, X, Bell, RefreshCw } from 'lucide-react'
import {
  chatApi,
  type ChatMessageResponse,
  type ConversationDto,
} from '../../api/chatApi'
import { useChat, type AdminNotification, type TypingIndicator } from '../../hooks/useChat'
import { useAuth } from '../../context/AuthContext'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  OPEN: { text: 'Đang mở', color: 'bg-blue-100 text-blue-700' },
  WAITING_ADMIN: { text: 'Chờ hỗ trợ', color: 'bg-amber-100 text-amber-700' },
  WAITING_USER: { text: 'Chờ user', color: 'bg-green-100 text-green-700' },
  CLOSED: { text: 'Đã đóng', color: 'bg-stone-100 text-stone-500' },
}

export default function AdminChatPanel() {
  const { session, user } = useAuth()
  const token = session?.access_token ?? null

  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [selected, setSelected] = useState<ConversationDto | null>(null)
  const [messages, setMessages] = useState<ChatMessageResponse[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [typings, setTypings] = useState<Record<string, TypingIndicator>>({})
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [badgeCounts, setBadgeCounts] = useState<Record<number, number>>({})
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [convError, setConvError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadConversations = useCallback((showSpinner = false) => {
    if (showSpinner) setLoadingConvs(true)
    setConvError(null)
    chatApi.adminGetConversations()
      .then(data => { setConversations(data); setLoadingConvs(false) })
      .catch(err => {
        console.error('Failed to load conversations:', err)
        const msg = err?.response?.status === 403
          ? 'Không có quyền truy cập. Kiểm tra email admin.'
          : err?.response?.status === 404
          ? 'API chat chưa được triển khai. Vui lòng khởi động lại backend.'
          : `Lỗi tải cuộc hội thoại: ${err?.response?.status ?? err?.message ?? 'Unknown error'}`
        setConvError(msg)
        setLoadingConvs(false)
      })
  }, [])

  useEffect(() => {
    loadConversations(true)
  }, [loadConversations])

  const { connected, sendMessage, sendTyping } = useChat({
    token,
    conversationId: selected?.id ?? null,
    isAdmin: true,
    onNewMessage: msg => {
      if (msg.conversationId === selected?.id) {
        setLoadingMsgs(false)
        setMsgError(null)
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
      } else {
        setBadgeCounts(prev => ({
          ...prev,
          [msg.conversationId]: (prev[msg.conversationId] ?? 0) + 1,
        }))
      }
      // Refresh conversation list for updated timestamps
      loadConversations()
    },
    onTyping: indicator => {
      if (!indicator.isAdmin) {
        // User is typing
        setTypings(prev => ({
          ...prev,
          [indicator.conversationId]: indicator,
        }))
        if (!indicator.typing) {
          setTypings(prev => {
            const next = { ...prev }
            delete next[indicator.conversationId]
            return next
          })
        }
      } else if (indicator.userId !== user?.id) {
        // Another admin is typing
        setTypings(prev => ({
          ...prev,
          [`admin_${indicator.conversationId}`]: indicator,
        }))
        if (!indicator.typing) {
          setTypings(prev => {
            const next = { ...prev }
            delete next[`admin_${indicator.conversationId}`]
            return next
          })
        }
      }
    },
    onAdminNotification: notif => {
      setNotifications(prev => [notif, ...prev.slice(0, 9)])
      if (!selected || selected.id !== notif.conversationId) {
        setBadgeCounts(prev => ({
          ...prev,
          [notif.conversationId]: (prev[notif.conversationId] ?? 0) + 1,
        }))
      }
      loadConversations()
    },
  })

  const selectConversation = useCallback((conv: ConversationDto) => {
    setSelected(conv)
    setMessages([])
    setMsgError(null)
    setLoadingMsgs(true)
    setBadgeCounts(prev => { const n = { ...prev }; delete n[conv.id]; return n })
    chatApi.adminGetMessages(conv.id)
      .then(page => { setMessages(page.content); setLoadingMsgs(false) })
      .catch(err => {
        console.error('Failed to load messages:', err)
        setMsgError('Không thể tải tin nhắn. Thử lại.')
        setLoadingMsgs(false)
      })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typings])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || !selected) return
    setInput('')
    sendTyping(false)
    sendMessage(content)
  }, [input, selected, sendMessage, sendTyping])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    sendTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => sendTyping(false), 3000)
  }

  const handleClaim = async () => {
    if (!selected) return
    const updated = await chatApi.adminClaim(selected.id)
    setSelected(updated)
    loadConversations()
  }

  const handleClose = async () => {
    if (!selected) return
    const updated = await chatApi.adminClose(selected.id)
    setSelected(updated)
    loadConversations()
  }

  // Typing indicators for currently selected conversation
  const userTyping = selected ? typings[selected.id] : null
  const adminTyping = selected ? typings[`admin_${selected.id}`] : null

  return (
    <div className="flex h-[calc(100vh-120px)] border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden bg-white dark:bg-[#111]">
      {/* Sidebar — conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-stone-200 dark:border-stone-700 flex flex-col">
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
          <span className="font-semibold text-sm text-stone-700 dark:text-stone-200">
            Hội thoại ({conversations.length})
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-stone-400'}`} />
            <button onClick={() => loadConversations(true)} className="text-stone-400 hover:text-stone-600">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Notifications badge */}
        {notifications.length > 0 && (
          <div className="mx-3 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-1">
              <Bell size={12} />
              Tin nhắn mới
            </div>
            {notifications.slice(0, 3).map((n, i) => (
              <button
                key={i}
                onClick={() => {
                  const conv = conversations.find(c => c.id === n.conversationId)
                  if (conv) selectConversation(conv)
                  setNotifications(prev => prev.filter((_, j) => j !== i))
                }}
                className="block w-full text-left text-xs text-stone-600 dark:text-stone-300 truncate hover:text-[#B7848C]"
              >
                {n.fromUserName}: {n.messagePreview}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingConvs && (
            <div className="flex items-center justify-center h-24 text-stone-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-[#B7848C] border-t-transparent rounded-full animate-spin" />
              Đang tải…
            </div>
          )}
          {!loadingConvs && convError && (
            <div className="mx-3 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
              <p className="font-semibold mb-1">Không thể tải danh sách</p>
              <p>{convError}</p>
              <button onClick={() => loadConversations()} className="mt-2 underline hover:no-underline">Thử lại</button>
              
            </div>
          )}
          {!loadingConvs && !convError && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-24 text-stone-400 text-xs text-center px-4 gap-1">
              <span>Chưa có cuộc hội thoại nào.</span>
              <span>Người dùng chưa gửi tin nhắn hỗ trợ.</span>
            </div>
          )}
          {conversations.map(conv => {
            const badge = badgeCounts[conv.id] ?? 0
            const s = STATUS_LABEL[conv.status] ?? STATUS_LABEL.OPEN
            return (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 border-b border-stone-100 dark:border-stone-800 transition-colors ${
                  selected?.id === conv.id ? 'bg-rose-50 dark:bg-rose-900/20 border-l-2 border-l-[#B7848C]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate max-w-[140px]">
                    {conv.userName}
                  </span>
                  <div className="flex items-center gap-1">
                    {badge > 0 && (
                      <span className="bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.color}`}>
                      {s.text}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-400 truncate">{conv.lastMessagePreview ?? 'Chưa có tin nhắn'}</p>
                {conv.primaryAdminName && (
                  <p className="text-[10px] text-[#B7848C] mt-0.5">Phụ trách: {conv.primaryAdminName}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="px-5 py-3 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-800 dark:text-stone-100">{selected.userName}</p>
              <p className="text-xs text-stone-400">{selected.userEmail}</p>
              {selected.primaryAdminName && (
                <p className="text-xs text-[#B7848C]">Đang hỗ trợ bởi: {selected.primaryAdminName}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!selected.primaryAdminId && (
                <button
                  onClick={handleClaim}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[#B7848C] text-white hover:bg-[#a07078] transition-colors"
                >
                  <UserCheck size={13} />
                  Nhận hỗ trợ
                </button>
              )}
              {selected.status !== 'CLOSED' && (
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-600 text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <X size={13} />
                  Đóng
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {loadingMsgs && (
              <div className="flex items-center justify-center h-20 gap-2 text-stone-400 text-sm">
                <div className="w-4 h-4 border-2 border-[#B7848C] border-t-transparent rounded-full animate-spin" />
                Đang tải tin nhắn…
              </div>
            )}
            {!loadingMsgs && msgError && (
              <div className="flex flex-col items-center justify-center h-20 gap-2 text-red-500 text-xs">
                <span>{msgError}</span>
                <button
                  onClick={() => selected && selectConversation(selected)}
                  className="underline hover:no-underline"
                >
                  Thử lại
                </button>
              </div>
            )}
            {!loadingMsgs && !msgError && messages.length === 0 && (
              <div className="flex items-center justify-center h-20 text-stone-400 text-xs">
                Chưa có tin nhắn nào trong cuộc hội thoại này.
              </div>
            )}
            {messages.map(msg => {
              const isMine = msg.senderType === 'ADMIN'
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 text-xs font-bold mr-2 flex-shrink-0 self-end">
                      {selected.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="max-w-[70%]">
                    {!isMine && (
                      <p className="text-xs text-stone-400 mb-1 ml-1">{selected.userName}</p>
                    )}
                    {isMine && (
                      <p className="text-xs text-stone-400 mb-1 text-right mr-1">{msg.senderName}</p>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isMine
                          ? 'bg-[#B7848C] text-white rounded-br-sm'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {isMine && msg.readByIds.length > 0 && (
                      <div className="flex justify-end mt-0.5 items-center gap-1">
                        <CheckCheck size={12} className="text-stone-400" />
                        <span className="text-[10px] text-stone-400">
                          Đã xem bởi {msg.readByIds.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Typing indicators */}
            {userTyping?.typing && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {selected.userName.charAt(0).toUpperCase()}
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <p className="text-xs text-stone-400 mb-1">Người dùng đang nhập…</p>
                  <div className="flex gap-1 items-center h-3">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {adminTyping?.typing && (
              <div className="text-center">
                <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                  ⚠ {adminTyping.displayName} đang trả lời khách hàng này
                </span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-700 flex items-end gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn hỗ trợ…"
              rows={2}
              className="flex-1 resize-none text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 outline-none text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:border-[#B7848C] transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !connected}
              className="mb-1 p-2.5 rounded-xl bg-[#B7848C] text-white disabled:opacity-40 hover:bg-[#a07078] transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
          Chọn một hội thoại để bắt đầu hỗ trợ
        </div>
      )}
    </div>
  )
}
