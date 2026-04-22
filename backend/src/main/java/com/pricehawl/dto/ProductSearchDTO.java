package com.pricehawl.dto;

import lombok.*;

import java.util.UUID;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ProductSearchDTO {

    private UUID id;
    private String name;
    private String description;
    private String categoryName;
    private String brandName;
    private Double score;
    private String imageUrl;
    private List<PlatformDTO> platforms;
}