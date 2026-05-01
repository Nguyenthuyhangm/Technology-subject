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
    public void syncAll() {
        List<ProductDocument> docs = productRepository.findAll()
                .stream()
                .map(documentMapper::toDocument)
                .toList();

        searchRepository.saveAll(docs);
    }

    // =========================
    // 🔍 2. SEARCH (🔥 BEST PRICE)
    // =========================
    public List<ProductSearchDTO> search(String keyword) {

        // 🔹 1. search từ Elasticsearch
        List<ProductDocument> docs = searchRepository.search(keyword);

        if (docs.isEmpty()) return List.of();

        // 🔹 2. lấy danh sách id
        List<UUID> ids = docs.stream()
                .map(d -> UUID.fromString(d.getId()))
                .toList();

        // 🔹 3. lấy tất cả listing (1 query duy nhất)
        List<ProductListing> listings = listingRepository.findByProductIds(ids);

        // 🔹 4. tìm best price
        Map<UUID, ProductListing> bestMap = new HashMap<>();

        for (ProductListing pl : listings) {
            UUID pid = pl.getProduct().getId();

            if (!bestMap.containsKey(pid) ||
                    pl.getFinalPrice() < bestMap.get(pid).getFinalPrice()) {

                bestMap.put(pid, pl);
            }
        }

        // 🔹 5. map sang DTO
        return docs.stream().map(doc -> {

            UUID id = UUID.fromString(doc.getId());
            ProductListing best = bestMap.get(id);

            Integer bestPrice = null;
            Integer originalPrice = null;
            Integer discountPct = null;
            String bestPlatform = null;

            if (best != null) {
                bestPrice = best.getFinalPrice();
                originalPrice = best.getOriginalPrice();
                bestPlatform = best.getPlatform().getName();

                if (originalPrice != null && originalPrice > bestPrice) {
                    discountPct = (int) Math.round(
                            ((originalPrice - bestPrice) / originalPrice) * 100
                    );
                }
            }

            return ProductSearchDTO.builder()
                    .id(id)
                    .name(doc.getName())
                    .brandName(doc.getBrandName())
                    .categoryName(doc.getCategoryName())
                    .imageUrl(doc.getImageUrl())

                    .bestPrice(bestPrice)
                    .originalPrice(originalPrice)
                    .discountPct(discountPct)
                    .bestPlatform(bestPlatform)

                    .score(null)
                    .build();

        }).toList();
    }

    // =========================
    // 🛟 3. FALLBACK (nếu ES lỗi)
    // =========================
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
    public void syncOne(Product product) {
        ProductDocument doc = documentMapper.toDocument(product);
        searchRepository.save(doc);
    }
}