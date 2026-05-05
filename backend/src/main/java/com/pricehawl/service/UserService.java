package com.pricehawl.service;

import com.pricehawl.dto.*;
import com.pricehawl.entity.User;
import com.pricehawl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repo;

    public User getOrCreate(UUID id, String email) {
        return repo.findById(id)
                .orElseGet(() -> repo.save(
                        User.builder()
                                .id(id)
                                .email(email)
                                .name(email.split("@")[0])
                                .plan("free")
                                .theme("system")
                                .language("vi")
                                .build()
                ));
    }

    /**
     * Create local user record using id returned by auth provider.
     * If user already exists, return existing record.
     */
    public User createFromAuth(UUID id, String email, String name, String phone) {
        return repo.findById(id).orElseGet(() -> repo.save(
                User.builder()
                        .id(id)
                        .email(email)
                        .name(name != null && !name.isBlank() ? name : email.split("@")[0])
                        .phone(phone)
                        .plan("free")
                        .theme("system")
                        .language("vi")
                        .build()
        ));
    }

    public User update(UUID id, UpdateUserRequest req) {
        User user = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        if (req.getName() != null) user.setName(req.getName());
        if (req.getPhone() != null) user.setPhone(req.getPhone());

        return repo.save(user);
    }

    public User updatePreferences(UUID id, UpdatePreferencesRequest req) {
        User user = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        if (req.getTheme() != null) user.setTheme(req.getTheme());
        if (req.getLanguage() != null) user.setLanguage(req.getLanguage());

        return repo.save(user);
    }
}