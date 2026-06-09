import apiClient from './apiClient'

export interface ConversationDto {
  id: number
  userId: string
  userName: string
  userEmail: string
  primaryAdminId: string | null
  primaryAdminName: string | null
  status: 'OPEN' | 'WAITING_ADMIN' | 'WAITING_USER' | 'CLOSED'
  createdAt: string
  updatedAt: string
  lastMessagePreview: string | null
  unreadCount: number
}

export interface ChatMessageResponse {
  id: number
  conversationId: number
  senderId: string
  senderType: 'USER' | 'ADMIN'
  senderName: string
  content: string
  createdAt: string
  readByIds: string[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// ── User API ─────────────────────────────────────────────────────────────────

export const chatApi = {
  getMyConversation: () =>
    apiClient.get<ConversationDto>('/chat/my-conversation').then(r => r.data),

  getMyMessages: (page = 0, size = 50) =>
    apiClient
      .get<PageResponse<ChatMessageResponse>>('/chat/my-conversation/messages', {
        params: { page, size },
      })
      .then(r => r.data),

  markMessageRead: (messageId: number) =>
    apiClient
      .post(`/chat/my-conversation/messages/${messageId}/read`)
      .then(r => r.data),

  // ── Admin API ─────────────────────────────────────────────────────────────

  adminGetConversations: () =>
    apiClient.get<ConversationDto[]>('/chat/admin/conversations').then(r => r.data),

  adminGetMessages: (conversationId: number, page = 0, size = 50) =>
    apiClient
      .get<PageResponse<ChatMessageResponse>>(
        `/chat/admin/conversations/${conversationId}/messages`,
        { params: { page, size } }
      )
      .then(r => r.data),

  adminMarkRead: (conversationId: number, messageId: number) =>
    apiClient
      .post(`/chat/admin/conversations/${conversationId}/messages/${messageId}/read`)
      .then(r => r.data),

  adminClaim: (conversationId: number) =>
    apiClient
      .post<ConversationDto>(`/chat/admin/conversations/${conversationId}/claim`)
      .then(r => r.data),

  adminClose: (conversationId: number) =>
    apiClient
      .post<ConversationDto>(`/chat/admin/conversations/${conversationId}/close`)
      .then(r => r.data),

  adminInitiate: (userId: string, content: string) =>
    apiClient
      .post<ChatMessageResponse>(`/chat/admin/users/${userId}/initiate`, { content })
      .then(r => r.data),
}
