package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.repository.ProductRepository;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    public List<ProductSearchDTO> search(String keyword) {

        if (keyword == null || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }

        keyword = keyword.trim();

        List<Object[]> rows = repository.fuzzySearchRaw(keyword);

        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        // 🔥 B1: lấy list id
        List<UUID> ids = rows.stream()
                .map(r -> (UUID) r[0])
                .toList();

        // 🔥 B2: load full product + listings
        List<Product> products = repository.findAllById(ids);

        return rows.stream().map(r -> {

            UUID id = (UUID) r[0];

            // tìm product tương ứng
            Product product = products.stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElse(null);
            String imageUrl = null;
if (product != null) {
    if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
        imageUrl = product.getImageUrl(); // Lấy ảnh gốc nếu có
    } else if (product.getListings() != null && !product.getListings().isEmpty()) {
        imageUrl = product.getListings().get(0).getPlatformImageUrl(); // Không có thì mượn tạm ảnh của link bán đầu tiên
    }
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

            if (product != null && product.getListings() != null) {

                List<PlatformDTO> platforms = product.getListings().stream().map(l -> {
                    PlatformDTO p = new PlatformDTO();

                    p.setPlatform(l.getPlatformName());
                    p.setUrl(l.getUrl());
                    p.setPlatformImageUrl(l.getPlatformImageUrl());

                    // fake tạm
                    p.setFinalPrice(0.0);
                    p.setIsOfficial(true);

                    return p;
                }).toList();

                dto.setPlatforms(platforms);
            }

            return dto;

        }).toList();
    }
}