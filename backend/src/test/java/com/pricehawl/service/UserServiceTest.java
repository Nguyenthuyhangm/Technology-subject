package com.pricehawl.service;

import com.pricehawl.dto.UpdatePreferencesRequest;
import com.pricehawl.dto.UpdateUserRequest;
import com.pricehawl.entity.User;
import com.pricehawl.repository.UserRepository;
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
    private UserRepository repo;

    @InjectMocks
    private UserService service;

    // =========================
    // getOrCreate
    // =========================

    @Test
    void shouldReturnExistingUser() {

        UUID id = UUID.randomUUID();

        User user = User.builder()
                .id(id)
                .email("test@gmail.com")
                .name("test")
                .build();

        when(repo.findById(id))
                .thenReturn(Optional.of(user));

        User result = service.getOrCreate(
                id,
                "test@gmail.com"
        );

        assertEquals(id, result.getId());

        verify(repo, never())
                .save(any());
    }

    @Test
    void shouldCreateNewUserWhenNotExists() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.getOrCreate(
                        id,
                        "john@gmail.com"
                );

        assertEquals(id, result.getId());
        assertEquals("john@gmail.com", result.getEmail());
        assertEquals("john", result.getName());

        assertEquals("free", result.getPlan());
        assertEquals("system", result.getTheme());
        assertEquals("vi", result.getLanguage());

        verify(repo).save(any(User.class));
    }

    // =========================
    // createFromAuth
    // =========================

    @Test
    void shouldReturnExistingUserFromAuth() {

        UUID id = UUID.randomUUID();

        User existing =
                User.builder()
                        .id(id)
                        .email("existing@gmail.com")
                        .build();

        when(repo.findById(id))
                .thenReturn(Optional.of(existing));

        User result =
                service.createFromAuth(
                        id,
                        "new@gmail.com",
                        "John",
                        "0123"
                );

        assertSame(existing, result);

        verify(repo, never())
                .save(any());
    }

    @Test
    void shouldCreateUserFromAuthUsingProvidedName() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.createFromAuth(
                        id,
                        "john@gmail.com",
                        "John Doe",
                        "0988888888"
                );

        assertEquals("John Doe", result.getName());
        assertEquals("0988888888", result.getPhone());

        verify(repo).save(any(User.class));
    }

    @Test
    void shouldCreateUserFromAuthUsingEmailPrefixWhenNameBlank() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.createFromAuth(
                        id,
                        "abc@gmail.com",
                        "",
                        "099999999"
                );

        assertEquals("abc", result.getName());
    }

    @Test
    void shouldCreateUserFromAuthUsingEmailPrefixWhenNameNull() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.createFromAuth(
                        id,
                        "demo@gmail.com",
                        null,
                        null
                );

        assertEquals("demo", result.getName());
    }

    // =========================
    // update
    // =========================

    @Test
    void shouldUpdateNameAndPhone() {

        UUID id = UUID.randomUUID();

        User user = User.builder()
                .id(id)
                .name("Old")
                .phone("111")
                .build();

        UpdateUserRequest req =
                new UpdateUserRequest();

        req.setName("New Name");
        req.setPhone("222");

        when(repo.findById(id))
                .thenReturn(Optional.of(user));

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.update(id, req);

        assertEquals("New Name", result.getName());
        assertEquals("222", result.getPhone());
    }

    @Test
    void shouldUpdateOnlyName() {

        UUID id = UUID.randomUUID();

        User user = User.builder()
                .id(id)
                .name("Old")
                .phone("111")
                .build();

        UpdateUserRequest req =
                new UpdateUserRequest();

        req.setName("Updated");

        when(repo.findById(id))
                .thenReturn(Optional.of(user));

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.update(id, req);

        assertEquals("Updated", result.getName());
        assertEquals("111", result.getPhone());
    }

    @Test
    void shouldThrowWhenUserNotFoundForUpdate() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        RuntimeException ex =
                assertThrows(
                        RuntimeException.class,
                        () -> service.update(
                                id,
                                new UpdateUserRequest()
                        )
                );

        assertTrue(
                ex.getMessage().contains("User not found")
        );
    }

    // =========================
    // updatePreferences
    // =========================

    @Test
    void shouldUpdatePreferences() {

        UUID id = UUID.randomUUID();

        User user =
                User.builder()
                        .id(id)
                        .theme("system")
                        .language("vi")
                        .build();

        UpdatePreferencesRequest req =
                new UpdatePreferencesRequest();

        req.setTheme("dark");
        req.setLanguage("en");

        when(repo.findById(id))
                .thenReturn(Optional.of(user));

        when(repo.save(any(User.class)))
                .thenAnswer(i -> i.getArgument(0));

        User result =
                service.updatePreferences(id, req);

        assertEquals("dark", result.getTheme());
        assertEquals("en", result.getLanguage());
    }

    @Test
    void shouldThrowWhenUserNotFoundForPreferences() {

        UUID id = UUID.randomUUID();

        when(repo.findById(id))
                .thenReturn(Optional.empty());

        assertThrows(
                RuntimeException.class,
                () -> service.updatePreferences(
                        id,
                        new UpdatePreferencesRequest()
                )
        );
    }
}

