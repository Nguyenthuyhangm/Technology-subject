package com.pricehawl.service;

import com.pricehawl.dto.PriceComparisonItemResponse;
import com.pricehawl.dto.PriceComparisonResponse;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.ArrayList;
@Service
@RequiredArgsConstructor
public class PriceComparisonServiceImpl implements PriceComparisonService {

    private final ProductRepository productRepository;
    private final ProductListingRepository productListingRepository;
    private final PriceRecordRepository priceRecordRepository;

    @Override
    public PriceComparisonResponse compareByProductId(UUID productId) {

        // 1. Tìm product
        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Product not found with id: " + productId));

        // 2. Lấy danh sách listing theo productId
        List<ProductListing> listings = productListingRepository.findByProductId(productId)
    .stream()
    .filter(l -> !"hidden".equals(l.getStatus()))
    .collect(Collectors.toList());


        // 3. Batch load giá mới nhất cho tất cả listings trong 1 query (tránh N+1)
        List<UUID> listingIds = listings.stream().map(ProductListing::getId).toList();
        Map<UUID, PriceRecord> latestPriceMap = priceRecordRepository
                .findLatestByProductListingIdIn(listingIds)
                .stream()
                .collect(Collectors.toMap(
                        r -> r.getProductListing().getId(),
                        r -> r,
                        (a, b) -> a  // giữ record đầu tiên nếu trùng
                ));

        List<PriceComparisonItemResponse> comparisons = listings.stream()
                .map(listing -> {
                    PriceRecord latestPrice = latestPriceMap.get(listing.getId());

                    // Nếu listing chưa có giá thì bỏ qua
                    if (latestPrice == null) {
                        return null;
                    }

                    return PriceComparisonItemResponse.builder()
                            .platformId(listing.getPlatform().getId())
                            .platformName(listing.getPlatform().getName())
                            .listingId(listing.getId())
                            .url(listing.getUrl())
                            .platformImageUrl(listing.getPlatformImageUrl())
                            .price(latestPrice.getPrice())
                            .originalPrice(latestPrice.getOriginalPrice())
                            .discountPct(latestPrice.getDiscountPct())
                            .inStock(latestPrice.getInStock())
                            .promotionLabel(latestPrice.getPromotionLabel())
                            .isFlashSale(latestPrice.getIsFlashSale())
                            .crawledAt(latestPrice.getCrawledAt())
                            .build();
                })
                .filter(item -> item != null)
                .sorted(Comparator.comparing(PriceComparisonItemResponse::getPrice))
                .collect(Collectors.toList());

       // 4. Tạo danh sách ảnh tổng hợp
List<String> allImages = new ArrayList<>();

// Thêm ảnh gốc của sản phẩm nếu có
if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
    allImages.add(product.getImageUrl());
}

// Thêm tất cả ảnh từ các sàn (listings)
for (PriceComparisonItemResponse item : comparisons) {
    if (item.getPlatformImageUrl() != null && !item.getPlatformImageUrl().isEmpty()) {
        allImages.add(item.getPlatformImageUrl());
    }
}

// 5. Trả về response
return PriceComparisonResponse.builder()
        .productId(product.getId())
        .productName(product.getName())
        .imageUrls(allImages) // Truyền danh sách ảnh vào đây
        .comparisons(comparisons)
        .build();
    }
}