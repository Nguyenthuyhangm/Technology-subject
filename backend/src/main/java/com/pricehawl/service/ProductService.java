package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.ProductRepository;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    /**
     * Kiểm tra URL ảnh có hợp lệ không.
     * Lọc bỏ: null, rỗng, URL corrupt dạng "hasaki.vndata:image/gif;base64,..."
     */
    private boolean isValidImageUrl(String url) {
        return url != null
                && !url.isBlank()
                && url.startsWith("http")
                && !url.contains("data:image/gif");
    }

    /**
     * Thứ tự ưu tiên platform khi chọn ảnh:
     * Tiki (0) → Guardian (1) → khác (2) → Hasaki (3)
     * Hasaki ưu tiên thấp nhất vì hay có ảnh corrupt
     */
    private int platformImagePriority(String platformName) {
        if (platformName == null) return 2;
        String lower = platformName.toLowerCase();
        if (lower.contains("tiki"))     return 0;
        if (lower.contains("guardian")) return 1;
        if (lower.contains("hasaki"))   return 3;
        return 2;
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

        // B1: lấy list id
        List<UUID> ids = rows.stream()
                .map(r -> (UUID) r[0])
                .toList();

        // B2: load full product + listings (dùng findAllByIdIn có @EntityGraph
        //     để listings được fetch cùng lúc, tránh lazy loading không load được ảnh)
        List<Product> products = repository.findAllByIdIn(ids);

        return rows.stream().map(r -> {

            UUID id = (UUID) r[0];

            // Tìm product tương ứng
            Product product = products.stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElse(null);

            // Chọn ảnh đại diện theo thứ tự ưu tiên:
            // 1. imageUrl của product nếu hợp lệ
            // 2. platformImageUrl từ listing, ưu tiên Tiki → Guardian → khác → Hasaki
            //    (Hasaki ưu tiên thấp nhất vì hay có URL corrupt dạng data:image/gif)
            String imageUrl = null;
            if (product != null) {
                if (isValidImageUrl(product.getImageUrl())) {
                    imageUrl = product.getImageUrl();
                } else if (product.getListings() != null) {
                    imageUrl = product.getListings().stream()
                            .filter(l -> isValidImageUrl(l.getPlatformImageUrl()))
                            .min(Comparator.comparingInt(
                                    l -> platformImagePriority(l.getPlatformName())
                            ))
                            .map(ProductListing::getPlatformImageUrl)
                            .orElse(null);
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
                    p.setIsOfficial(true);

                    // Lấy price_record mới nhất (crawledAt lớn nhất)
                    Double finalPrice = 0.0;
                    if (l.getPriceRecords() != null && !l.getPriceRecords().isEmpty()) {
                        PriceRecord latest = l.getPriceRecords()
                                .stream()
                                .filter(pr -> pr.getPrice() != null)
                                .max(Comparator.comparing(PriceRecord::getCrawledAt))
                                .orElse(null);

                        if (latest != null) {
                            finalPrice = latest.getPrice().doubleValue();
                        }
                    }
                    p.setFinalPrice(finalPrice);

                    return p;
                })
                // Bỏ qua listing không có giá
                .filter(p -> p.getFinalPrice() != null && p.getFinalPrice() > 0)
                .toList();

                dto.setPlatforms(platforms);
            }

            return dto;

        }).toList();
    }
}