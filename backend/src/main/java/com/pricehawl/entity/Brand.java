package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "brand")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 200, unique = true)
    private String name;

    @Column(nullable = false, length = 200, unique = true)
    private String slug;

    @Column(length = 10)
    private String countryOfOrigin;
}
