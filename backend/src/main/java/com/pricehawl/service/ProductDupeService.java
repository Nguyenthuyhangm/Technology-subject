package com.pricehawl.service;

import com.pricehawl.entity.Product;
import com.pricehawl.dto.ProductDupeDTO;
import com.pricehawl.entity.ProductDupe;
import com.pricehawl.repository.ProductDupeRepository;
import com.pricehawl.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.pricehawl.dto.ProductSearchDTO;
import java.util.Map;
import java.util.Comparator;
import java.util.stream.Collectors;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductDupeService {

    private static final double MIN_SCORE = 40.0;

    private final ProductRepository productRepository;
    private final ProductDupeRepository productDupeRepository;
    private final SimilarityService similarityService;
    private final ProductSearchService productSearchService;

    @Transactional
    public void buildDupesForProduct(UUID productId) {

        Product sourceProduct =
                productRepository.findById(productId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Product not found: " + productId
                                ));

        List<String> sourceIngredients =
                sourceProduct.getIngredients();

        if (sourceIngredients == null
                || sourceIngredients.isEmpty()) {
            return;
        }

        productDupeRepository.deleteByProductId(productId);

        List<Product> candidates =
                productRepository.findByCategoryId(sourceProduct.getCategory().getId());

        for (Product targetProduct : candidates) {

            if (targetProduct.getId()
                    .equals(sourceProduct.getId())) {
                continue;
            }

            List<String> targetIngredients =
                    targetProduct.getIngredients();

            if (targetIngredients == null
                    || targetIngredients.isEmpty()) {
                continue;
            }

            double score =
                    similarityService.calculateScore(
                            sourceIngredients,
                            targetIngredients
                    );

            if (score < MIN_SCORE) {
                continue;
            }

            ProductDupe dupe =
                    ProductDupe.builder()
                            .productId(sourceProduct.getId())
                            .dupeProductId(targetProduct.getId())
                            .score(score)
                            .build();

            productDupeRepository.save(dupe);
        }
    }
    @Transactional
    public void buildAllDupes() {

        productDupeRepository.deleteAllInBatch();

        List<Product> products =
                productRepository.findAll();

        for (Product product : products) {

            buildDupesForProduct(
                    product.getId()
            );
        }
    }
    public List<ProductDupeDTO> getDupes(UUID productId) {

        List<ProductDupe> dupes =
                productDupeRepository
                        .findByProductIdOrderByScoreDesc(productId);
        System.out.println(
                dupes.stream()
                        .map(ProductDupe::getDupeProductId)
                        .toList()
        );

        if (dupes.isEmpty()) {
            return List.of();
        }

        Map<UUID, Double> scoreMap =
                dupes.stream()
                        .collect(Collectors.toMap(
                                ProductDupe::getDupeProductId,
                                ProductDupe::getScore
                        ));

        List<UUID> ids =
                dupes.stream()
                        .map(ProductDupe::getDupeProductId)
                        .toList();

        List<ProductSearchDTO> products =
                productSearchService.findByIds(ids);

        return products.stream()
                .map(product -> ProductDupeDTO.builder()
                        .productId(product.getId())
                        .name(product.getName())
                        .imageUrl(product.getImageUrl())
                        .brandName(product.getBrandName())
                        .categoryName(product.getCategoryName())
                        .lowestPrice(product.getBestPrice().longValue())
                        .score(scoreMap.get(product.getId()))
                        .build())
                .sorted(
                        Comparator.comparing(
                                ProductDupeDTO::getScore
                        ).reversed()
                )
                .toList();
    }
}