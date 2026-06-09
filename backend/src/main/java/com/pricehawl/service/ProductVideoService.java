package com.pricehawl.service;

import com.pricehawl.dto.ProductVideoDTO;
import com.pricehawl.dto.ProductVideoDetailDTO;
import com.pricehawl.dto.ProductVideoSummaryDTO;
import com.pricehawl.dto.VideoWithProductDTO;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductVideo;
import com.pricehawl.entity.ProductVideoMapping;
import com.pricehawl.repository.ProductVideoMappingRepository;
import com.pricehawl.repository.ProductVideoRepository;
import com.pricehawl.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductVideoService {

    private final ProductVideoRepository videoRepository;
    private final ProductVideoMappingRepository mappingRepository;
    private final ProductRepository productRepository;

    public List<ProductVideoDTO> getAllVideos() {
        return videoRepository.findAllOrderByCreatedAtDesc().stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public Page<ProductVideoDTO> getVideosPaginated(int page, int size, String search) {
        Page<ProductVideo> videoPage;
        if (search != null && !search.isBlank()) {
            videoPage = videoRepository.findByTitleContainingIgnoreCase(search, Pageable.ofSize(size).withPage(page));
        } else {
            videoPage = videoRepository.findAllOrderByCreatedAtDesc(Pageable.ofSize(size).withPage(page));
        }
        return videoPage.map(this::toDTO);
    }

    public long getTotalProductCount() {
        return mappingRepository.count();
    }

    public List<ProductVideoDTO> getVideosByProductId(UUID productId) {
        return videoRepository.findByProductId(productId).stream()
            .map(this::toDTO)
            .collect(Collectors.toList());
    }

    public List<ProductVideoSummaryDTO> getVideoSummaryByProduct() {
        List<Object[]> results = videoRepository.findVideoSummaryByProduct();
        return results.stream()
            .map(row -> new ProductVideoSummaryDTO(
                (UUID) row[0],
                (String) row[1],
                ((Number) row[2]).intValue(),
                row[3] != null ? ((Timestamp) row[3]).toLocalDateTime() : null
            ))
            .collect(Collectors.toList());
    }

    public List<ProductVideoSummaryDTO> getVideoSummaryByProduct(int page, int size) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<Object[]> results = videoRepository.findVideoSummaryByProduct(pageable);
        return results.getContent().stream()
            .map(row -> new ProductVideoSummaryDTO(
                (UUID) row[0],
                (String) row[1],
                ((Number) row[2]).intValue(),
                row[3] != null ? ((Timestamp) row[3]).toLocalDateTime() : null
            ))
            .collect(Collectors.toList());
    }

    public List<ProductVideoSummaryDTO> getVideoSummaryByProduct(int page, int size, String search) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<Object[]> results;
        if (search != null && !search.isBlank()) {
            results = videoRepository.findVideoSummaryByProductWithSearch(search, pageable);
        } else {
            results = videoRepository.findVideoSummaryByProduct(pageable);
        }
        return results.getContent().stream()
            .map(row -> new ProductVideoSummaryDTO(
                (UUID) row[0],
                (String) row[1],
                ((Number) row[2]).intValue(),
                row[3] != null ? ((Timestamp) row[3]).toLocalDateTime() : null
            ))
            .collect(Collectors.toList());
    }

    public long countVideoSummaryByProduct() {
        return videoRepository.countVideoSummaryByProduct();
    }

    public long countVideoSummaryByProduct(String search) {
        if (search != null && !search.isBlank()) {
            return videoRepository.countVideoSummaryByProductWithSearch(search);
        }
        return videoRepository.countVideoSummaryByProduct();
    }

    public List<ProductVideoDetailDTO> getVideoDetailsByProductId(UUID productId) {
        List<Object[]> results = videoRepository.findVideoDetailsByProductId(productId);
        return results.stream()
            .map(row -> new ProductVideoDetailDTO(
                (UUID) row[0],
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                row[5] != null ? ((Number) row[5]).intValue() : null,
                row[6] != null ? ((Timestamp) row[6]).toLocalDateTime() : null,
                (String) row[7]
            ))
            .collect(Collectors.toList());
    }

    public List<ProductVideoDetailDTO> getVideoDetailsByProductId(UUID productId, int page, int size) {
        Pageable pageable = Pageable.ofSize(size).withPage(page);
        Page<Object[]> results = videoRepository.findVideoDetailsByProductId(productId, pageable);
        return results.getContent().stream()
            .map(row -> new ProductVideoDetailDTO(
                (UUID) row[0],
                (String) row[1],
                (String) row[2],
                (String) row[3],
                (String) row[4],
                row[5] != null ? ((Number) row[5]).intValue() : null,
                row[6] != null ? ((Timestamp) row[6]).toLocalDateTime() : null,
                (String) row[7]
            ))
            .collect(Collectors.toList());
    }

    public long countVideoDetailsByProductId(UUID productId) {
        return videoRepository.countVideoDetailsByProductId(productId);
    }

    public List<VideoWithProductDTO> getActiveVideos() {
        List<Object[]> results = videoRepository.findActiveVideosWithProduct();
        return results.stream()
            .map(row -> new VideoWithProductDTO(
                (UUID) row[0],
                (UUID) row[1],
                (String) row[2],
                (String) row[3],
                row[4] != null ? ((Number) row[4]).longValue() : 0L,
                (String) row[5],
                (String) row[6],
                (String) row[7],
                (String) row[8]
            ))
            .collect(Collectors.toList());
    }

    @Transactional
    public ProductVideoDTO createVideo(ProductVideoDTO dto) {
        if (dto.productIds() != null && !dto.productIds().isEmpty()) {
            Set<UUID> taken = mappingRepository.findAll().stream()
                .map(ProductVideoMapping::getProductId)
                .collect(Collectors.toSet());
            List<UUID> duplicates = dto.productIds().stream()
                .filter(taken::contains)
                .toList();
            if (!duplicates.isEmpty()) {
                throw new IllegalArgumentException(
                    "Các sản phẩm đã có video: " + duplicates.size() + " sản phẩm. Mỗi sản phẩm chỉ được liên kết với một video.");
            }
        }

        ProductVideo video = ProductVideo.builder()
            .title(dto.title())
            .videoUrl(dto.videoUrl())
            .thumbnailUrl(dto.thumbnailUrl())
            .publicId(dto.publicId())
            .youtubeId(dto.youtubeId())
            .duration(dto.duration())
            .createdBy(dto.createdBy())
            .build();

        ProductVideo savedVideo = videoRepository.save(video);

        if (dto.productIds() != null && !dto.productIds().isEmpty()) {
            for (UUID productId : dto.productIds()) {
                ProductVideoMapping mapping = new ProductVideoMapping(savedVideo, productId);
                mappingRepository.save(mapping);
            }
        }

        log.info("Created video id={} with {} product mappings", savedVideo.getId(),
            dto.productIds() != null ? dto.productIds().size() : 0);
        return toDTO(savedVideo);
    }

    @Transactional
    public void deleteVideo(UUID videoId) {
        ProductVideo video = videoRepository.findById(videoId)
            .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        mappingRepository.deleteByVideoId(videoId);
        videoRepository.delete(video);
        log.info("Deleted video id={}", videoId);
    }

    @Transactional
    public ProductVideoDTO updateVideo(UUID videoId, ProductVideoDTO dto) {
        ProductVideo video = videoRepository.findById(videoId)
            .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        if (dto.title() != null) video.setTitle(dto.title());

        Set<UUID> ownProductIds = mappingRepository.findByVideoId(videoId).stream()
            .map(ProductVideoMapping::getProductId)
            .collect(Collectors.toSet());

        if (dto.productIds() != null && !dto.productIds().isEmpty()) {
            Set<UUID> takenByOthers = mappingRepository.findAll().stream()
                .map(ProductVideoMapping::getProductId)
                .filter(pid -> !ownProductIds.contains(pid))
                .collect(Collectors.toSet());

            List<UUID> duplicates = dto.productIds().stream()
                .filter(takenByOthers::contains)
                .toList();
            if (!duplicates.isEmpty()) {
                throw new IllegalArgumentException(
                    "Các sản phẩm đã có video khác: " + duplicates.size() + " sản phẩm. Mỗi sản phẩm chỉ được liên kết với một video.");
            }

            List<UUID> newProductIds = dto.productIds().stream()
                .filter(pid -> !ownProductIds.contains(pid))
                .toList();

            Set<UUID> toKeep = Set.copyOf(dto.productIds());

            mappingRepository.findByVideoId(videoId).stream()
                .filter(m -> !toKeep.contains(m.getProductId()))
                .forEach(m -> mappingRepository.delete(m));

            for (UUID productId : newProductIds) {
                ProductVideoMapping mapping = new ProductVideoMapping(video, productId);
                mappingRepository.save(mapping);
            }
        } else {
            mappingRepository.deleteByVideoId(videoId);
        }

        video = videoRepository.save(video);
        log.info("Updated video id={}", videoId);
        return toDTO(video);
    }

    private ProductVideoDTO toDTO(ProductVideo video) {
        List<ProductVideoMapping> mappings = mappingRepository.findByVideoId(video.getId());

        List<UUID> productIds = mappings.stream()
            .map(ProductVideoMapping::getProductId)
            .collect(Collectors.toList());

        Map<UUID, String> productNameMap = productIds.isEmpty()
            ? Map.of()
            : productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Product::getName));

        List<String> productNames = productIds.stream()
            .map(productNameMap::get)
            .filter(Objects::nonNull)
            .toList();

        String status = (video.getVideoUrl() != null && !video.getVideoUrl().isBlank()) ? "active" : "error";

        return new ProductVideoDTO(
            video.getId(),
            video.getTitle(),
            video.getVideoUrl(),
            video.getThumbnailUrl(),
            video.getPublicId(),
            video.getYoutubeId(),
            video.getDuration(),
            video.getCreatedAt(),
            video.getCreatedBy(),
            productIds,
            productNames,
            productIds.size(),
            status
        );
    }
}
