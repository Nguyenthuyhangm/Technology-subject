package com.pricehawl.dto;

import lombok.Data;

@Data
public class UpdatePreferencesRequest {
    private String theme;
    private String language;
}