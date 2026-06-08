package com.pricehawl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "skin_advice_template")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkinAdviceTemplate {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "signature_hash", nullable = false, unique = true, length = 128)
    private String signatureHash;

    @Column(name = "skin_type")
    private String skinType;

    @Column(name = "sensitivity_level")
    private String sensitivityLevel;

    @Column(name = "acne_level")
    private String acneLevel;

    @Column(name = "main_concerns", columnDefinition = "TEXT")
    private String mainConcerns;

    @Column(name = "skin_goals", columnDefinition = "TEXT")
    private String skinGoals;

    @Column(name = "allergies", columnDefinition = "TEXT")
    private String allergies;

    @Column(name = "current_products", columnDefinition = "TEXT")
    private String currentProducts;

    @Column(name = "budget_min")
    private Integer budgetMin;

    @Column(name = "budget_max")
    private Integer budgetMax;

    @Column(name = "skin_overview", columnDefinition = "TEXT")
    private String skinOverview;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "morning_routine", columnDefinition = "TEXT")
    private String morningRoutine;

    @Column(name = "night_routine", columnDefinition = "TEXT")
    private String nightRoutine;

    @Column(name = "recommended_products", columnDefinition = "TEXT")
    private String recommendedProducts;

    @Column(name = "recommended_product_ids", columnDefinition = "TEXT")
    private String recommendedProductIds;

    @Column(name = "routine_products_json", columnDefinition = "TEXT")
    private String routineProductsJson;

    @Column(name = "avoid_notes", columnDefinition = "TEXT")
    private String avoidNotes;

    @Column(name = "warning_notes", columnDefinition = "TEXT")
    private String warningNotes;

    @Column(name = "hydration_score")
    private Integer hydrationScore;

    @Column(name = "barrier_score")
    private Integer barrierScore;

    @Column(name = "sensitivity_score")
    private Integer sensitivityScore;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}