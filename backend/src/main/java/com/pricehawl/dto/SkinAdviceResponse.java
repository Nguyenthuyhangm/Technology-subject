package com.pricehawl.dto;

import java.util.List;
import java.util.UUID;

public record SkinAdviceResponse(
        UUID reportId,
        UUID templateId,
        boolean cached,
        String summary,
        String morningRoutine,
        String nightRoutine,
        String recommendedProducts,
        String warningNotes,
        List<SkinRoutineStepProductDTO> morningProducts,
        List<SkinRoutineStepProductDTO> nightProducts
) {
}