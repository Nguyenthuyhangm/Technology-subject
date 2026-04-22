package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.repository.ProductRepository;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.Objects; // Bổ sung import này để dùng Objects.nonNull

@Service
public class ProductService {

    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    // 🔥 SỬA: Thêm tham số categoryId vào hàm
    public List<ProductSearchDTO> search(String keyword, String categoryId) {

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
        // SỬA LỖI JAVA: Đổi tên thành rawProducts để tránh lỗi Lambda
        List<Product> rawProducts = repository.findAllById(ids); 
        
        // Khai báo một biến final để Java cho phép dùng bên trong vòng lặp
        final List<Product> finalProducts;

        // 🔥 MỚI THÊM: Lọc danh sách products theo danh mục nếu người dùng có chọn
        if (categoryId != null && !categoryId.equals("all") && !categoryId.trim().isEmpty()) {
            finalProducts = rawProducts.stream()
                    .filter(p -> p.getCategory() != null && categoryId.equals(p.getCategory().getSlug()))
                    .toList();
        } else {
            finalProducts = rawProducts;
        }

        return rows.stream().map(r -> {

            UUID id = (UUID) r[0];

            // tìm product tương ứng
            // SỬA LỖI JAVA: Dùng finalProducts ở đây
            Product product = finalProducts.stream() 
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElse(null);

            // 🔥 MỚI THÊM: Nếu product bị null (do bị lọc bỏ vì không đúng danh mục), thì bỏ qua row này
            if (product == null) {
                return null;
            }

            String imageUrl = null;
            if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
                imageUrl = product.getImageUrl(); // Lấy ảnh gốc nếu có
            } else if (product.getListings() != null && !product.getListings().isEmpty()) {
                imageUrl = product.getListings().get(0).getPlatformImageUrl(); // Không có thì mượn tạm ảnh của link bán đầu tiên
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

                    // fake tạm
                    p.setFinalPrice(0.0);
                    p.setIsOfficial(true);

                    return p;
                }).toList();

                dto.setPlatforms(platforms);
            }

            return dto;

        })
        .filter(Objects::nonNull) // 🔥 MỚI THÊM: Lọc bỏ các phần tử null khỏi danh sách kết quả cuối cùng
        .toList();
    }
}