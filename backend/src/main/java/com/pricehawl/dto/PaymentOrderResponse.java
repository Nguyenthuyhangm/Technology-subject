package com.pricehawl.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class PaymentOrderResponse {
    private UUID id;
    private UUID userId;
    private String userEmail;
    private String plan;
    private String method;
    private Integer amount;
    private String transferCode;
    private String status;
    private String proofImage;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private LocalDateTime confirmedAt;
}
