package com.pricehawl.service.support;

import com.pricehawl.service.UserService;
import com.pricehawl.dto.UpdatePreferencesRequest;
import com.pricehawl.dto.UpdateUserRequest;
import com.pricehawl.entity.User;
import com.pricehawl.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private UUID userId;
    private User mockUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        mockUser = User.builder()
                .id(userId)
                .email("phuong@example.com")
                .name("phuong")
                .plan("free")
                .build();
    }

    @Test
    void getOrCreate_UserExists_ReturnsExistingUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

        User result = userService.getOrCreate(userId, "phuong@example.com");

        assertEquals(mockUser.getEmail(), result.getEmail());
        verify(userRepository, never()).save(any());
    }

    @Test
    void update_ValidRequest_UpdatesNameAndPhone() {
        UpdateUserRequest req = new UpdateUserRequest();
        req.setName("Phuong Le");
        req.setPhone("0987654321");

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any())).thenReturn(mockUser);

        User updatedUser = userService.update(userId, req);

        assertEquals("Phuong Le", updatedUser.getName());
        assertEquals("0987654321", updatedUser.getPhone());
    }

    @Test
    void updatePreferences_ValidRequest_UpdatesThemeAndLang() {
        UpdatePreferencesRequest req = new UpdatePreferencesRequest();
        req.setTheme("dark");
        req.setLanguage("en");

        when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any())).thenReturn(mockUser);

        User result = userService.updatePreferences(userId, req);

        assertEquals("dark", result.getTheme());
        assertEquals("en", result.getLanguage());
    }
}