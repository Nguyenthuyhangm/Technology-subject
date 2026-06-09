package com.pricehawl.service;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.mapper.ProductDocumentMapper;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.document.Document;
import org.springframework.data.elasticsearch.core.mapping.IndexCoordinates;
import org.springframework.data.elasticsearch.core.query.UpdateQuery;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import lombok.extern.slf4j.Slf4j;
import java.util.*;

@Slf4j
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
        log.info("SYNCED DOCS = {}", docs.size());
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
        log.info("SEARCH FROM ELASTIC | keyword={}", keyword);
        List<ProductDocument> docs = searchRepository.search(keyword);

        if (docs.isEmpty()) {
            log.warn("KHONG TIM THAY DOCUMENT | keyword={}", keyword);
            return List.of();
        }

        return docs.stream()
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

    // =========================
    // 🔄 4. SYNC 1 PRODUCT
    // =========================
    @Transactional
    public void syncOne(Product product) {
        ProductDocument doc = documentMapper.toDocument(product);
        searchRepository.save(doc);
    }

    // =========================
    // ⚡ 5. PARTIAL UPDATE BEST PRICE
    // =========================
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

    // =========================
    // 🔄 6. INDEX BY ID
    // =========================
// =========================
// 🔄 6. INDEX BY ID
// =========================
@Transactional
public void indexProductById(UUID productId) {
    List<Product> products = productRepository.findAllByIdIn(List.of(productId));
    if (products.isEmpty()) {
        log.warn("indexProductById: not found | productId={}", productId);
        return;
    }
    Product product = products.get(0);

    // Load listings riêng để tránh lazy load
    List<ProductListing> listings = listingRepository.findByProductId(productId);

    // Build document
    ProductDocument doc = documentMapper.toDocument(product);

    // Override bestPrice bằng listings thực tế
    if (listings != null && !listings.isEmpty()) {
        listings.stream()
            .filter(l -> l.getCurrentPrice() != null)
            .min(Comparator.comparing(ProductListing::getCurrentPrice))
            .ifPresent(best -> {
                doc.setBestPrice(best.getCurrentPrice());
                doc.setOriginalPrice(best.getOriginalPrice());
                doc.setBestPlatform(best.getPlatformName());
                doc.setInStock(best.getInStock());
            });
    }

    searchRepository.save(doc);
    clearSearchCache();
    log.info("Indexed | productId={} | bestPrice={} | bestPlatform={}",
        productId, doc.getBestPrice(), doc.getBestPlatform());
}
}