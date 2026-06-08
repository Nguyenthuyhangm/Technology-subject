package com.pricehawl.service;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.mapper.ProductDocumentMapper;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductSearchRepository;
import com.pricehawl.util.VietnameseNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.document.Document;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.UpdateQuery;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;

import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductSearchService {

    private final ProductRepository productRepository;
    private final ProductSearchRepository searchRepository;
    private final ProductListingRepository listingRepository;
    private final ProductDocumentMapper documentMapper;
    private final ElasticsearchOperations elasticsearchOperations;

    // =========================
    // 🔄 1. SYNC DB → ELASTICSEARCH
    // =========================
    @Transactional
    public void syncAll() {

        searchRepository.deleteAll();
        List<ProductDocument> docs = productRepository.findAll()
                .stream()
                .map(documentMapper::toDocument)
                .toList();

        searchRepository.saveAll(docs);

        System.out.println("SYNCED DOCS = " + docs.size());
    }

    // =========================
    // 🔍 2. SEARCH (🔥 BEST PRICE)
    // =========================
    @Cacheable(
            value = "product-search",
            key = "#keyword.toLowerCase()",
            unless =
                    "#result == null || " +
                            "#result.isEmpty() || " +
                            "#keyword.length() < 2"
    )
    @Transactional
    public List<ProductSearchDTO> search(String keyword) {

        // 1. Search Elasticsearch
        System.out.println("SEARCH FROM ELASTIC");
        List<ProductDocument> docs =
                searchRepository.search(keyword);

        if (docs.isEmpty()) {
            System.out.println("KHONG TIM THAY DOCUMENT - goi fallback");
            return searchFallback(keyword);
        }

        // 2. Map DTO trực tiếp từ ES document
        List<ProductSearchDTO> result = docs.stream()

                .map(doc -> ProductSearchDTO.builder()

                        .id(UUID.fromString(doc.getId()))

                        .name(doc.getName())

                        .brandName(doc.getBrandName())

                        .categoryName(doc.getCategoryName())

                        .imageUrl(doc.getImageUrl())

                        .bestPrice(doc.getBestPrice())

                        .originalPrice(doc.getOriginalPrice())

                        .discountPct(doc.getDiscountPct())

                        .bestPlatform(doc.getBestPlatform())

                        .score(doc.getScore())

                        .build())

                .toList();


        return result;
    }
    @CacheEvict(
            value = "product-search",
            allEntries = true
    )
    public void clearSearchCache() {
    }
    // =========================
    // 🛟 3. FALLBACK (nếu ES lỗi)
    // =========================
    @Transactional
    public List<ProductSearchDTO> searchFallback(String keyword) {

        List<Product> products = productRepository
                .findByNameContainingIgnoreCase(keyword);

        if (!products.isEmpty()) {
            return products.stream()
                    .map(p -> ProductSearchDTO.builder()
                            .id(p.getId())
                            .name(p.getName())
                            .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                            .brandName(p.getBrand() != null ? p.getBrand().getName() : null)
                            .imageUrl(p.getImageUrl())
                            .build())
                    .toList();
        }

        String normalizedKeyword = VietnameseNormalizer.normalize(keyword);
        List<Product> allProducts = productRepository.findAll();
        return allProducts.stream()
                .filter(p -> VietnameseNormalizer.normalize(p.getName()).contains(normalizedKeyword))
                .map(p -> ProductSearchDTO.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                        .brandName(p.getBrand() != null ? p.getBrand().getName() : null)
                        .imageUrl(p.getImageUrl())
                        .build())
                .toList();
    }

    // =========================
    // 🔄 4. SYNC 1 PRODUCT
    // =========================
    @Transactional
    public void syncOne(Product product) {
        ProductDocument doc = documentMapper.toDocument(product);
        searchRepository.save(doc);
    }
    @Transactional
    public void updateBestPriceOnly(
            UUID productId,
            Integer bestPrice,
            String bestPlatform
    ) {
        Document partialDoc = Document.create();

        if (bestPrice != null) {
            partialDoc.put("bestPrice", bestPrice);
        }

        if (bestPlatform != null) {
            partialDoc.put("bestPlatform", bestPlatform);
        }

        if (partialDoc.isEmpty()) {
            return;
        }

        UpdateQuery query = UpdateQuery
                .builder(productId.toString())
                .withDocument(partialDoc)
                .build();

        elasticsearchOperations.update(
                query,
                IndexCoordinates.of("products")
        );
        clearSearchCache();
    }
}