package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.ProductListing;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TrendingDealEngineTest {

    // ── helpers ──────────────────────────────────────────────────────────────

    private PriceRecord rec(int price, int originalPrice, float discountPct, boolean inStock, LocalDateTime crawledAt) {
        return PriceRecord.builder()
                .price(price)
                .originalPrice(originalPrice)
                .discountPct(discountPct)
                .inStock(inStock)
                .crawledAt(crawledAt)
                .build();
    }

    private PriceRecord rec(int price, LocalDateTime crawledAt) {
        return PriceRecord.builder().price(price).inStock(true).crawledAt(crawledAt).build();
    }

    private ProductListing listing(double trustScore, boolean platformActive) {
        Platform platform = Platform.builder().id(1).name("Tiki").isActive(platformActive).build();
        return ProductListing.builder()
                .trustScore(trustScore)
                .platform(platform)
                .status("active")
                .build();
    }

    // ── computeBadge ─────────────────────────────────────────────────────────

    @Test
    void computeBadge_pinned_returnsPinned() {
        assertEquals("PINNED", TrendingDealEngine.computeBadge(true, 50f));
    }

    @Test
    void computeBadge_discount30_returnsHot() {
        assertEquals("HOT", TrendingDealEngine.computeBadge(false, 30f));
    }

    @Test
    void computeBadge_discount25_returnsDeal() {
        assertEquals("DEAL", TrendingDealEngine.computeBadge(false, 25f));
    }

    @Test
    void computeBadge_discount10_returnsTrending() {
        assertEquals("TRENDING", TrendingDealEngine.computeBadge(false, 10f));
    }

    // ── calculateStoredDiscountPct ────────────────────────────────────────────

    @Test
    void calculateStoredDiscountPct_null_returns0() {
        assertEquals(0f, TrendingDealEngine.calculateStoredDiscountPct(null));
    }

    @Test
    void calculateStoredDiscountPct_nullField_returns0() {
        PriceRecord r = PriceRecord.builder().price(100_000).build();
        assertEquals(0f, TrendingDealEngine.calculateStoredDiscountPct(r));
    }

    @Test
    void calculateStoredDiscountPct_normal_returnsClamped() {
        PriceRecord r = PriceRecord.builder().price(80_000).discountPct(20f).build();
        assertEquals(20f, TrendingDealEngine.calculateStoredDiscountPct(r));
    }

    @Test
    void calculateStoredDiscountPct_over100_clampedTo100() {
        PriceRecord r = PriceRecord.builder().price(0).discountPct(150f).build();
        assertEquals(100f, TrendingDealEngine.calculateStoredDiscountPct(r));
    }

    // ── calculateDisplayDiscountPct ───────────────────────────────────────────

    @Test
    void calculateDisplayDiscountPct_null_returns0() {
        assertEquals(0f, TrendingDealEngine.calculateDisplayDiscountPct(null));
    }

    @Test
    void calculateDisplayDiscountPct_normal() {
        PriceRecord r = PriceRecord.builder().price(80_000).originalPrice(100_000).build();
        assertEquals(20f, TrendingDealEngine.calculateDisplayDiscountPct(r));
    }

    @Test
    void calculateDisplayDiscountPct_zeroPrices_returns0() {
        PriceRecord r = PriceRecord.builder().price(0).originalPrice(0).build();
        assertEquals(0f, TrendingDealEngine.calculateDisplayDiscountPct(r));
    }

    // ── passesCoreListingRules ────────────────────────────────────────────────

    @Test
    void passesCoreListingRules_null_returnsFalse() {
        assertFalse(TrendingDealEngine.passesCoreListingRules(null));
    }

    @Test
    void passesCoreListingRules_activePlatform_returnsTrue() {
        assertTrue(TrendingDealEngine.passesCoreListingRules(listing(1.0, true)));
    }

    @Test
    void passesCoreListingRules_inactivePlatform_returnsFalse() {
        assertFalse(TrendingDealEngine.passesCoreListingRules(listing(1.0, false)));
    }

    @Test
    void passesCoreListingRules_nullPlatform_returnsTrue() {
        ProductListing l = ProductListing.builder().trustScore(1.0).status("active").build();
        assertTrue(TrendingDealEngine.passesCoreListingRules(l));
    }

    // ── hasInStockLatest ──────────────────────────────────────────────────────

    @Test
    void hasInStockLatest_null_returnsFalse() {
        assertFalse(TrendingDealEngine.hasInStockLatest(null));
    }

    @Test
    void hasInStockLatest_inStock_returnsTrue() {
        PriceRecord r = PriceRecord.builder().inStock(true).crawledAt(LocalDateTime.now()).build();
        assertTrue(TrendingDealEngine.hasInStockLatest(r));
    }

    @Test
    void hasInStockLatest_outOfStock_returnsFalse() {
        PriceRecord r = PriceRecord.builder().inStock(false).crawledAt(LocalDateTime.now()).build();
        assertFalse(TrendingDealEngine.hasInStockLatest(r));
    }

    // ── isEligibleOrganic ─────────────────────────────────────────────────────

    @Test
    void isEligibleOrganic_nullListing_returnsFalse() {
        assertFalse(TrendingDealEngine.isEligibleOrganic(null, List.of()));
    }

    @Test
    void isEligibleOrganic_noRecords_returnsFalse() {
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing(1.0, true), List.of()));
    }

    @Test
    void isEligibleOrganic_outOfStock_returnsFalse() {
        PriceRecord r = PriceRecord.builder()
                .price(80_000).originalPrice(100_000).discountPct(20f)
                .inStock(false).crawledAt(LocalDateTime.now()).build();
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing(1.0, true), List.of(r)));
    }

    @Test
    void isEligibleOrganic_discountTooLow_returnsFalse() {
        PriceRecord r = PriceRecord.builder()
                .price(95_000).originalPrice(100_000).discountPct(5f)
                .inStock(true).crawledAt(LocalDateTime.now()).build();
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing(1.0, true), List.of(r)));
    }

    @Test
    void isEligibleOrganic_trustNotExact1_returnsFalse() {
        PriceRecord r = PriceRecord.builder()
                .price(80_000).originalPrice(100_000).discountPct(20f)
                .inStock(true).crawledAt(LocalDateTime.now()).build();
        assertFalse(TrendingDealEngine.isEligibleOrganic(listing(0.9, true), List.of(r)));
    }

    @Test
    void isEligibleOrganic_allConditionsMet_returnsTrue() {
        PriceRecord r = PriceRecord.builder()
                .price(80_000).originalPrice(100_000).discountPct(20f)
                .inStock(true).crawledAt(LocalDateTime.now()).build();
        assertTrue(TrendingDealEngine.isEligibleOrganic(listing(1.0, true), List.of(r)));
    }

    // ── latest ────────────────────────────────────────────────────────────────

    @Test
    void latest_emptyList_returnsNull() {
        assertNull(TrendingDealEngine.latest(List.of()));
    }

    @Test
    void latest_returnsNewest() {
        LocalDateTime older = LocalDateTime.now().minusHours(2);
        LocalDateTime newer = LocalDateTime.now();
        PriceRecord r1 = rec(100_000, older);
        PriceRecord r2 = rec(90_000, newer);
        assertEquals(r2, TrendingDealEngine.latest(List.of(r1, r2)));
    }

    // ── computeHistoricalDiscount ─────────────────────────────────────────────

    @Test
    void computeHistoricalDiscount_emptyList_returnsZero() {
        TrendingDealEngine.HistoricalDiscountResult result =
                TrendingDealEngine.computeHistoricalDiscount(List.of());
        assertEquals(0, result.currentPrice());
        assertEquals(0f, result.discountPercent());
    }

    @Test
    void computeHistoricalDiscount_priceDropped_positiveDiscount() {
        LocalDateTime base = LocalDateTime.now().minusDays(10);
        List<PriceRecord> records = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            records.add(rec(100_000, base.plusDays(i)));
        }
        records.add(rec(70_000, base.plusDays(9)));

        TrendingDealEngine.HistoricalDiscountResult result =
                TrendingDealEngine.computeHistoricalDiscount(records);
        assertTrue(result.discountPercent() > 0);
    }

    // ── isLikelyFakePromo ─────────────────────────────────────────────────────

    @Test
    void isLikelyFakePromo_lessThan3Records_returnsFalse() {
        assertFalse(TrendingDealEngine.isLikelyFakePromo(List.of(
                rec(100_000, LocalDateTime.now()),
                rec(90_000, LocalDateTime.now().minusDays(1))
        )));
    }

    @Test
    void isLikelyFakePromo_stableHistory_returnsFalse() {
        LocalDateTime base = LocalDateTime.now().minusDays(10);
        List<PriceRecord> records = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            records.add(rec(100_000, base.plusDays(i)));
        }
        assertFalse(TrendingDealEngine.isLikelyFakePromo(records));
    }

    @Test
    void isLikelyFakePromo_suddenDeepDiscount_returnsTrue() {
        LocalDateTime base = LocalDateTime.now().minusDays(30);
        List<PriceRecord> records = new ArrayList<>();
        // Lịch sử giá ổn định, discount thấp
        for (int i = 0; i < 8; i++) {
            records.add(rec(100_000, 105_000, 5f, true, base.plusDays(i)));
        }
        // Đột ngột giảm sâu >72% trong 2 ngày gần đây
        records.add(rec(28_000, 105_000, 73f, true, LocalDateTime.now().minusHours(10)));
        assertTrue(TrendingDealEngine.isLikelyFakePromo(records));
    }
    @Test
    void isEligibleForTrending_nullListing() {

        assertFalse(
                TrendingDealEngine.isEligibleForTrending(
                        null,
                        List.of()
                )
        );
    }
    @Test
    void isEligibleForTrending_outOfStock() {

        ProductListing listing = listing(1.0, true);

        PriceRecord latest =
                PriceRecord.builder()
                        .price(100000)
                        .inStock(false)
                        .crawledAt(LocalDateTime.now())
                        .build();

        assertFalse(
                TrendingDealEngine.isEligibleForTrending(
                        listing,
                        List.of(latest)
                )
        );
    }
    @Test
    void isEligibleForTrending_success() {

        ProductListing listing = listing(1.0, true);

        PriceRecord latest =
                PriceRecord.builder()
                        .price(100000)
                        .inStock(true)
                        .crawledAt(LocalDateTime.now())
                        .build();

        assertTrue(
                TrendingDealEngine.isEligibleForTrending(
                        listing,
                        List.of(latest)
                )
        );
    }
    @Test
    void score_noLatest_returnsZero() {

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0, true),
                        List.of()
                );

        assertEquals(0.0,
                result.totalDealScore());
    }
    @Test
    void score_normalCase() {

        PriceRecord latest =
                PriceRecord.builder()
                        .price(70000)
                        .originalPrice(100000)
                        .discountPct(30f)
                        .inStock(true)
                        .crawledAt(LocalDateTime.now())
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0, true),
                        List.of(latest)
                );

        assertTrue(
                result.totalDealScore() > 0
        );
    }
    @Test
    void score_nullTrust() {

        ProductListing listing =
                ProductListing.builder()
                        .trustScore(null)
                        .build();

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(LocalDateTime.now())
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing,
                        List.of(latest)
                );

        assertNotNull(result);
    }
    @Test
    void score_trustGreaterThanOne() {

        ProductListing listing =
                ProductListing.builder()
                        .trustScore(5.0)
                        .build();

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(LocalDateTime.now())
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing,
                        List.of(latest)
                );

        assertTrue(
                result.trustScore() <= 1.0
        );
    }
    @Test
    void score_freshnessUnder2Hours() {

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(
                                LocalDateTime.now()
                                        .minusMinutes(30))
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0,true),
                        List.of(latest)
                );

        assertEquals(
                1.0,
                result.freshnessScore()
        );
    }
    @Test
    void score_freshness2To6Hours() {

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(
                                LocalDateTime.now()
                                        .minusHours(3)
                        )
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0, true),
                        List.of(latest)
                );

        assertEquals(
                0.80,
                result.freshnessScore(),
                0.0001
        );
    }
    @Test
    void score_freshness6To12Hours() {

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(
                                LocalDateTime.now()
                                        .minusHours(8)
                        )
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0, true),
                        List.of(latest)
                );

        assertEquals(
                0.60,
                result.freshnessScore(),
                0.0001
        );
    }
    @Test
    void score_freshnessOver12Hours() {

        PriceRecord latest =
                PriceRecord.builder()
                        .price(80000)
                        .originalPrice(100000)
                        .discountPct(20f)
                        .inStock(true)
                        .crawledAt(
                                LocalDateTime.now()
                                        .minusHours(24)
                        )
                        .build();

        TrendingDealModels.DealScoreCalculation result =
                TrendingDealEngine.score(
                        listing(1.0, true),
                        List.of(latest)
                );

        assertEquals(
                0.40,
                result.freshnessScore(),
                0.0001
        );
    }
    @Test
    void isLikelyFakePromo_inflatedOriginalPricePattern() {

        LocalDateTime now =
                LocalDateTime.now();

        List<PriceRecord> records =
                new ArrayList<>();

        records.add(rec(100000,100000,10f,true,now.minusDays(10)));
        records.add(rec(100000,100000,10f,true,now.minusDays(9)));
        records.add(rec(100000,100000,10f,true,now.minusDays(8)));

        records.add(rec(50000,150000,70f,true,now.minusDays(2)));
        records.add(rec(50000,150000,70f,true,now.minusDays(1)));
        records.add(rec(50000,150000,70f,true,now));

        assertTrue(
                TrendingDealEngine.isLikelyFakePromo(
                        records
                )
        );
    }
}
