package com.pricehawl.security;

import com.auth0.jwk.JwkProvider;
import com.auth0.jwk.JwkProviderBuilder;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URL;
import java.security.interfaces.ECPublicKey;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);

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
            throw new RuntimeException("Failed to initialize JwkProvider", e);
        }
    }
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            try {
                String token = header.substring(7);

                // Decode trước để lấy kid (key id)
                DecodedJWT decoded = JWT.decode(token);
                String kid = decoded.getKeyId();

                // Lấy public key từ Supabase JWKS
                var jwk = jwkProvider.get(kid);
                ECPublicKey publicKey = (ECPublicKey) jwk.getPublicKey();

                // Verify bằng ES256 (ECC P-256)
                JWT.require(Algorithm.ECDSA256(publicKey, null))
                        .build()
                        .verify(token);

                String userId = decoded.getSubject();
                String email = decoded.getClaim("email").asString();

                UserPrincipal principal = new UserPrincipal(userId, email);

                var auth = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of());

                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception e) {
                log.debug("JWT verification failed: {}", e.getMessage());
                response.sendError(401, "Invalid JWT");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}