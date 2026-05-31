package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonItemResponse;
import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PriceComparisonServiceImpl implements PriceComparisonService {

    private final ProductRepository productRepository;
    private final ProductListingRepository productListingRepository;

    @Override
    public PriceComparisonResponse compareByProductId(UUID productId) {

        // 1. Tìm product bằng ID
        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Product not found with id: " + productId));

        // 2. Lấy danh sách listing kèm Platform (Sử dụng JOIN FETCH đã sửa ở Repository)
        List<ProductListing> listings = productListingRepository.findByProductIdWithPlatform(productId);

        if (listings.isEmpty()) {
            return PriceComparisonResponse.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .imageUrls(product.getImageUrl() != null && !product.getImageUrl().isEmpty() 
                            ? List.of(product.getImageUrl()) : List.of())
                    .comparisons(List.of())
                    .build();
        }

        // 3. Khởi tạo danh sách ảnh tổng hợp
        List<String> allImages = new ArrayList<>();
        if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
            allImages.add(product.getImageUrl());
        }

        // 4. Map dữ liệu (Ép kiểu rõ ràng <PriceComparisonItemResponse> để fix lỗi compile)
        List<PriceComparisonItemResponse> comparisons = listings.stream()
                .<PriceComparisonItemResponse>map(listing -> {
                    // Nếu listing chưa được crawl giá thì bỏ qua
                    if (listing.getCurrentPrice() == null) {
                        return null;
                    }

                    // Gom ảnh của sàn vào list tổng
                    if (listing.getPlatformImageUrl() != null && !listing.getPlatformImageUrl().isEmpty()) {
                        allImages.add(listing.getPlatformImageUrl());
                    }

                    // Build DTO trực tiếp từ thực thể Listing
                    return PriceComparisonItemResponse.builder()
                            .platformId(listing.getPlatform().getId())
                            .platformName(listing.getPlatform().getName())
                            .listingId(listing.getId())
                            .url(listing.getUrl())
                            .platformImageUrl(listing.getPlatformImageUrl())
                            .price(listing.getCurrentPrice())
                            .originalPrice(listing.getOriginalPrice())
                            .discountPct(listing.getDiscountPct() != null ? listing.getDiscountPct().floatValue() : null)
                            .inStock(listing.getInStock())
                            .promotionLabel(listing.getPromotionLabel())
                            .isFlashSale(listing.getIsFlashSale())
                            .crawledAt(listing.getCrawlTime())
                            .build();
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(PriceComparisonItemResponse::getPrice))
                .collect(Collectors.toList());

        // 5. Trả về response hoàn chỉnh với danh sách ảnh không trùng lặp
        return PriceComparisonResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .imageUrls(allImages.stream().distinct().collect(Collectors.toList()))
                .comparisons(comparisons)
                .build();
    }
}