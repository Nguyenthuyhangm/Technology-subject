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

import java.util.*;

@Service
@RequiredArgsConstructor
public class ProductSearchService {

    private final ProductRepository productRepository;
    private final ProductSearchRepository searchRepository;
    private final ProductListingRepository listingRepository;
    private final ProductDocumentMapper documentMapper;

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
    @Transactional
    public List<ProductSearchDTO> search(String keyword) {

        // 1. Search Elasticsearch
        List<ProductDocument> docs =
                searchRepository.search(keyword);

        System.out.println("===== ELASTICSEARCH RESULT =====");

        for (ProductDocument d : docs) {

            System.out.println(
                    "id=" + d.getId()
                            + ", name=" + d.getName()
                            + ", brand=" + d.getBrandName()
                            + ", category=" + d.getCategoryName()
                            + ", bestPrice=" + d.getBestPrice()
            );
        }

        if (docs.isEmpty()) {

            System.out.println("KHONG TIM THAY DOCUMENT");

            return List.of();
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

        System.out.println(
                "TOTAL RESULT: " + result.size()
        );

        return result;
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
}