package com.pricehawl.service;

import com.pricehawl.entity.*;
import com.pricehawl.repository.*;
import com.pricehawl.service.model.SearchResultItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Import danh sách sản phẩm đã match vào DB.
 * Tạo: Product + ProductListing (mỗi sàn 1 listing) + PriceRecord (1 record/listing).
 *
 * INPUT:  String productName              — tên đại diện sản phẩm
 *         List<SearchResultItem> matched  — danh sách sản phẩm đã match từ các sàn
 *
 * OUTPUT: UUID productId                  — ID sản phẩm vừa tạo hoặc đã có trong DB
 *
 * LOGIC DEDUP:
 * - Kiểm tra Brand theo slug (unique constraint) → nếu đã có thì dùng lại
 * - Kiểm tra Product theo name (unique constraint) → nếu đã có thì dùng lại
 * - Kiểm tra ProductListing theo url (unique constraint) → nếu đã có thì chỉ update giá
 * - Toàn bộ trong 1 transaction để atomic
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnDemandImportService {

    private final ProductRepository         productRepository;
    private final ProductListingRepository  listingRepository;
    private final PriceRecordRepository     priceRecordRepository;
    private final BrandRepository           brandRepository;
    private final CategoryRepository        categoryRepository;
    private final PlatformRepository        platformRepository;
    private final TransactionTemplate       transactionTemplate;

    private static final Pattern DIACRITIC_PATTERN =
        Pattern.compile("\\p{InCombiningDiacriticalMarks}+");

    // ================================================================
    // PUBLIC ENTRY POINT
    // ================================================================

    public UUID importToDb(String productName, List<SearchResultItem> matched) {
        return transactionTemplate.execute(status -> {
            try {
                // 1. Upsert Brand
                Brand brand = upsertBrand(extractBrand(matched));

                // 2. Find or create Category
                Category category = findCategory(productName);

                // 3. Find or create Product
                Product product = upsertProduct(productName, brand, category, matched);

                // 4. Upsert ProductListing + PriceRecord cho từng sàn
                for (SearchResultItem item : matched) {
                    upsertListingAndPriceRecord(product, item);
                }

                log.info("Import complete | productId={} | name='{}' | listings={}",
                    product.getId(), productName, matched.size());

                return product.getId();

            } catch (Exception e) {
                status.setRollbackOnly();
                throw new RuntimeException("Import failed for '" + productName + "': " + e.getMessage(), e);
            }
        });
    }

    // ================================================================
    // UPSERT BRAND
    // ================================================================

    /**
     * Tìm brand theo slug trước (slug là unique constraint thực sự trong DB).
     * Nếu không có → tìm theo name (case-insensitive).
     * Nếu vẫn không có → tạo mới.
     *
     * Lý do dùng slug làm key: brand name có thể có nhiều cách viết
     * ("BIODERMA" vs "Bioderma") nhưng slug luôn chuẩn hóa về "bioderma".
     */
    private Brand upsertBrand(String brandName) {
        if (brandName == null || brandName.isBlank()) {
            brandName = "Unknown";
        }

        final String slug = makeSlug(brandName);

        // 1. Tìm theo slug trước — tránh duplicate key
        Optional<Brand> bySlug = brandRepository.findBySlug(slug);
        if (bySlug.isPresent()) {
            log.debug("Brand found by slug | slug={}", slug);
            return bySlug.get();
        }

        // 2. Tìm theo name (case-insensitive) — phòng trường hợp slug chưa được index
        Optional<Brand> byName = brandRepository.findByNameIgnoreCase(brandName);
        if (byName.isPresent()) {
            log.debug("Brand found by name | name={}", brandName);
            return byName.get();
        }

        // 3. Tạo mới
        Brand brand = Brand.builder()
            .name(brandName)
            .slug(slug)
            .build();

        Brand saved = brandRepository.save(brand);
        log.info("Brand created | name={} | slug={}", brandName, slug);
        return saved;
    }

    // ================================================================
    // FIND CATEGORY
    // ================================================================

    private Category findCategory(String productName) {
        String nameLower = removeDiacritics(productName.toLowerCase());

        String[][] rules = {
            {"Nước tẩy trang",    "tay trang,micellar,cleansing water"},
            {"Sữa rửa mặt",       "rua mat,cleanser,foaming wash,facial wash"},
            {"Toner",             "toner,nuoc hoa hong"},
            {"Serum",             "serum,tinh chat,ampoule,essence"},
            {"Kem chống nắng",    "chong nang,sunscreen,sunblock,spf,uv milk,uv essence"},
            {"Kem dưỡng",         "kem duong,moisturizer,cream,balm,gel duong"},
            {"Sản phẩm trị mụn",  "tri mun,kem mun,blemish"},
            {"Mặt nạ",            "mat na,mask,sheet mask"},
            {"Dầu gội",           "dau goi,shampoo"},
            {"Dưỡng thể",         "duong the,body lotion,body cream"},
        };

        for (String[] rule : rules) {
            String categoryName = rule[0];
            String[] keywords   = rule[1].split(",");
            for (String kw : keywords) {
                if (nameLower.contains(kw.trim())) {
                    Optional<Category> cat = categoryRepository.findByName(categoryName);
                    if (cat.isPresent()) return cat.get();
                    break;
                }
            }
        }

        return categoryRepository.findByName("Chăm sóc da")
            .orElseGet(() -> categoryRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException(
                    "Không tìm thấy category nào trong DB. " +
                    "Kiểm tra bảng category có dữ liệu chưa.")));
    }

    // ================================================================
    // UPSERT PRODUCT
    // ================================================================

    private Product upsertProduct(
            String productName,
            Brand brand,
            Category category,
            List<SearchResultItem> matched) {

        // Exact match trước — tránh tạo duplicate do tên gần giống
        Optional<Product> exactMatch = productRepository.findByNameIgnoreCase(productName);
        if (exactMatch.isPresent()) {
            log.info("Product exact match, reusing | id={} | name='{}'",
                exactMatch.get().getId(), productName);
            return exactMatch.get();
        }

        // Fallback containing — phòng trường hợp tên có thêm ký tự nhỏ
        List<Product> existing = productRepository.findByNameContainingIgnoreCase(productName);
        if (!existing.isEmpty()) {
            log.info("Product fuzzy match, reusing | id={} | name='{}'",
                existing.get(0).getId(), productName);
            return existing.get(0);
        }

        String imageUrl = matched.stream()
            .map(SearchResultItem::getImageUrl)
            .filter(img -> img != null && !img.isBlank())
            .findFirst()
            .orElse(null);

        Product product = Product.builder()
            .name(productName)
            .brand(brand)
            .category(category)
            .imageUrl(imageUrl)
            .popularityScore(0)
            .build();

        return productRepository.save(product);
    }

    // ================================================================
    // UPSERT LISTING + PRICE RECORD
    // ================================================================

    private void upsertListingAndPriceRecord(Product product, SearchResultItem item) {
        Optional<ProductListing> existingListing =
            listingRepository.findByUrl(item.getUrl());

        ProductListing listing;

        if (existingListing.isPresent()) {
            listing = existingListing.get();

            // GUARD: URL này thuộc product khác → không overwrite
            if (!listing.getProduct().getId().equals(product.getId())) {
                log.warn("URL belongs to different product, skipping | url={} | existing={} | new={}",
                    item.getUrl(), listing.getProduct().getId(), product.getId());
                return;
            }

            // Chỉ update giá nếu có giá mới và khác giá cũ
            if (item.getPrice() != null &&
                !item.getPrice().equals(listing.getCurrentPrice())) {
                listing.setCurrentPrice(item.getPrice());
                listing.setOriginalPrice(item.getOriginalPrice());
                listing.setCrawlTime(LocalDateTime.now());
                listingRepository.save(listing);
                log.debug("Listing price updated | url={} | price={}",
                    item.getUrl(), item.getPrice());
            }
        } else {
            Platform platform = platformRepository
                .findByNameIgnoreCase(capitalizePlatform(item.getPlatform()))
                .orElseGet(() -> {
                    log.warn("Platform not found: {}, using first available", item.getPlatform());
                    return platformRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new RuntimeException("No platform in DB"));
                });

            listing = ProductListing.builder()
                .product(product)
                .platform(platform)
                .platformName(capitalizePlatform(item.getPlatform()))
                .url(item.getUrl())
                .platformImageUrl(item.getImageUrl())
                .currentPrice(item.getPrice())
                .originalPrice(item.getOriginalPrice())
                .inStock(true)
                .status("active")
                .trustScore(0.50)
                .isPinned(false)
                .isFakePromo(false)
                .crawlTime(LocalDateTime.now())
                .build();

            listing = listingRepository.save(listing);
            log.debug("New listing created | platform={} | url={} | price={}",
                item.getPlatform(), item.getUrl(), item.getPrice());
        }

        if (item.getPrice() != null) {
            PriceRecord record = PriceRecord.builder()
                .productListing(listing)
                .price(item.getPrice())
                .originalPrice(item.getOriginalPrice())
                .inStock(true)
                .crawledAt(LocalDateTime.now())
                .build();
            priceRecordRepository.save(record);
        }
    }

    // ================================================================
    // HELPERS
    // ================================================================

    private String extractBrand(List<SearchResultItem> matched) {
        return matched.stream()
            .map(SearchResultItem::getBrand)
            .filter(b -> b != null && !b.isBlank())
            .findFirst()
            .orElse(null);
    }

    private String makeSlug(String text) {
        if (text == null) return "unknown";
        String s = removeDiacritics(text.toLowerCase());
        s = s.replaceAll("[^a-z0-9\\s-]", "");
        s = s.replaceAll("\\s+", "-").trim();
        return s;
    }

    private String removeDiacritics(String text) {
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        return DIACRITIC_PATTERN.matcher(normalized).replaceAll("");
    }

    private String capitalizePlatform(String platform) {
        if (platform == null || platform.isBlank()) return platform;
        return platform.substring(0, 1).toUpperCase() + platform.substring(1).toLowerCase();
    }
}