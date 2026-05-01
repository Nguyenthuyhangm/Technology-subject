package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "platform")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Platform {

    @Id
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String baseUrl;

    @Column(length = 500)
    private String logoUrl;

    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}