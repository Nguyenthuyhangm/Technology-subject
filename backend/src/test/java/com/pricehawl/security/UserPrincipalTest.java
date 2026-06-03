package com.pricehawl.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserPrincipalTest {

    @Test
    void getName_returnsUserId() {
        UserPrincipal principal = new UserPrincipal("user-123", "test@example.com");
        assertThat(principal.getName()).isEqualTo("user-123");
    }

    @Test
    void getUserId_returnsCorrectValue() {
        UserPrincipal principal = new UserPrincipal("user-abc", "foo@bar.com");
        assertThat(principal.getUserId()).isEqualTo("user-abc");
    }

    @Test
    void getEmail_returnsCorrectValue() {
        UserPrincipal principal = new UserPrincipal("user-abc", "foo@bar.com");
        assertThat(principal.getEmail()).isEqualTo("foo@bar.com");
    }

    @Test
    void getName_matchesUserId_notEmail() {
        UserPrincipal principal = new UserPrincipal("id-999", "someone@example.com");
        assertThat(principal.getName()).isEqualTo(principal.getUserId());
        assertThat(principal.getName()).isNotEqualTo(principal.getEmail());
    }

    @Test
    void constructor_allowsNullValues() {
        UserPrincipal principal = new UserPrincipal(null, null);
        assertThat(principal.getName()).isNull();
        assertThat(principal.getEmail()).isNull();
    }
}
