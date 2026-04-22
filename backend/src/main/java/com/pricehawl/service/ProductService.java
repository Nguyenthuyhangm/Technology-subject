package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.repository.ProductRepository;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.Objects;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<ProductSearchDTO> search(String keyword, String categorySlug, String promo) {

        if (keyword == null || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }

        keyword = keyword.trim();

        List<Object[]> rows = repository.fuzzySearchRaw(keyword);

        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> ids = rows.stream()
                .map(r -> (UUID) r[0])
                .toList();

        List<Product> rawProducts = repository.findAllById(ids); 
        
        final List<Product> finalProducts;

        // LOGIC LỌC TỔNG HỢP: Category + Promo
        finalProducts = rawProducts.stream()
                .filter(p -> {
                    // 1. Lọc theo Category Slug
                    boolean matchCat = (categorySlug == null || categorySlug.equals("all") || 
                                       (p.getCategory() != null && categorySlug.equals(p.getCategory().getSlug())));
                    
                    // 2. Lọc theo Promo
                    boolean matchPromo = true;
                    if (promo != null && !promo.equals("all")) {
                        // Thêm p.getListings() != null để chống sập server (NullPointerException)
                        matchPromo = p.getListings() != null && p.getListings().stream().anyMatch(l -> {
                            // String label = l.getPriceRecords() != null && !l.getPriceRecords().isEmpty() ? l.getPriceRecords().get(0).getPromotionLabel() : null;
                            
                            // Tạm thời để gọi phương thức trực tiếp 
                            String label = l.getPromotionLabel(); 
                            
                            if (label == null) return false;
                            
                            if (promo.equals("sale")) return label.toLowerCase().contains("sale");
                            if (promo.equals("flash_sale")) return label.toLowerCase().contains("flash");
                            return true;
                        });
                    }
                    
                    return matchCat && matchPromo;
                })
                .toList();

        return rows.stream().map(r -> {

            UUID id = (UUID) r[0];

            Product product = finalProducts.stream() 
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElse(null);

            if (product == null) {
                return null;
            }

            String imageUrl = null;
            if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
                imageUrl = product.getImageUrl(); 
            } else if (product.getListings() != null && !product.getListings().isEmpty()) {
                imageUrl = product.getListings().get(0).getPlatformImageUrl(); 
            }

            ProductSearchDTO dto = new ProductSearchDTO(
                    (UUID) r[0],
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    r[5] != null ? ((Number) r[5]).doubleValue() : 0.0,
                    imageUrl,
                    null
            );

            if (product.getListings() != null) {

                List<PlatformDTO> platforms = product.getListings().stream().map(l -> {
                    PlatformDTO p = new PlatformDTO();

                    p.setPlatform(l.getPlatformName());
                    p.setUrl(l.getUrl());
                    p.setPlatformImageUrl(l.getPlatformImageUrl());

                    p.setFinalPrice(0.0); 
                    p.setIsOfficial(true);

                    return p;
                }).toList();

                dto.setPlatforms(platforms);
            }

            return dto;

        })
        .filter(Objects::nonNull) 
        .toList();
    }
}