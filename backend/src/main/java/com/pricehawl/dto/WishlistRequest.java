package com.pricehawl.dto;

import java.util.UUID;
import lombok.Data; // Import cái này

@Data // Tự sinh getter, setter, constructor
public class WishlistRequest {
    private UUID userId;
    private UUID productId;
}