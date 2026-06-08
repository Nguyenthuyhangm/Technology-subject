package com.pricehawl.service;

import com.pricehawl.dto.chat.*;
import com.pricehawl.entity.*;
import com.pricehawl.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepo;
    private final MessageRepository messageRepo;
    private final MessageReadRepository messageReadRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final StringRedisTemplate redisTemplate;

    @Value("${chat.admin-emails:}")
    private List<String> adminEmails;

    // ── Utility ────────────────────────────────────────────────────────────────

    public boolean isAdmin(String email) {
        return adminEmails.contains(email);
    }

    private String resolveDisplayName(UUID senderId, SenderType senderType, boolean visibleToUser) {
        if (senderType == SenderType.ADMIN && visibleToUser) {
            return "Hỗ trợ viên";
        }
        return userRepo.findById(senderId)
                .map(u -> u.getName())
                .orElse("Unknown");
    }

    // ── Conversation ───────────────────────────────────────────────────────────

    @Transactional
    public Conversation getOrCreateConversation(UUID userId) {
        return conversationRepo.findByUserId(userId).orElseGet(() -> {
            Conversation c = Conversation.builder()
                    .userId(userId)
                    .status(ConversationStatus.WAITING_ADMIN)
                    .build();
            return conversationRepo.save(c);
        });
    }

    @Transactional
    public Conversation reopenIfClosed(Conversation conversation) {
        if (conversation.getStatus() == ConversationStatus.CLOSED) {
            conversation.setStatus(ConversationStatus.OPEN);
            conversation.setClosedAt(null);
            conversationRepo.save(conversation);

            // Notify admins the conversation was reopened
            AdminNotificationDto notif = AdminNotificationDto.builder()
                    .type("CONVERSATION_REOPENED")
                    .conversationId(conversation.getId())
                    .fromUserId(conversation.getUserId())
                    .timestamp(LocalDateTime.now())
                    .build();
            messagingTemplate.convertAndSend("/topic/admin/notifications", notif);
        }
        return conversation;
    }

    public ConversationDto toDto(Conversation c) {
        String userName = userRepo.findById(c.getUserId())
                .map(u -> u.getName()).orElse("Unknown");
        String userEmail = userRepo.findById(c.getUserId())
                .map(u -> u.getEmail()).orElse("");
        String primaryAdminName = null;
        if (c.getPrimaryAdminId() != null) {
            primaryAdminName = userRepo.findById(c.getPrimaryAdminId())
                    .map(u -> u.getName()).orElse(null);
        }
        List<Message> messages = messageRepo.findByConversationIdOrderByCreatedAtAsc(c.getId());
        String lastPreview = messages.isEmpty() ? null
                : messages.get(messages.size() - 1).getContent();
        if (lastPreview != null && lastPreview.length() > 60) {
            lastPreview = lastPreview.substring(0, 60) + "…";
        }

        return ConversationDto.builder()
                .id(c.getId())
                .userId(c.getUserId())
                .userName(userName)
                .userEmail(userEmail)
                .primaryAdminId(c.getPrimaryAdminId())
                .primaryAdminName(primaryAdminName)
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .lastMessagePreview(lastPreview)
                .build();
    }

    // ── Message ────────────────────────────────────────────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(Long conversationId, UUID senderId,
                                           String senderEmail, String content) {
        Conversation conversation = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found: " + conversationId));

        boolean senderIsAdmin = isAdmin(senderEmail);
        SenderType senderType = senderIsAdmin ? SenderType.ADMIN : SenderType.USER;

        // Reopen conversation if needed (user sends to closed conversation)
        if (!senderIsAdmin) {
            reopenIfClosed(conversation);
            conversation.setStatus(ConversationStatus.WAITING_ADMIN);
        } else {
            if (conversation.getStatus() != ConversationStatus.CLOSED) {
                conversation.setStatus(ConversationStatus.WAITING_USER);
            }
            // Set primary admin if not yet set
            if (conversation.getPrimaryAdminId() == null) {
                conversation.setPrimaryAdminId(senderId);
            }
        }
        conversationRepo.save(conversation);

        Message message = Message.builder()
                .conversationId(conversationId)
                .senderId(senderId)
                .senderType(senderType)
                .content(content)
                .build();
        message = messageRepo.save(message);

        String displayName = resolveDisplayName(senderId, senderType, false);
        ChatMessageResponse response = ChatMessageResponse.builder()
                .id(message.getId())
                .conversationId(conversationId)
                .senderId(senderId)
                .senderType(senderType)
                .senderName(displayName)
                .content(content)
                .createdAt(message.getCreatedAt())
                .readByIds(List.of())
                .build();

        // Broadcast to conversation subscribers
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                response);

        // Notify admins when user sends a message
        if (!senderIsAdmin) {
            String preview = content.length() > 60 ? content.substring(0, 60) + "…" : content;
            String fromName = userRepo.findById(senderId).map(u -> u.getName()).orElse("Unknown");
            AdminNotificationDto notif = AdminNotificationDto.builder()
                    .type("NEW_MESSAGE")
                    .conversationId(conversationId)
                    .fromUserId(senderId)
                    .fromUserName(fromName)
                    .messagePreview(preview)
                    .timestamp(message.getCreatedAt())
                    .build();
            messagingTemplate.convertAndSend("/topic/admin/notifications", notif);
        }

        return response;
    }

    public Page<ChatMessageResponse> getMessages(Long conversationId, int page, int size) {
        return messageRepo.findByConversationIdOrderByCreatedAtAsc(
                        conversationId, PageRequest.of(page, size))
                .map(m -> {
                    List<UUID> readers = messageReadRepo.findReaderIdsByMessageId(m.getId());
                    return ChatMessageResponse.builder()
                            .id(m.getId())
                            .conversationId(conversationId)
                            .senderId(m.getSenderId())
                            .senderType(m.getSenderType())
                            .senderName(resolveDisplayName(m.getSenderId(), m.getSenderType(), false))
                            .content(m.getContent())
                            .createdAt(m.getCreatedAt())
                            .readByIds(readers)
                            .build();
                });
    }

    // ── Typing indicator (Redis TTL-based) ─────────────────────────────────────

    public void handleTyping(Long conversationId, UUID userId, String userEmail,
                             boolean typing) {
        boolean senderIsAdmin = isAdmin(userEmail);
        String displayName = senderIsAdmin
                ? userRepo.findById(userId).map(u -> u.getName()).orElse("Hỗ trợ viên")
                : "Người dùng";

        String redisKey = "chat:typing:" + conversationId + ":" + userId;
        if (typing) {
            redisTemplate.opsForValue().set(redisKey, displayName, Duration.ofSeconds(8));
        } else {
            redisTemplate.delete(redisKey);
        }

        TypingDto dto = TypingDto.builder()
                .conversationId(conversationId)
                .userId(userId)
                .displayName(displayName)
                .typing(typing)
                .isAdmin(senderIsAdmin)
                .build();

        messagingTemplate.convertAndSend("/topic/conversation/" + conversationId + "/typing", dto);
    }

    // ── Read receipts ──────────────────────────────────────────────────────────

    @Transactional
    public ReadReceiptDto markRead(Long conversationId, Long messageId, UUID readerId) {
        if (!messageReadRepo.existsByMessageIdAndReaderId(messageId, readerId)) {
            MessageRead receipt = MessageRead.builder()
                    .messageId(messageId)
                    .readerId(readerId)
                    .build();
            messageReadRepo.save(receipt);
        }

        List<UUID> readers = messageReadRepo.findReaderIdsByMessageId(messageId);
        ReadReceiptDto dto = ReadReceiptDto.builder()
                .conversationId(conversationId)
                .messageId(messageId)
                .readerId(readerId)
                .readByIds(readers)
                .build();

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId + "/read",
                dto);

        return dto;
    }

    // ── Admin operations ───────────────────────────────────────────────────────

    @Transactional
    public Conversation claimConversation(Long conversationId, UUID adminId) {
        Conversation c = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        c.setPrimaryAdminId(adminId);
        return conversationRepo.save(c);
    }

    @Transactional
    public Conversation closeConversation(Long conversationId) {
        Conversation c = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        c.setStatus(ConversationStatus.CLOSED);
        c.setClosedAt(LocalDateTime.now());
        c = conversationRepo.save(c);

        // Notify user that conversation was closed
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                java.util.Map.of("type", "CONVERSATION_CLOSED", "conversationId", conversationId));

        return c;
    }

    public List<ConversationDto> getAllConversations() {
        return conversationRepo.findAllByOrderByUpdatedAtDesc()
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Admin sends message to a user (initiated by admin) ───────────────────

    @Transactional
    public ChatMessageResponse adminInitiateMessage(UUID userId, UUID adminId,
                                                    String adminEmail, String content) {
        Conversation conversation = getOrCreateConversation(userId);
        if (conversation.getPrimaryAdminId() == null) {
            conversation.setPrimaryAdminId(adminId);
            conversationRepo.save(conversation);
        }
        return sendMessage(conversation.getId(), adminId, adminEmail, content);
    }
}
