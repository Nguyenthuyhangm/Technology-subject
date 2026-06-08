package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "message_read")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageRead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "message_id", nullable = false)
    private Long messageId;

    @Column(name = "reader_id", nullable = false)
    private UUID readerId;

    @Column(name = "read_at", nullable = false)
    @Builder.Default
    private LocalDateTime readAt = LocalDateTime.now();
}
