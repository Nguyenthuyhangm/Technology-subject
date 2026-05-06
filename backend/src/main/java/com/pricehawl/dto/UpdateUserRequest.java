package com.pricehawl.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String name;
    private String phone;
}