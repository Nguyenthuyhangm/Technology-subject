package com.pricehawl.security;

import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.JwkProviderBuilder;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.security.interfaces.ECPublicKey;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Value("${supabase.url}")
    private String supabaseUrl;

    private JwkProvider jwkProvider;

    @PostConstruct
    public void init() {
        try {
            jwkProvider = new JwkProviderBuilder(
                    new URL(supabaseUrl + "/auth/v1/.well-known/jwks.json"))
                    .cached(10, 24, TimeUnit.HOURS)
                    .rateLimited(10, 1, TimeUnit.MINUTES)
                    .build();
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize JwkProvider for WebSocket", e);
        }
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    DecodedJWT decoded = JWT.decode(token);
                    String kid = decoded.getKeyId();
                    var jwk = jwkProvider.get(kid);
                    ECPublicKey publicKey = (ECPublicKey) jwk.getPublicKey();
                    JWT.require(Algorithm.ECDSA256(publicKey, null)).build().verify(token);

                    String userId = decoded.getSubject();
                    String email = decoded.getClaim("email").asString();
                    UserPrincipal principal = new UserPrincipal(userId, email);

                    accessor.setUser(new UsernamePasswordAuthenticationToken(
                            principal, null, List.of()));

                    log.debug("WebSocket authenticated: userId={}", userId);
                } catch (Exception e) {
                    log.warn("WebSocket JWT verification failed: {}", e.getMessage());
                    // Don't throw — unauthenticated connections can still connect
                    // but ChatController will reject unauthorized actions
                }
            }
        }

        return message;
    }
}
