package com.pricehawl.security;

import com.auth0.jwk.Jwk;
import com.auth0.jwk.JwkProvider;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwkProvider jwkProvider;

    @Mock
    private Jwk jwk;

    @Mock
    private FilterChain filterChain;

    private JwtAuthFilter filter;

    private ECPublicKey publicKey;
    private ECPrivateKey privateKey;
    private static final String KID = "test-key-id";

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair keyPair = kpg.generateKeyPair();
        publicKey = (ECPublicKey) keyPair.getPublic();
        privateKey = (ECPrivateKey) keyPair.getPrivate();

        filter = new JwtAuthFilter();
        ReflectionTestUtils.setField(filter, "jwkProvider", jwkProvider);

        SecurityContextHolder.clearContext();
    }

    // --- happy path ---

    @Test
    void validToken_setsAuthenticationInSecurityContext() throws Exception {
        String token = JWT.create()
                .withSubject("user-abc")
                .withClaim("email", "alice@example.com")
                .withKeyId(KID)
                .sign(Algorithm.ECDSA256(publicKey, privateKey));

        when(jwkProvider.get(KID)).thenReturn(jwk);
        when(jwk.getPublicKey()).thenReturn(publicKey);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isInstanceOf(UserPrincipal.class);

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        assertThat(principal.getUserId()).isEqualTo("user-abc");
        assertThat(principal.getEmail()).isEqualTo("alice@example.com");

        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void validToken_chainContinues() throws Exception {
        String token = JWT.create()
                .withSubject("user-xyz")
                .withClaim("email", "bob@example.com")
                .withKeyId(KID)
                .sign(Algorithm.ECDSA256(publicKey, privateKey));

        when(jwkProvider.get(KID)).thenReturn(jwk);
        when(jwk.getPublicKey()).thenReturn(publicKey);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
    }

    // --- no / missing header ---

    @Test
    void noAuthorizationHeader_chainContinuesWithoutAuth() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void authorizationHeaderWithoutBearerPrefix_chainContinuesWithoutAuth() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    void bearerPrefixOnly_returns401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer not.a.jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(filterChain, never()).doFilter(any(), any());
    }

    // --- invalid / tampered tokens ---

    @Test
    void tokenSignedWithWrongKey_returns401() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"));
        KeyPair wrongPair = kpg.generateKeyPair();

        String token = JWT.create()
                .withSubject("attacker")
                .withKeyId(KID)
                .sign(Algorithm.ECDSA256((ECPublicKey) wrongPair.getPublic(),
                        (ECPrivateKey) wrongPair.getPrivate()));

        when(jwkProvider.get(KID)).thenReturn(jwk);
        // provider returns the CORRECT public key → signature mismatch
        when(jwk.getPublicKey()).thenReturn(publicKey);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    void jwkProviderThrows_returns401() throws Exception {
        String token = JWT.create()
                .withSubject("user-abc")
                .withKeyId(KID)
                .sign(Algorithm.ECDSA256(publicKey, privateKey));

        when(jwkProvider.get(KID)).thenThrow(new RuntimeException("JWKS unavailable"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(filterChain, never()).doFilter(any(), any());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void malformedToken_returns401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer totally-not-a-jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(401);
        verify(filterChain, never()).doFilter(any(), any());
    }

    // --- init() method ---

    @Test
    void init_withValidUrl_buildsProviderWithoutThrowing() {
        JwtAuthFilter newFilter = new JwtAuthFilter();
        ReflectionTestUtils.setField(newFilter, "supabaseUrl", "http://localhost:54321");
        assertDoesNotThrow((org.junit.jupiter.api.function.Executable) newFilter::init);
    }

    @Test
    void init_withInvalidUrl_throwsRuntimeException() {
        JwtAuthFilter newFilter = new JwtAuthFilter();
        ReflectionTestUtils.setField(newFilter, "supabaseUrl", "not-a-valid-url");
        assertThrows(RuntimeException.class, newFilter::init);
    }

    // --- principal content ---

    @Test
    void validToken_principalNameEqualsUserId() throws Exception {
        String token = JWT.create()
                .withSubject("subject-id-42")
                .withClaim("email", "user@domain.io")
                .withKeyId(KID)
                .sign(Algorithm.ECDSA256(publicKey, privateKey));

        when(jwkProvider.get(KID)).thenReturn(jwk);
        when(jwk.getPublicKey()).thenReturn(publicKey);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        UserPrincipal principal = (UserPrincipal)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        assertThat(principal.getName()).isEqualTo("subject-id-42");
    }
}
