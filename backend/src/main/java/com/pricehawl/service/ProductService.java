package com.pricehawl.service;

import com.pricehawl.dto.PlatformDTO;
import com.pricehawl.dto.ProductSearchDTO;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;


@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository repository;
    private final PriceRecordRepository priceRecordRepository;

    public ProductService(ProductRepository repository,
                          PriceRecordRepository priceRecordRepository) {
        this.repository = repository;
        this.priceRecordRepository = priceRecordRepository;
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

    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword) {
        // Giữ signature cũ → các caller/test hiện tại không cần đổi.
        // Delegate sang overload có filter platform = null (không filter).
        return search(keyword, null);
    }

    /**
     * Search + filter động theo platform.
     *
     * @param keyword     keyword fuzzy search
     * @param platforms   danh sách platform name muốn lọc (ví dụ ["Hasaki","Cocolux"]).
     *                    Null/empty → không filter platform, hành vi như search(keyword).
     *
     * Cách xây dựng dynamic filter platform:
     *  - Không đổi native query fuzzySearchRaw (để không tác động đến ranking/score).
     *  - Sau khi đã có danh sách products kèm listings, filter PlatformDTO theo
     *    `platform name` (case-insensitive) ở tầng service. Product không còn
     *    platform nào khớp → loại khỏi kết quả.
     *
     * Cách xử lý multiple platforms:
     *  - Chuẩn hoá sang lowercase Set để O(1) contains và không phụ thuộc thứ tự.
     *  - Null phần tử / chuỗi rỗng được bỏ qua → tránh filter toàn bộ về rỗng do
     *    FE gửi "platform=" rỗng.
     *
     * Cách xử lý platform null (không filter):
     *  - `platformFilter == null || isEmpty` → return early mà không touch
     *    danh sách PlatformDTO gốc.
     */
    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword, List<String> platforms) {
        if (keyword == null || keyword.trim().length() < 2) {
            return Collections.emptyList();
        }
        final String kw = keyword.trim();
        final Set<String> platformFilter = normalizePlatformFilter(platforms);

        List<Object[]> rows;
        try {
            rows = repository.fuzzySearchRaw(kw);
        } catch (Exception ex) {
            log.error("fuzzySearchRaw failed for keyword='{}': {}", kw, ex.getMessage(), ex);
            return Collections.emptyList();
        }
        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> ids = rows.stream()
                .map(ProductService::safeExtractId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, Product> productById = new HashMap<>();
        if (!ids.isEmpty()) {
            try {
                List<Product> products = repository.findAllByIdIn(ids);
                if (products != null) {
                    for (Product p : products) {
                        if (p != null && p.getId() != null) {
                            productById.put(p.getId(), p);
                        }
                    }
                }
            } catch (Exception ex) {
                log.warn("findAllByIdIn failed, tiếp tục với map rỗng: {}", ex.getMessage());
            }
        }

        final Map<UUID, PriceRecord> latestPriceByListing =
                fetchLatestPrices(productById.values());

        final Map<UUID, Product> productMap = productById;
        return rows.stream()
                .map(r -> {
                    try {
                        return mapRowToDto(r, productMap, latestPriceByListing);
                    } catch (Exception ex) {
                        log.warn("Bỏ qua row search lỗi: {}", ex.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                // Áp filter platform sau khi đã map xong. Nếu platformFilter
                // null → applyPlatformFilter trả về DTO không đổi.
                .map(dto -> applyPlatformFilter(dto, platformFilter))
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Lọc danh sách platforms của một DTO theo filter đã chuẩn hoá.
     * @return DTO mới với list đã lọc; null nếu filter không rỗng nhưng không còn
     *         platform nào khớp (caller loại bỏ khỏi kết quả).
     */
    private static ProductSearchDTO applyPlatformFilter(
            ProductSearchDTO dto,
            Set<String> platformFilter) {
        if (dto == null) return null;
        if (platformFilter == null || platformFilter.isEmpty()) {
            // Không filter → trả thẳng DTO gốc để tránh copy không cần thiết.
            return dto;
        }
        List<PlatformDTO> src = dto.getPlatforms();
        if (src == null || src.isEmpty()) {
            // Không có platform nào mà filter yêu cầu ít nhất 1 → loại.
            return null;
        }
        List<PlatformDTO> filtered = new ArrayList<>(src.size());
        for (PlatformDTO p : src) {
            if (p == null || p.getPlatform() == null) continue;
            String n = p.getPlatform().trim().toLowerCase(Locale.ROOT);
            if (platformFilter.contains(n)) {
                filtered.add(p);
            }
        }
        if (filtered.isEmpty()) {
            return null;
        }
        dto.setPlatforms(filtered);
        return dto;
    }

    /**
     * Chuẩn hoá list platform query param: trim + lowercase + bỏ rỗng + dedup.
     * Trả về null khi không có filter hợp lệ (→ service bỏ qua filter).
     */
    private static Set<String> normalizePlatformFilter(List<String> raw) {
        if (raw == null || raw.isEmpty()) return null;
        Set<String> out = new LinkedHashSet<>();
        for (String s : raw) {
            if (s == null) continue;
            String n = s.trim();
            if (n.isEmpty()) continue;
            out.add(n.toLowerCase(Locale.ROOT));
        }
        return out.isEmpty() ? null : out;
    }

    /**
     * Gom toàn bộ listing id từ các product đã load, gọi 1 query batch để lấy
     * PriceRecord mới nhất của mỗi listing. Trả về Map&lt;listingId, record&gt;.
     * Có lỗi DB → trả Map rỗng (finalPrice sẽ fallback 0.0, không 500).
     */
    private Map<UUID, PriceRecord> fetchLatestPrices(Collection<Product> products) {
        if (products == null || products.isEmpty()) {
            return Collections.emptyMap();
        }

        List<UUID> listingIds = products.stream()
                .filter(Objects::nonNull)
                .flatMap(p -> p.getListings() == null
                        ? Stream.<ProductListing>empty()
                        : p.getListings().stream())
                .filter(Objects::nonNull)
                .map(ProductListing::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (listingIds.isEmpty()) {
            return Collections.emptyMap();
        }

        try {
            List<PriceRecord> latest =
                    priceRecordRepository.findLatestByProductListingIdIn(listingIds);
            if (latest == null || latest.isEmpty()) {
                return Collections.emptyMap();
            }

            // Trong tình huống hiếm gặp có nhiều record cùng crawledAt trên
            // cùng listing, giữ lại 1 (merger: a → a).
            return latest.stream()
                    .filter(pr -> pr != null
                            && pr.getProductListing() != null
                            && pr.getProductListing().getId() != null)
                    .collect(Collectors.toMap(
                            pr -> pr.getProductListing().getId(),
                            pr -> pr,
                            (a, b) -> a));
        } catch (Exception ex) {
            log.warn("findLatestByProductListingIdIn failed, giá sẽ fallback 0: {}",
                    ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private static UUID safeExtractId(Object[] r) {
        if (r == null || r.length == 0 || r[0] == null) return null;
        Object v = r[0];
        if (v instanceof UUID u) return u;
        try {
            return UUID.fromString(v.toString());
        } catch (Exception ex) {
            return null;
        }
    }

    private static String safeStr(Object[] r, int idx) {
        if (r == null || idx < 0 || idx >= r.length || r[idx] == null) return null;
        return r[idx].toString();
    }

    private static double safeScore(Object[] r, int idx) {
        if (r == null || idx < 0 || idx >= r.length || r[idx] == null) return 0.0;
        Object v = r[idx];
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(v.toString());
        } catch (Exception ex) {
            return 0.0;
        }
    }

    /**
     * Chọn ảnh đại diện cho product theo thứ tự ưu tiên:
     * 1. imageUrl của product nếu hợp lệ (không null, không corrupt)
     * 2. platformImageUrl từ listing, ưu tiên Tiki → Guardian → khác → Hasaki
     *    (Hasaki ưu tiên thấp nhất vì hay có URL corrupt dạng data:image/gif)
     */
    private String resolveImageUrl(Product product) {
        if (product == null) return null;

        if (isValidImageUrl(product.getImageUrl())) {
            return product.getImageUrl();
        }

        List<ProductListing> listings = product.getListings();
        if (listings == null || listings.isEmpty()) return null;

        return listings.stream()
                .filter(l -> l != null && isValidImageUrl(l.getPlatformImageUrl()))
                .min(Comparator.comparingInt(
                        l -> platformImagePriority(l.getPlatformName())
                ))
                .map(ProductListing::getPlatformImageUrl)
                .orElse(null);
    }

    /**
     * Map listings → danh sách PlatformDTO. LUÔN trả về List (có thể rỗng,
     * không bao giờ null). Điền finalPrice từ map giá mới nhất đã batch-fetch;
     * listing không có giá (finalPrice = 0) bị loại khỏi kết quả.
     */
    private static List<PlatformDTO> mapPlatforms(
            Product product,
            Map<UUID, PriceRecord> latestPriceByListing) {
        if (product == null || product.getListings() == null || product.getListings().isEmpty()) {
            return Collections.emptyList();
        }
        return product.getListings().stream()
                .filter(Objects::nonNull)
                .map(l -> {
                    PlatformDTO p = new PlatformDTO();
                    p.setPlatform(l.getPlatformName());
                    p.setUrl(l.getUrl());
                    p.setPlatformImageUrl(l.getPlatformImageUrl());
                    p.setIsOfficial(Boolean.TRUE);

                    PriceRecord latest = latestPriceByListing == null
                            ? null
                            : latestPriceByListing.get(l.getId());
                    p.setFinalPrice(toDoublePrice(latest));

                    return p;
                })
                // Bỏ qua listing không có giá (theo quyết định HEAD)
                .filter(p -> p.getFinalPrice() != null && p.getFinalPrice() > 0)
                .toList();
    }

    /** Lấy giá double an toàn từ PriceRecord (null → 0.0). */
    private static double toDoublePrice(PriceRecord pr) {
        if (pr == null || pr.getPrice() == null) return 0.0;
        return pr.getPrice().doubleValue();
    }

    private ProductSearchDTO mapRowToDto(
            Object[] r,
            Map<UUID, Product> productMap,
            Map<UUID, PriceRecord> latestPriceByListing) {
        UUID id = safeExtractId(r);
        if (id == null) return null;

        Product product = productMap.get(id);

        return new ProductSearchDTO(
                id,
                safeStr(r, 1),        // name
                safeStr(r, 2),        // description
                safeStr(r, 3),        // categoryName
                safeStr(r, 4),        // brandName
                safeScore(r, 5),      // score
                resolveImageUrl(product),
                mapPlatforms(product, latestPriceByListing) // luôn non-null
        );
    }
}