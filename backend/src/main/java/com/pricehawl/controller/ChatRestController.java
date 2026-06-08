package com.pricehawl.controller;

import com.pricehawl.dto.chat.*;
import com.pricehawl.entity.Conversation;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRestController {

    private final ChatService chatService;

    // ── User endpoints ─────────────────────────────────────────────────────────

    /** Get (or lazily create) the authenticated user's conversation */
    @GetMapping("/my-conversation")
    public ResponseEntity<ConversationDto> getMyConversation(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = UUID.fromString(principal.getUserId());
        Conversation c = chatService.getOrCreateConversation(userId);
        return ResponseEntity.ok(chatService.toDto(c));
    }

    /** Paginated message history for user's own conversation */
    @GetMapping("/my-conversation/messages")
    public ResponseEntity<Page<ChatMessageResponse>> getMyMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        UUID userId = UUID.fromString(principal.getUserId());
        Conversation c = chatService.getOrCreateConversation(userId);
        return ResponseEntity.ok(chatService.getMessages(c.getId(), page, size));
    }

    /** User marks a message as read */
    @PostMapping("/my-conversation/messages/{messageId}/read")
    public ResponseEntity<ReadReceiptDto> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long messageId) {
        UUID userId = UUID.fromString(principal.getUserId());
        Conversation c = chatService.getOrCreateConversation(userId);
        return ResponseEntity.ok(chatService.markRead(c.getId(), messageId, userId));
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────

    /** List all conversations — admin only */
    @GetMapping("/admin/conversations")
    public ResponseEntity<List<ConversationDto>> listAll(
            @AuthenticationPrincipal UserPrincipal principal) {
        requireAdmin(principal);
        return ResponseEntity.ok(chatService.getAllConversations());
    }

    /** Paginated messages for any conversation — admin only */
    @GetMapping("/admin/conversations/{id}/messages")
    public ResponseEntity<Page<ChatMessageResponse>> getMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        requireAdmin(principal);
        return ResponseEntity.ok(chatService.getMessages(id, page, size));
    }

    /** Admin marks a message as read */
    @PostMapping("/admin/conversations/{id}/messages/{messageId}/read")
    public ResponseEntity<ReadReceiptDto> adminMarkRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @PathVariable Long messageId) {
        requireAdmin(principal);
        UUID adminId = UUID.fromString(principal.getUserId());
        return ResponseEntity.ok(chatService.markRead(id, messageId, adminId));
    }

    /** Admin claims conversation as primary handler */
    @PostMapping("/admin/conversations/{id}/claim")
    @Transactional
    public ResponseEntity<ConversationDto> claim(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        requireAdmin(principal);
        UUID adminId = UUID.fromString(principal.getUserId());
        Conversation c = chatService.claimConversation(id, adminId);
        return ResponseEntity.ok(chatService.toDto(c));
    }

    /** Admin closes a conversation */
    @PostMapping("/admin/conversations/{id}/close")
    @Transactional
    public ResponseEntity<ConversationDto> close(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        requireAdmin(principal);
        Conversation c = chatService.closeConversation(id);
        return ResponseEntity.ok(chatService.toDto(c));
    }

    /** Admin sends first message to a user */
    @PostMapping("/admin/users/{userId}/initiate")
    public ResponseEntity<ChatMessageResponse> adminInitiate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID userId,
            @RequestBody Map<String, String> body) {
        requireAdmin(principal);
        UUID adminId = UUID.fromString(principal.getUserId());
        String content = body.get("content");
        return ResponseEntity.ok(
                chatService.adminInitiateMessage(userId, adminId, principal.getEmail(), content));
    }

    private void requireAdmin(UserPrincipal principal) {
        if (principal == null) {
            log.warn("requireAdmin: principal is null (JWT missing or invalid)");
            throw new org.springframework.security.access.AccessDeniedException("Admin only");
        }
        if (!chatService.isAdmin(principal.getEmail())) {
            log.warn("requireAdmin: email '{}' not in admin list", principal.getEmail());
            throw new org.springframework.security.access.AccessDeniedException("Admin only");
        }
    }
}
