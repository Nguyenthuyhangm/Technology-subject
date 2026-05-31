package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private UUID id;

    @Column(nullable = false, length = 255, unique = true)
    private String email;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String plan = "free";

    @Column(length = 20)
    private String phone;

    @Column(nullable = false, length = 10)
    private String theme = "system"; // light | dark | system

    @Column(nullable = false, length = 5)
    private String language = "vi";  // vi | en

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
    @JsonProperty("premium_expires_at")
    private LocalDateTime premiumExpiresAt;
}