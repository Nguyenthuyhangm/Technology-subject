package com.pricehawl.service;

import com.pricehawl.dto.CreatePriceAlertRequest;
import com.pricehawl.dto.PriceAlertResponse;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.entity.User;
import com.pricehawl.exception.ResourceNotFoundException;
import com.pricehawl.repository.PlatformRepository;
import com.pricehawl.repository.PriceAlertRepository;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class PriceAlertServiceImpl implements PriceAlertService {

    private final PriceAlertRepository priceAlertRepository;
    private final ProductRepository productRepository;
    private final ProductListingRepository productListingRepository;
    private final PriceRecordRepository priceRecordRepository;
    private final PlatformRepository platformRepository;
    private final UserRepository userRepository;

    @Override
    public PriceAlertResponse createAlert(CreatePriceAlertRequest request) {
        validateCreateRequest(request);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + request.getProductId()));

        Platform platform = null;
        if (request.getPlatformId() != null) {
            platform = platformRepository.findById(request.getPlatformId())
                    .orElseThrow(() -> new ResourceNotFoundException("Platform not found with id: " + request.getPlatformId()));
        }

        Integer platformIdForCheck = request.getPlatformId();

        boolean exists = priceAlertRepository.existsActiveDuplicate(
                request.getUserId(),
                request.getProductId(),
                platformIdForCheck,
                request.getTargetPrice()
        );

        if (exists) {
            throw new IllegalArgumentException("An active alert with the same product, platform, and target price already exists.");
        }

        PriceAlert alert = PriceAlert.builder()
                .user(user)
                .product(product)
                .platform(platform)
                .targetPrice(request.getTargetPrice())
                .isActive(true)
                .notifiedAt(null)
                .build();

        PriceAlert saved = priceAlertRepository.save(alert);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PriceAlertResponse> getAlertsByUser(UUID userId) {
        // đảm bảo user tồn tại
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return priceAlertRepository.findByUserIdWithDetails(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public PriceAlertResponse toggleAlert(UUID alertId) {
        PriceAlert alert = priceAlertRepository.findByIdWithDetails(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Price alert not found with id: " + alertId));

        alert.setIsActive(!alert.getIsActive());

        // khi bật lại alert, reset notifiedAt để có thể trigger lại
        if (Boolean.TRUE.equals(alert.getIsActive())) {
            alert.setNotifiedAt(null);
        }

        PriceAlert saved = priceAlertRepository.save(alert);
        return toResponse(saved);
    }

    @Override
    public void deleteAlert(UUID alertId) {
        PriceAlert alert = priceAlertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Price alert not found with id: " + alertId));

        priceAlertRepository.delete(alert);
    }

    @Override
    public void checkAlertsForProduct(UUID productId) {
        List<PriceAlert> alerts = priceAlertRepository.findActiveByProductIdWithDetails(productId);

        if (alerts.isEmpty()) {
            return;
        }

        List<ProductListing> listings = productListingRepository.findByProductId(productId);

        for (PriceAlert alert : alerts) {
            Integer bestMatchedPrice = null;

            for (ProductListing listing : listings) {
                if (alert.getPlatform() != null &&
                        !listing.getPlatform().getId().equals(alert.getPlatform().getId())) {
                    continue;
                }

                PriceRecord latest = priceRecordRepository
                        .findTopByProductListingIdOrderByCrawledAtDesc(listing.getId())
                        .orElse(null);

                if (latest == null || !Boolean.TRUE.equals(latest.getInStock())) {
                    continue;
                }

                if (bestMatchedPrice == null || latest.getPrice() < bestMatchedPrice) {
                    bestMatchedPrice = latest.getPrice();
                }
            }

            if (bestMatchedPrice == null) {
                continue;
            }

            if (bestMatchedPrice <= alert.getTargetPrice()) {
                // MVP: chỉ đánh dấu đã notify, chưa gửi mail/push
                if (alert.getNotifiedAt() == null) {
                    alert.setNotifiedAt(LocalDateTime.now());
                    priceAlertRepository.save(alert);
                }
            }
        }
    }

    @Override
    public void checkAllActiveAlerts() {
        List<UUID> productIds = priceAlertRepository.findDistinctActiveProductIds();
        for (UUID productId : productIds) {
            checkAlertsForProduct(productId);
        }
    }

    private void validateCreateRequest(CreatePriceAlertRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("userId must not be null");
        }
        if (request.getProductId() == null) {
            throw new IllegalArgumentException("productId must not be null");
        }
        if (request.getTargetPrice() == null || request.getTargetPrice() <= 0) {
            throw new IllegalArgumentException("targetPrice must be greater than 0");
        }
    }

    private PriceAlertResponse toResponse(PriceAlert alert) {
        Integer currentPrice = getCurrentPrice(alert.getProduct().getId(),
                alert.getPlatform() != null ? alert.getPlatform().getId() : null);

        return PriceAlertResponse.builder()
                .id(alert.getId())
                .userId(alert.getUser().getId())
                .productId(alert.getProduct().getId())
                .productName(alert.getProduct().getName())
                .imageUrl(alert.getProduct().getImageUrl())
                .platformId(alert.getPlatform() != null ? alert.getPlatform().getId() : null)
                .platformName(alert.getPlatform() != null ? alert.getPlatform().getName() : null)
                .targetPrice(alert.getTargetPrice())
                .currentPrice(currentPrice)
                .isActive(alert.getIsActive())
                .notifiedAt(alert.getNotifiedAt())
                .createdAt(alert.getCreatedAt())
                .build();
    }

    private Integer getCurrentPrice(UUID productId, Integer platformId) {
        List<ProductListing> listings = productListingRepository.findByProductId(productId);

        return listings.stream()
                .filter(listing -> platformId == null || listing.getPlatform().getId().equals(platformId))
                .map(listing -> priceRecordRepository.findTopByProductListingIdOrderByCrawledAtDesc(listing.getId()).orElse(null))
                .filter(record -> record != null && Boolean.TRUE.equals(record.getInStock()))
                .map(PriceRecord::getPrice)
                .min(Comparator.naturalOrder())
                .orElse(null);
    }
}