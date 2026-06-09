package com.pricehawl.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;

@Service
public class IngredientWeightService {

    private static final int DEFAULT_WEIGHT = 1;

    private Map<String, Integer> weights;

    @PostConstruct
    public void init() throws IOException {

        ObjectMapper mapper = new ObjectMapper();

        InputStream input =
                getClass()
                        .getClassLoader()
                        .getResourceAsStream(
                                "ingredient.json");

        if (input == null) {
            throw new RuntimeException(
                    "ingredient-weight.json not found");
        }

        weights = mapper.readValue(
                input,
                new TypeReference<Map<String, Integer>>() {}
        );
    }

    public int getWeight(String ingredient) {

        if (ingredient == null) {
            return DEFAULT_WEIGHT;
        }

        return weights.getOrDefault(
                ingredient.toLowerCase(),
                DEFAULT_WEIGHT
        );
    }

    public boolean isActiveIngredient(
            String ingredient) {

        return getWeight(ingredient) >= 7;
    }

    public Map<String, Integer> getWeights() {
        return weights;
    }
}