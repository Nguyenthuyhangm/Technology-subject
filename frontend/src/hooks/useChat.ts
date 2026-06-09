import { useCallback, useEffect, useRef, useState } from 'react'
import { Client, type IMessage } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { type ChatMessageResponse, type ConversationDto } from '../api/chatApi'
import { BACKEND_URL } from '../lib/supabase'

export interface TypingIndicator {
  conversationId: number
  userId: string
  displayName: string
  typing: boolean
  isAdmin: boolean
}

export interface ReadReceiptEvent {
  conversationId: number
  messageId: number
  readerId: string
  readByIds: string[]
}

export interface AdminNotification {
  type: 'NEW_MESSAGE' | 'CONVERSATION_REOPENED'
  conversationId: number
  fromUserId: string
  fromUserName: string
  messagePreview: string
  timestamp: string
}

interface UseChatOptions {
  token: string | null
  conversationId: number | null
  isAdmin?: boolean
  onNewMessage?: (msg: ChatMessageResponse) => void
  onTyping?: (indicator: TypingIndicator) => void
  onReadReceipt?: (receipt: ReadReceiptEvent) => void
  onAdminNotification?: (notif: AdminNotification) => void
  onConversationClosed?: () => void
}

export function useChat({
  token,
  conversationId,
  isAdmin = false,
  onNewMessage,
  onTyping,
  onReadReceipt,
  onAdminNotification,
  onConversationClosed,
}: UseChatOptions) {
  const clientRef = useRef<Client | null>(null)
  const [connected, setConnected] = useState(false)

  const sendMessage = useCallback(
    (content: string) => {
      if (!clientRef.current?.connected || !conversationId) return
      clientRef.current.publish({
        destination: '/app/chat.send',
        body: JSON.stringify({ conversationId, content }),
      })
    },
    [conversationId]
  )

  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!clientRef.current?.connected || !conversationId) return
      clientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ conversationId, typing }),
      })
    },
    [conversationId]
  )

  useEffect(() => {
    if (!token) return

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)

        // Subscribe to conversation topic
        if (conversationId != null) {
          client.subscribe(`/topic/conversation/${conversationId}`, (frame: IMessage) => {
            const data = JSON.parse(frame.body)
            // System events (CONVERSATION_CLOSED)
            if (data.type === 'CONVERSATION_CLOSED') {
              onConversationClosed?.()
              return
            }
            onNewMessage?.(data as ChatMessageResponse)
          })

          client.subscribe(
            `/topic/conversation/${conversationId}/typing`,
            (frame: IMessage) => {
              onTyping?.(JSON.parse(frame.body) as TypingIndicator)
            }
          )

          client.subscribe(
            `/topic/conversation/${conversationId}/read`,
            (frame: IMessage) => {
              onReadReceipt?.(JSON.parse(frame.body) as ReadReceiptEvent)
            }
          )
        }

        // Admin subscribes to all notifications
        if (isAdmin) {
          client.subscribe('/topic/admin/notifications', (frame: IMessage) => {
            onAdminNotification?.(JSON.parse(frame.body) as AdminNotification)
          })
        }
      },
      onDisconnect: () => setConnected(false),
      onStompError: frame => console.error('STOMP error', frame),
    })

    clientRef.current = client
    client.activate()

    return () => {
      client.deactivate()
      clientRef.current = null
      setConnected(false)
    }
    // Re-connect when token or conversationId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, conversationId, isAdmin])

  return { connected, sendMessage, sendTyping }
}
