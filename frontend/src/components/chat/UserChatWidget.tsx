import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, CheckCheck } from 'lucide-react'
import { chatApi, type ChatMessageResponse } from '../../api/chatApi'
import { useChat, type TypingIndicator } from '../../hooks/useChat'
import { useAuth } from '../../context/AuthContext'
import { ADMIN_EMAILS } from '../admin/adminConstants'

interface Message extends ChatMessageResponse {
  pending?: boolean
}

export default function UserChatWidget() {
  const { session, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState<TypingIndicator | null>(null)
  const [status, setStatus] = useState<string>('WAITING_ADMIN')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const token = session?.access_token ?? null
  const userId = user?.id ?? null

  const { connected, sendMessage, sendTyping } = useChat({
    token,
    conversationId,
    onNewMessage: msg => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        // Replace the matching optimistic placeholder with the real server message
        const pendingIdx = prev.findIndex(
          m => m.pending && m.content === msg.content && m.senderType === msg.senderType
        )
        if (pendingIdx !== -1) {
          return prev.map((m, i) => (i === pendingIdx ? msg : m))
        }
        return [...prev, msg]
      })
      if (!open) setUnread(n => n + 1)
    },
    onTyping: indicator => {
      if (indicator.isAdmin) {
        setTyping(indicator.typing ? indicator : null)
      }
    },
    onConversationClosed: () => setStatus('CLOSED'),
  })

  // Load conversation + messages when widget opens
  useEffect(() => {
    if (!open || !session) return
    setUnread(0)
    chatApi
      .getMyConversation()
      .then(conv => {
        setConversationId(conv.id)
        setStatus(conv.status)
        return chatApi.getMyMessages()
      })
      .then(page => setMessages(page.content))
      .catch(console.error)
  }, [open, session])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const handleSend = useCallback(() => {
    const content = input.trim()
    if (!content || !conversationId) return
    setInput('')
    sendTyping(false)

    // Optimistic message
    const optimistic: Message = {
      id: Date.now(),
      conversationId: conversationId,
      senderId: userId!,
      senderType: 'USER',
      senderName: user?.user_metadata?.name ?? 'Bạn',
      content,
      createdAt: new Date().toISOString(),
      readByIds: [],
      pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    sendMessage(content)
  }, [input, conversationId, userId, sendMessage, sendTyping, user])

  // Early returns AFTER all hooks
  if (user?.email && ADMIN_EMAILS.includes(user.email)) return null
  if (!session || !user) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    sendTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => sendTyping(false), 3000)
  }

  const statusLabel: Record<string, string> = {
    OPEN: 'Đang mở',
    WAITING_ADMIN: 'Đang chờ hỗ trợ viên',
    WAITING_USER: 'Đang chờ phản hồi',
    CLOSED: 'Đã đóng',
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); setUnread(0) }}
        className="fixed bottom-6 left-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#B7848C] text-white shadow-lg hover:bg-[#a07078] transition-colors"
        aria-label="Mở chat hỗ trợ"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 h-[520px] flex flex-col bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#B7848C] text-white">
            <div>
              <p className="font-semibold text-sm">Hỗ trợ khách hàng</p>
              <p className="text-xs opacity-80">{statusLabel[status] ?? status}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-300' : 'bg-stone-400'}`} />
              <button onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-stone-400 text-sm mt-8">
                Chào {user.user_metadata?.name ?? 'bạn'}! Chúng tôi có thể giúp gì cho bạn?
              </div>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.senderType === 'ADMIN' && (
                  <div className="w-7 h-7 rounded-full bg-[#B7848C] flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end">
                    HT
                  </div>
                )}
                <div className="max-w-[75%]">
                  {msg.senderType === 'ADMIN' && (
                    <p className="text-xs text-stone-400 mb-1 ml-1">Hỗ trợ viên</p>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm break-words ${
                      msg.senderType === 'USER'
                        ? 'bg-[#B7848C] text-white rounded-br-sm'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-bl-sm'
                    } ${msg.pending ? 'opacity-60' : ''}`}
                  >
                    {msg.content}
                  </div>
                  {msg.senderType === 'USER' && msg.readByIds.length > 0 && (
                    <div className="flex justify-end mt-0.5">
                      <CheckCheck size={12} className="text-[#B7848C]" />
                      <span className="text-xs text-stone-400 ml-0.5">Đã xem</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-[#B7848C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  HT
                </div>
                <div className="bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-stone-200 dark:border-stone-700 flex items-end gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={status === 'CLOSED' ? 'Nhắn tin để mở lại cuộc trò chuyện…' : 'Nhập tin nhắn…'}
              rows={1}
              className="flex-1 resize-none text-sm bg-transparent outline-none text-stone-800 dark:text-stone-100 placeholder-stone-400 max-h-24 py-2"
              style={{ lineHeight: '1.4' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !connected}
              className="mb-1.5 p-2 rounded-full bg-[#B7848C] text-white disabled:opacity-40 hover:bg-[#a07078] transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
