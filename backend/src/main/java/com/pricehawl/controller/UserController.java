package com.pricehawl.controller;

import com.pricehawl.dto.*;
import com.pricehawl.entity.User;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/me")
    public User me(Authentication auth) {
        UUID userId = UUID.fromString(auth.getName());

        String email = "unknown@email.com";
        Object principal = auth.getPrincipal();
        if (principal instanceof UserPrincipal) {
            email = ((UserPrincipal) principal).getEmail();
        }

        return service.getOrCreate(userId, email);
    }

    @PatchMapping("/me")
    public User update(Authentication auth,
                       @RequestBody UpdateUserRequest req) {

        UUID userId = UUID.fromString(auth.getName());
        return service.update(userId, req);
    }

    @PatchMapping("/me/preferences")
    public User preferences(Authentication auth,
                            @RequestBody UpdatePreferencesRequest req) {

        UUID userId = UUID.fromString(auth.getName());
        return service.updatePreferences(userId, req);
    }
}