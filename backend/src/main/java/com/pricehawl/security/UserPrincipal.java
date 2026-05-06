package com.pricehawl.security;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.security.Principal;

@Getter
@AllArgsConstructor
public class UserPrincipal implements Principal {
    private String userId;
    private String email;

    @Override
    public String getName() {
        return userId;
    }
}