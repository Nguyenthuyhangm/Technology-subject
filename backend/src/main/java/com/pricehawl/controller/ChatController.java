package com.pricehawl.controller;

import com.pricehawl.dto.chat.ChatMessageRequest;
import com.pricehawl.dto.chat.ChatMessageResponse;
import com.pricehawl.dto.chat.TypingRequest;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request, Principal principal) {
        UserPrincipal up = extractPrincipal(principal);
        if (up == null) {
            log.warn("Unauthenticated WebSocket send attempt rejected");
            return;
        }

        chatService.sendMessage(
                request.getConversationId(),
                UUID.fromString(up.getUserId()),
                up.getEmail(),
                request.getContent()
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingRequest request, Principal principal) {
        UserPrincipal up = extractPrincipal(principal);
        if (up == null) return;

        chatService.handleTyping(
                request.getConversationId(),
                UUID.fromString(up.getUserId()),
                up.getEmail(),
                request.isTyping()
        );
    }

    private UserPrincipal extractPrincipal(Principal principal) {
        if (principal instanceof UsernamePasswordAuthenticationToken auth) {
            if (auth.getPrincipal() instanceof UserPrincipal up) {
                return up;
            }
        }
        return null;
    }
}
