package com.pricehawl.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SameBrandProductDTO {

    private UUID id;

    private String name;

    private String imageUrl;

    private String categoryName;

    private String brandName;
}