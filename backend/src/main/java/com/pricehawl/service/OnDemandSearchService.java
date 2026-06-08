package com.pricehawl.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.service.model.SearchResultItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Search sản phẩm trên 5 sàn song song, mỗi sàn lấy 10 kết quả rồi match.
 *
 * Strategy:
 *   - Tiki     : API JSON trực tiếp → lấy 10 → match  (giữ nguyên)
 *   - Hasaki   : Serper API (site:hasaki.vn)    → match → crawl chi tiết lấy ảnh + giá gốc
 *   - Guardian : Serper API (site:guardian.com.vn) → match → crawl chi tiết
 *   - Cocolux  : Serper API (site:cocolux.com)  → match → crawl chi tiết
 *   - Watsons  : Serper API (site:watsons.com.vn) → match → crawl chi tiết
 *
 * Crawl chi tiết (sau khi có link từ Serper):
 *   GET link sản phẩm → parse application/ld+json hoặc __NEXT_DATA__
 *   → imageUrl, originalPrice
 *
 * Match algorithm (dùng chung cho tất cả sàn — không đổi):
 *   1. Brand match     +40 (bắt buộc, không match → loại)
 *   2. Tên similarity  0–30 (số từ chung)
 *   3. Volume match    +20 (236ml vs 473ml)
 *   4. Giá hợp lý      +10
 *   Threshold: >= 40 (bắt buộc có brand)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnDemandSearchService {

    private final ObjectMapper objectMapper;

    // ── Serper ──────────────────────────────────────────────────────
    private static final String SERPER_API_KEY = "df21ddc3bf0f6c572627c27b469677018d66186d";
    private static final String SERPER_URL     = "https://google.serper.dev/search";

    // Site scope cho từng sàn
    private static final Map<String, String> PLATFORM_SITE = Map.of(
        "hasaki",   "hasaki.vn",
        "guardian", "guardian.com.vn",
        "cocolux",  "cocolux.com",
        "watsons",  "watsons.com.vn"
    );

    /**
     * Pattern URL trang sản phẩm của từng sàn — dùng để lọc kết quả Serper.
     * Loại bỏ trang danh mục, brand, blog, landing page...
     *
     * Hasaki   : /san-pham/...html
     * Guardian : /<slug>.html  (không chứa /c/ hay /thuong-hieu/)
     * Cocolux  : /san-pham/... hoặc slug trực tiếp có chứa ký tự -
     * Watsons  : /p/...
     */
    private static final Map<String, Pattern> PRODUCT_URL_PATTERN = Map.of(
        "hasaki",   Pattern.compile("hasaki\\.vn/san-pham/[^?#]+\\.html"),
        // Guardian: có .html, không phải /c/ /thuong-hieu/ /blog/ /khuyen-mai/
        "guardian", Pattern.compile("guardian\\.com\\.vn/(?!c/|thuong-hieu/|blog/|khuyen-mai/)[^?#]+\\.html"),
        // Cocolux: slug dạng "ten-san-pham-i.{số}" — đây là pattern chuẩn của Cocolux
        "cocolux",  Pattern.compile("cocolux\\.com/[a-z0-9][a-z0-9-]*-i\\.\\d+"),
        // Watsons: /p/slug
        "watsons",  Pattern.compile("watsons\\.com\\.vn/p/[^?#]+")
    );

    // Regex extract giá từ snippet: "150,000đ" / "150.000 đ" / "150000 VND"
    private static final Pattern PRICE_PATTERN = Pattern.compile(
        "(?:đ|d|VND|vnd)?\\s*(\\d{1,3}(?:[.,]\\d{3})+)\\s*(?:đ|d|VND|vnd)?",
        Pattern.CASE_INSENSITIVE);

    // ── Chung ────────────────────────────────────────────────────────
    private static final Duration TIMEOUT     = Duration.ofSeconds(20);
    private static final int      MAX_RESULTS = 10;
    private static final String   UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    private static final Pattern VOLUME_PATTERN = Pattern.compile(
        "(\\d+(?:\\.\\d+)?)\\s*(ml|g|gr|oz|l)\\b", Pattern.CASE_INSENSITIVE);

    private static final Set<String> STOPWORDS = Set.of(
        "sua", "rua", "mat", "kem", "duong", "chong", "nang", "son",
        "nuoc", "tay", "trang", "dau", "goi", "xa", "na", "serum",
        "toner", "gel", "foam", "lotion", "cream", "wash", "ml", "gr",
        "g", "oz", "mau", "sac", "cho", "da", "thuong", "kho", "nhay",
        "cam", "diu", "nhe", "lam", "sach", "voi", "tinh", "chat",
        "am", "lan", "san", "pham", "the", "body", "face",
        "skin", "care", "pro", "plus", "mini", "set", "gift"
    );

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(TIMEOUT)
        .followRedirects(HttpClient.Redirect.NORMAL)
        .build();

    // ================================================================
    // PUBLIC ENTRY POINT
    // ================================================================

    public Map<String, List<SearchResultItem>> searchAllPlatforms(String searchQuery) {
        Map<String, List<SearchResultItem>> results = new ConcurrentHashMap<>();

        List<CompletableFuture<Void>> futures = List.of(
            CompletableFuture.runAsync(() -> results.put("tiki",
                safeSearch("tiki", searchQuery))),
            CompletableFuture.runAsync(() -> results.put("hasaki",
                safeSearch("hasaki", searchQuery))),
            CompletableFuture.runAsync(() -> results.put("guardian",
                safeSearch("guardian", searchQuery))),
            CompletableFuture.runAsync(() -> results.put("cocolux",
                safeSearch("cocolux", searchQuery))),
            CompletableFuture.runAsync(() -> results.put("watsons",
                safeSearch("watsons", searchQuery)))
        );

        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(25, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            log.warn("Some searches timed out for: {}", searchQuery);
        } catch (Exception e) {
            log.warn("Search futures error: {}", e.getMessage());
        }

        long successCount = results.values().stream()
            .filter(l -> !l.isEmpty()).count();
        log.info("Search complete | query='{}' | matched={}/5 platforms",
            searchQuery, successCount);

        return results;
    }

    // ================================================================
    // SAFE WRAPPER
    // ================================================================

    private List<SearchResultItem> safeSearch(String platform, String query) {
        try {
            List<SearchResultItem> candidates = switch (platform) {
                case "tiki"                              -> fetchTiki(query);
                case "hasaki", "guardian",
                     "cocolux", "watsons"               -> fetchViaSerper(platform, query);
                default -> List.of();
            };

            // Match algorithm chung
            List<SearchResultItem> matched = findBestMatch(query, platform, candidates);

            // Sau khi match xong → crawl chi tiết để lấy ảnh + giá gốc (chỉ 4 sàn Serper)
            if (!matched.isEmpty() && !"tiki".equals(platform)) {
                SearchResultItem best = matched.get(0);
                enrichFromDetailPage(best);
            }

            return matched;
        } catch (Exception e) {
            log.warn("Search failed | platform={} | query='{}' | error={}",
                platform, query, e.getMessage());
            return List.of();
        }
    }

    // ================================================================
    // FETCH — TIKI (giữ nguyên hoàn toàn)
    // ================================================================

    private List<SearchResultItem> fetchTiki(String query) throws Exception {
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String url = "https://tiki.vn/api/v2/products?q=" + encoded
                   + "&limit=" + MAX_RESULTS;

        JsonNode root = fetchJson(url, Map.of(
            "Referer", "https://tiki.vn/search?q=" + encoded));
        if (root == null) return List.of();

        JsonNode data = root.path("data");
        if (!data.isArray() || data.isEmpty()) return List.of();

        List<SearchResultItem> candidates = new ArrayList<>();
        for (JsonNode item : data) {
            String  name      = item.path("name").asText(null);
            String  urlPath   = item.path("url_path").asText(null);
            Integer price     = nullableInt(item.get("price"));
            Integer origPrice = nullableInt(item.get("original_price"));
            String  image     = item.path("thumbnail_url").asText(null);
            String  brand     = item.path("brand_name").asText(null);

            if (name == null || urlPath == null || price == null) continue;

            candidates.add(SearchResultItem.builder()
                .platform("tiki")
                .name(name)
                .url("https://tiki.vn/" + urlPath)
                .price(price)
                .originalPrice(origPrice)
                .imageUrl(image)
                .brand(brand)
                .build());
        }

        log.debug("Tiki fetched {} candidates", candidates.size());
        return candidates;
    }

    // ================================================================
    // FETCH — 4 SÀN QUA SERPER API
    // ================================================================

    /**
     * Gọi Serper với query "site:{platform_domain} {searchQuery}",
     * parse organic results → build SearchResultItem (chưa có ảnh/giá gốc).
     *
     * imageUrl và originalPrice sẽ được enrich sau bởi enrichFromDetailPage().
     */
    private List<SearchResultItem> fetchViaSerper(String platform, String query) throws Exception {
        String site        = PLATFORM_SITE.get(platform);
        String serperQuery = "site:" + site + " " + query;

        String body = objectMapper.writeValueAsString(Map.of(
            "q",   serperQuery,
            "num", MAX_RESULTS,
            "gl",  "vn",
            "hl",  "vi"
        ));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(SERPER_URL))
            .timeout(TIMEOUT)
            .header("Content-Type", "application/json")
            .header("X-API-KEY", SERPER_API_KEY)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> resp = httpClient.send(
            request, HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200) {
            log.warn("Serper HTTP {} | platform={} | query='{}'",
                resp.statusCode(), platform, serperQuery);
            return List.of();
        }

        JsonNode root    = objectMapper.readTree(resp.body());
        JsonNode organic = root.path("organic");

        if (!organic.isArray() || organic.isEmpty()) {
            log.debug("Serper no organic results | platform={}", platform);
            return List.of();
        }

        List<SearchResultItem> candidates = new ArrayList<>();
        for (JsonNode item : organic) {
            String title   = item.path("title").asText(null);
            String link    = item.path("link").asText(null);
            String snippet = item.path("snippet").asText("");

            if (title == null || link == null) continue;
            if (!link.contains(site)) continue;

            // Chỉ lấy link trang sản phẩm, bỏ trang danh mục / brand / blog
            Pattern productPattern = PRODUCT_URL_PATTERN.get(platform);
            if (productPattern != null && !productPattern.matcher(link).find()) {
                log.debug("Skip non-product URL | platform={} | url={}", platform, link);
                continue;
            }

            Integer price = extractPriceFromSnippet(snippet);
            String  brand = extractBrand(normalizeForMatch(title));

            candidates.add(SearchResultItem.builder()
                .platform(platform)
                .name(title)
                .url(link)
                .price(price)
                .originalPrice(null)   // enrich sau
                .imageUrl(null)        // enrich sau
                .brand(brand)
                .build());
        }

        log.debug("Serper fetched {} candidates | platform={}", candidates.size(), platform);
        return candidates;
    }

    // ================================================================
    // ENRICH — crawl trang chi tiết để lấy ảnh + giá gốc
    // ================================================================

    /**
     * Sau khi match xong, crawl trang chi tiết sản phẩm.
     * Ưu tiên parse theo thứ tự:
     *   1. application/ld+json  (chuẩn nhất, dùng chung cho mọi sàn)
     *   2. __NEXT_DATA__        (fallback cho Hasaki / Watsons)
     *   3. og:image meta tag    (fallback cuối cho ảnh)
     *
     * Enrich trực tiếp vào object (mutate), không tạo object mới.
     */
    private void enrichFromDetailPage(SearchResultItem item) {
        try {
            String html = fetchHtml(item.getUrl(), Map.of(
                "Referer", "https://" + PLATFORM_SITE.getOrDefault(item.getPlatform(), "")
            ));
            if (html == null) return;

            // ── 1. Thử ld+json trước ──────────────────────────────────
            if (tryEnrichFromLdJson(html, item)) {
                log.debug("Enriched via ld+json | platform={} | url={}",
                    item.getPlatform(), item.getUrl());
                return;
            }

            // ── 2. Fallback __NEXT_DATA__ ─────────────────────────────
            if (tryEnrichFromNextData(html, item)) {
                log.debug("Enriched via __NEXT_DATA__ | platform={} | url={}",
                    item.getPlatform(), item.getUrl());
                return;
            }

            // ── 3. Fallback og:image cho ảnh ─────────────────────────
            tryEnrichImageFromOgTag(html, item);
            log.debug("Enriched via og:image | platform={} | url={}",
                item.getPlatform(), item.getUrl());

        } catch (Exception e) {
            log.warn("Enrich failed | platform={} | url={} | error={}",
                item.getPlatform(), item.getUrl(), e.getMessage());
        }
    }

    /**
     * Parse <script type="application/ld+json"> — chuẩn Schema.org Product.
     *
     * Cấu trúc mong đợi:
     * {
     *   "@type": "Product",
     *   "image": "https://...",
     *   "offers": {
     *     "@type": "Offer",
     *     "price": 150000,
     *     "highPrice": 200000      ← giá gốc (nếu đang sale)
     *   }
     * }
     *
     * Một số sàn dùng AggregateOffer hoặc mảng offers[].
     * highPrice / listPrice / priceValidUntil đều được thử.
     */
    private boolean tryEnrichFromLdJson(String html, SearchResultItem item) {
        try {
            // Tìm tất cả <script type="application/ld+json"> trong trang
            Pattern ldPattern = Pattern.compile(
                "<script[^>]+type=[\"']application/ld\\+json[\"'][^>]*>([\\s\\S]*?)</script>",
                Pattern.CASE_INSENSITIVE);
            Matcher ldMatcher = ldPattern.matcher(html);

            while (ldMatcher.find()) {
                String jsonText = ldMatcher.group(1).trim();
                JsonNode ld;
                try {
                    ld = objectMapper.readTree(jsonText);
                } catch (Exception e) {
                    continue;
                }

                // Hỗ trợ cả object đơn lẻ và array @graph
                List<JsonNode> nodes = new ArrayList<>();
                if (ld.isArray()) {
                    ld.forEach(nodes::add);
                } else if (ld.has("@graph")) {
                    ld.path("@graph").forEach(nodes::add);
                } else {
                    nodes.add(ld);
                }

                for (JsonNode node : nodes) {
                    String type = node.path("@type").asText("");
                    if (!type.contains("Product")) continue;

                    boolean enriched = false;

                    // ── Ảnh ──
                    if (item.getImageUrl() == null) {
                        String img = extractLdImage(node);
                        if (img != null) {
                            item.setImageUrl(img);
                            enriched = true;
                        }
                    }

                    // ── Giá gốc ──
                    if (item.getOriginalPrice() == null) {
                        Integer origPrice = extractLdOriginalPrice(node);
                        if (origPrice != null) {
                            item.setOriginalPrice(origPrice);
                            enriched = true;
                        }
                    }

                    // ── Giá hiện tại (nếu chưa có từ Serper snippet) ──
                    if (item.getPrice() == null) {
                        Integer price = extractLdPrice(node);
                        if (price != null) {
                            item.setPrice(price);
                            enriched = true;
                        }
                    }

                    if (enriched) return true;
                }
            }
        } catch (Exception e) {
            log.debug("ld+json parse error: {}", e.getMessage());
        }
        return false;
    }

    /** Extract image URL từ ld+json node. Hỗ trợ string, object, array. */
    private String extractLdImage(JsonNode node) {
        JsonNode imgNode = node.path("image");
        if (imgNode.isTextual())  return imgNode.asText();
        if (imgNode.isArray())    return imgNode.path(0).path("url").asText(null);
        if (imgNode.isObject())   return imgNode.path("url").asText(null);
        return null;
    }

    /**
     * Extract giá hiện tại từ offers.price.
     * Dùng để fill price nếu Serper snippet không có giá.
     */
    private Integer extractLdPrice(JsonNode node) {
        JsonNode offers = node.path("offers");
        if (offers.isArray()) offers = offers.path(0);
        if (offers.isMissingNode()) return null;

        JsonNode priceNode = offers.path("price");
        if (!priceNode.isMissingNode()) return toInt(priceNode);
        return null;
    }

    /**
     * Extract giá gốc (trước khi sale) từ offers.
     *
     * Các field thường gặp theo sàn:
     *   - highPrice      (AggregateOffer — Hasaki, Guardian)
     *   - listPrice      (Cocolux)
     *   - priceBeforeSale (Watsons đôi khi dùng)
     *
     * Nếu chỉ có 1 giá (price) → không có sale → originalPrice = price
     */
    private Integer extractLdOriginalPrice(JsonNode node) {
        JsonNode offers = node.path("offers");
        if (offers.isArray()) offers = offers.path(0);
        if (offers.isMissingNode()) return null;

        // Thử lần lượt các field giá gốc
        for (String field : List.of("highPrice", "listPrice", "priceBeforeSale")) {
            JsonNode f = offers.path(field);
            if (!f.isMissingNode()) {
                Integer v = toInt(f);
                if (v != null && v > 0) return v;
            }
        }

        // Không có sale → originalPrice = price
        JsonNode priceNode = offers.path("price");
        if (!priceNode.isMissingNode()) return toInt(priceNode);

        return null;
    }

    /**
     * Fallback: parse __NEXT_DATA__ để lấy ảnh + giá gốc.
     * Dùng khi sàn không có ld+json (Hasaki, Watsons một số trang).
     */
    private boolean tryEnrichFromNextData(String html, SearchResultItem item) {
        try {
            int start = html.indexOf("id=\"__NEXT_DATA__\"");
            if (start < 0) start = html.indexOf("\"__NEXT_DATA__\"");
            if (start < 0) return false;

            int jsonStart = html.indexOf(">", start) + 1;
            int jsonEnd   = html.indexOf("</script>", jsonStart);
            if (jsonStart <= 0 || jsonEnd <= jsonStart) return false;

            JsonNode root = objectMapper.readTree(html.substring(jsonStart, jsonEnd));

            // Tìm node product trong pageProps (path phổ biến)
            JsonNode product = root.path("props").path("pageProps").path("product");
            if (product.isMissingNode()) {
                product = root.path("props").path("pageProps").path("initialData").path("product");
            }
            if (product.isMissingNode()) return false;

            boolean enriched = false;

            // ── Ảnh ──
            if (item.getImageUrl() == null) {
                String img = product.path("image").asText(null);
                if (img == null) img = product.path("thumbnail").asText(null);
                if (img == null) img = product.path("images").path(0).asText(null);
                if (img != null) {
                    item.setImageUrl(img);
                    enriched = true;
                }
            }

            // ── Giá gốc ──
            if (item.getOriginalPrice() == null) {
                Integer orig = nullableInt(product.get("original_price"));
                if (orig == null) orig = nullableInt(product.get("price"));
                if (orig != null) {
                    item.setOriginalPrice(orig);
                    enriched = true;
                }
            }

            // ── Giá hiện tại nếu chưa có ──
            if (item.getPrice() == null) {
                Integer price = nullableInt(product.get("special_price"));
                if (price == null) price = nullableInt(product.get("price"));
                if (price != null) {
                    item.setPrice(price);
                    enriched = true;
                }
            }

            return enriched;

        } catch (Exception e) {
            log.debug("__NEXT_DATA__ enrich failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Fallback cuối: lấy ảnh từ og:image meta tag.
     * <meta property="og:image" content="https://...">
     */
    private void tryEnrichImageFromOgTag(String html, SearchResultItem item) {
        if (item.getImageUrl() != null) return;
        try {
            Pattern ogPattern = Pattern.compile(
                "<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']",
                Pattern.CASE_INSENSITIVE);
            Matcher m = ogPattern.matcher(html);
            if (m.find()) {
                item.setImageUrl(m.group(1));
            }
        } catch (Exception e) {
            log.debug("og:image parse failed: {}", e.getMessage());
        }
    }

    // ================================================================
    // EXTRACT GIÁ TỪ SERPER SNIPPET
    // ================================================================

    private Integer extractPriceFromSnippet(String snippet) {
        if (snippet == null || snippet.isBlank()) return null;
        Matcher m = PRICE_PATTERN.matcher(snippet);
        if (m.find()) {
            String raw = m.group(1).replaceAll("[.,]", "");
            try {
                return Integer.parseInt(raw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    // ================================================================
    // MATCH ALGORITHM — dùng chung cho tất cả 5 sàn (không đổi)
    // ================================================================

    List<SearchResultItem> findBestMatch(
            String query, String platform, List<SearchResultItem> candidates) {

        if (candidates.isEmpty()) return List.of();

        String   queryNorm   = normalizeForMatch(query);
        String   queryBrand  = extractBrand(queryNorm);
        String   queryVolume = extractVolume(query);
        String[] queryWords  = queryNorm.split("\\s+");

        log.debug("Matching | platform={} | queryBrand='{}' | queryVolume='{}' | candidates={}",
            platform, queryBrand, queryVolume, candidates.size());

        SearchResultItem best      = null;
        int              bestScore = -1;

        for (SearchResultItem candidate : candidates) {
            int score = 0;

            // ── 1. Brand match (+40, bắt buộc) ──
            if (queryBrand != null) {
                String candidateBrand = normalizeForMatch(
                    candidate.getBrand() != null
                        ? candidate.getBrand()
                        : candidate.getName());
                boolean brandMatch = candidateBrand.contains(queryBrand)
                    || queryBrand.contains(candidateBrand.split("\\s+")[0]);

                if (!brandMatch) {
                    log.debug("Brand reject | query_brand='{}' | candidate_brand='{}'",
                        queryBrand, candidateBrand);
                    continue;
                }
                score += 40;
            }

            // ── 2. Tên similarity (0–30) ──
            String   candidateNorm  = normalizeForMatch(candidate.getName());
            String[] candidateWords = candidateNorm.split("\\s+");
            Set<String> queryWordSet = new HashSet<>(Arrays.asList(queryWords));

            int commonWords = 0;
            for (String w : candidateWords) {
                if (w.length() > 2 && queryWordSet.contains(w)) commonWords++;
            }
            long meaningfulQueryWords = Arrays.stream(queryWords)
                .filter(w -> w.length() > 2).count();
            if (meaningfulQueryWords > 0) {
                int similarity = (int) ((commonWords * 30) / meaningfulQueryWords);
                score += Math.min(similarity, 30);
            }

            // ── 3. Volume match (+20 hoặc -10) ──
            if (queryVolume != null) {
                String candidateVolume = extractVolume(candidate.getName());
                if (queryVolume.equals(candidateVolume)) {
                    score += 20;
                } else if (candidateVolume != null) {
                    score -= 10;
                }
            }

            // ── 4. Giá hợp lý (+10) ──
            if (candidate.getPrice() != null && candidate.getPrice() > 0) {
                score += 10;
            }

            log.debug("Candidate | platform={} | score={} | name='{}' | volume='{}'",
                platform, score, candidate.getName(),
                extractVolume(candidate.getName()));

            if (score > bestScore) {
                bestScore = score;
                best = candidate;
            }
        }

        if (best == null || bestScore < 40) {
            log.warn("No match | platform={} | query='{}' | bestScore={}",
                platform, query, bestScore);
            return List.of();
        }

        log.info("Match found | platform={} | score={} | name='{}' | price={}",
            platform, bestScore, best.getName(), best.getPrice());
        return List.of(best);
    }

    // ================================================================
    // TEXT UTILS (không đổi)
    // ================================================================

    private String normalizeForMatch(String text) {
        if (text == null) return "";
        String s = text.toLowerCase();
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
            .replace("đ", "d");
        s = s.replaceAll("[^a-z0-9\\s]", " ");
        return s.replaceAll("\\s+", " ").trim();
    }

    private String extractBrand(String queryNorm) {
        for (String word : queryNorm.split("\\s+")) {
            String clean = word.replaceAll("[^a-z0-9]", "");
            if (clean.length() > 2 && !STOPWORDS.contains(clean)
                    && !clean.matches("\\d+")) {
                return clean;
            }
        }
        return null;
    }

    private String extractVolume(String name) {
        if (name == null) return null;
        Matcher m = VOLUME_PATTERN.matcher(name);
        if (m.find()) {
            return m.group(1).replaceAll("\\.0+$", "")
                   + m.group(2).toLowerCase();
        }
        return null;
    }

    // ================================================================
    // HTTP HELPERS (không đổi)
    // ================================================================

    private JsonNode fetchJson(String url, Map<String, String> extraHeaders) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(TIMEOUT)
            .header("User-Agent", UA)
            .header("Accept", "application/json")
            .GET();
        extraHeaders.forEach(builder::header);

        HttpResponse<String> resp = httpClient.send(
            builder.build(), HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200) {
            log.debug("HTTP {} for: {}", resp.statusCode(), url);
            return null;
        }
        try {
            return objectMapper.readTree(resp.body());
        } catch (Exception e) {
            log.debug("JSON parse failed: {}", e.getMessage());
            return null;
        }
    }

    private String fetchHtml(String url, Map<String, String> extraHeaders) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
            .uri(URI.create(url))
            .timeout(TIMEOUT)
            .header("User-Agent", UA)
            .header("Accept", "text/html,application/xhtml+xml")
            .header("Accept-Language", "vi-VN,vi;q=0.9")
            .GET();
        extraHeaders.forEach(builder::header);

        HttpResponse<String> resp = httpClient.send(
            builder.build(), HttpResponse.BodyHandlers.ofString());

        if (resp.statusCode() != 200) {
            log.debug("HTTP {} for: {}", resp.statusCode(), url);
            return null;
        }
        return resp.body();
    }

    private Integer nullableInt(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) return node.asInt();
        if (node.isTextual()) {
            try {
                return Integer.parseInt(node.asText().replaceAll("[^\\d]", ""));
            } catch (NumberFormatException e) { return null; }
        }
        return null;
    }

    /** Convert JsonNode (number hoặc string) sang Integer. */
    private Integer toInt(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isNumber()) {
            int v = node.asInt();
            return v > 0 ? v : null;
        }
        if (node.isTextual()) {
            try {
                int v = Integer.parseInt(node.asText().replaceAll("[^\\d]", ""));
                return v > 0 ? v : null;
            } catch (NumberFormatException e) { return null; }
        }
        return null;
    }
}