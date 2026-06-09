package com.pricehawl.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SimilarityService {

    private final IngredientWeightService weightService;

    public double calculateScore(
            List<String> sourceIngredients,
            List<String> targetIngredients) {

        if (sourceIngredients == null
                || sourceIngredients.isEmpty()
                || targetIngredients == null
                || targetIngredients.isEmpty()) {
            return 0;
        }

        double totalPossibleScore = 0;
        double matchedScore = 0;

        for (int sourceIndex = 0;
             sourceIndex < sourceIngredients.size();
             sourceIndex++) {

            String ingredient =
                    sourceIngredients.get(sourceIndex);

            int weight =
                    weightService.getWeight(ingredient);

            double sourceMultiplier =
                    getPositionMultiplierA(sourceIndex);

            // Điểm tối đa nếu ingredient này cũng nằm top đầu bên B
            totalPossibleScore +=
                    weight * sourceMultiplier;

            int targetIndex =
                    targetIngredients.indexOf(ingredient);

            if (targetIndex == -1) {
                continue;
            }

            double targetMultiplier =
                    getPositionMultiplierB(targetIndex);

            matchedScore +=
                    weight
                            * sourceMultiplier
                            * targetMultiplier;
        }

        if (totalPossibleScore == 0) {
            return 0;
        }

        double similarity =
                (matchedScore / totalPossibleScore) * 100;

        return Math.round(similarity * 100.0) / 100.0;
    }

    /**
     * Hệ số vị trí của Product A
     */
    private double getPositionMultiplierA(int position) {

        if (position < 5) {
            return 3.0;
        }

        if (position < 10) {
            return 2.0;
        }

        return 1.0;
    }

    /**
     * Hệ số vị trí của Product B
     */
    private double getPositionMultiplierB(int position) {

        if (position < 5) {
            return 1.0;
        }

        if (position < 10) {
            return 0.8;
        }

        if (position < 20) {
            return 0.5;
        }

        return 0.2;
    }
}