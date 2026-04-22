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

    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword) {
        // Giữ signature cũ để không làm vỡ caller/test hiện tại
        return search(keyword, null, "all", "all");
    }

    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword, List<String> platforms) {
        // Giữ overload cũ để không làm vỡ caller/test hiện tại
        return search(keyword, platforms, "all", "all");
    }

    /**
     * Search + filter động theo platform + category + promo.
     *
     * @param keyword    keyword fuzzy search
     * @param platforms  danh sách platform name muốn lọc
     * @param categoryId category slug/id từ controller truyền xuống; "all" => bỏ qua
     * @param promo      "all" | "sale" | "flash_sale"
     */
    @Transactional(readOnly = true)
    public List<ProductSearchDTO> search(String keyword,
                                         List<String> platforms,
                                         String categoryId,
                                         String promo) {
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
                        ProductSearchDTO dto = mapRowToDto(r, productMap, latestPriceByListing);
                        if (dto == null) return null;

                        Product product = productMap.get(dto.getId());
                        if (!matchesCategory(product, categoryId)) return null;
                        if (!matchesPromo(product, promo)) return null;

                        return applyPlatformFilter(dto, platformFilter);
                    } catch (Exception ex) {
                        log.warn("Bỏ qua row search lỗi: {}", ex.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Lọc danh sách platforms của một DTO theo filter đã chuẩn hoá.
     * @return DTO mới với list đã lọc; null nếu filter không rỗng nhưng không còn
     *         platform nào khớp.
     */
    private static ProductSearchDTO applyPlatformFilter(
            ProductSearchDTO dto,
            Set<String> platformFilter) {
        if (dto == null) return null;

        if (platformFilter == null || platformFilter.isEmpty()) {
            return dto;
        }

        List<PlatformDTO> src = dto.getPlatforms();
        if (src == null || src.isEmpty()) {
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
     * Trả về null khi không có filter hợp lệ.
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

    private static boolean matchesCategory(Product product, String categoryId) {
        if (categoryId == null || categoryId.isBlank() || "all".equalsIgnoreCase(categoryId)) {
            return true;
        }
        if (product == null || product.getCategory() == null) {
            return false;
        }

        String input = categoryId.trim();
        String slug = product.getCategory().getSlug();

        if (slug != null && input.equalsIgnoreCase(slug)) {
            return true;
        }

        Integer catId = product.getCategory().getId();
        return catId != null && input.equals(String.valueOf(catId));
    }

    private static boolean matchesPromo(Product product, String promo) {
        if (promo == null || promo.isBlank() || "all".equalsIgnoreCase(promo)) {
            return true;
        }
        if (product == null || product.getListings() == null || product.getListings().isEmpty()) {
            return false;
        }

        return product.getListings().stream()
                .filter(Objects::nonNull)
                .anyMatch(l -> {
                    String label = l.getPromotionLabel();
                    if (label == null) return false;

                    String normalized = label.toLowerCase(Locale.ROOT);
                    if ("sale".equalsIgnoreCase(promo)) {
                        return normalized.contains("sale");
                    }
                    if ("flash_sale".equalsIgnoreCase(promo)) {
                        return normalized.contains("flash");
                    }
                    return true;
                });
    }

    /**
     * Gom toàn bộ listing id từ các product đã load, gọi 1 query batch để lấy
     * PriceRecord mới nhất của mỗi listing. Trả về Map<listingId, record>.
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

            return latest.stream()
                    .filter(pr -> pr != null
                            && pr.getProductListing() != null
                            && pr.getProductListing().getId() != null)
                    .collect(Collectors.toMap(
                            pr -> pr.getProductListing().getId(),
                            pr -> pr,
                            (a, b) -> a
                    ));
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

    private static String resolveImageUrl(Product product) {
        if (product == null) return null;

        String url = product.getImageUrl();
        if (url != null && !url.isEmpty()) return url;

        List<ProductListing> listings = product.getListings();
        if (listings != null && !listings.isEmpty()) {
            ProductListing first = listings.get(0);
            if (first != null
                    && first.getPlatformImageUrl() != null
                    && !first.getPlatformImageUrl().isEmpty()) {
                return first.getPlatformImageUrl();
            }
        }

        return null;
    }

    /**
     * Map listings -> danh sách PlatformDTO. Luôn trả về list, không null.
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

                    PriceRecord latest = latestPriceByListing == null
                            ? null
                            : latestPriceByListing.get(l.getId());
                    p.setFinalPrice(toDoublePrice(latest));
                    p.setIsOfficial(Boolean.TRUE);

                    return p;
                })
                .toList();
    }

    private static double toDoublePrice(PriceRecord pr) {
        if (pr == null || pr.getPrice() == null) return 0.0;
        return pr.getPrice().doubleValue();
    }

    private static ProductSearchDTO mapRowToDto(
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
                mapPlatforms(product, latestPriceByListing)
        );
    }
}