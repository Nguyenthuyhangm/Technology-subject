package com.pricehawl.service.support;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class PriceCompareUtilTest {

    private PriceRecord record(Integer price, Integer originalPrice, Float discountPct, Boolean inStock, LocalDateTime crawledAt) {
        return PriceRecord.builder()
                .price(price)
                .originalPrice(originalPrice)
                .discountPct(discountPct)
                .inStock(inStock)
                .crawledAt(crawledAt)
                .build();
    }

    private PriceSnapshotDTO snapshot(Integer price, Integer originalPrice, Double discountPct, Boolean inStock) {
        PriceSnapshotDTO s = new PriceSnapshotDTO();
        s.setPrice(price);
        s.setOriginalPrice(originalPrice);
        s.setDiscountPct(discountPct);
        s.setInStock(inStock);
        return s;
    }

    // ── hasPriceChanged ──────────────────────────────────────────────────────

    @Test
    void hasPriceChanged_nullRecord_returnsTrue() {
        assertTrue(PriceCompareUtil.hasPriceChanged(null, snapshot(100_000, null, null, true)));
    }

    @Test
    void hasPriceChanged_nullSnapshot_returnsTrue() {
        assertTrue(PriceCompareUtil.hasPriceChanged(record(100_000, null, null, true, LocalDateTime.now()), null));
    }

    @Test
    void hasPriceChanged_samePrice_returnsFalse() {
        assertFalse(PriceCompareUtil.hasPriceChanged(
                record(100_000, null, null, true, LocalDateTime.now()),
                snapshot(100_000, null, null, true)));
    }

    @Test
    void hasPriceChanged_differentPrice_returnsTrue() {
        assertTrue(PriceCompareUtil.hasPriceChanged(
                record(100_000, null, null, true, LocalDateTime.now()),
                snapshot(90_000, null, null, true)));
    }

    // ── hasOriginalPriceChanged ──────────────────────────────────────────────

    @Test
    void hasOriginalPriceChanged_sameOriginal_returnsFalse() {
        assertFalse(PriceCompareUtil.hasOriginalPriceChanged(
                record(100_000, 120_000, null, true, LocalDateTime.now()),
                snapshot(100_000, 120_000, null, true)));
    }

    @Test
    void hasOriginalPriceChanged_differentOriginal_returnsTrue() {
        assertTrue(PriceCompareUtil.hasOriginalPriceChanged(
                record(100_000, 120_000, null, true, LocalDateTime.now()),
                snapshot(100_000, 150_000, null, true)));
    }

    // ── hasStockChanged ──────────────────────────────────────────────────────

    @Test
    void hasStockChanged_sameStock_returnsFalse() {
        assertFalse(PriceCompareUtil.hasStockChanged(
                record(100_000, null, null, true, LocalDateTime.now()),
                snapshot(100_000, null, null, true)));
    }

    @Test
    void hasStockChanged_differentStock_returnsTrue() {
        assertTrue(PriceCompareUtil.hasStockChanged(
                record(100_000, null, null, true, LocalDateTime.now()),
                snapshot(100_000, null, null, false)));
    }

    // ── isSnapshotOlderThan ──────────────────────────────────────────────────

    @Test
    void isSnapshotOlderThan_nullRecord_returnsTrue() {
        assertTrue(PriceCompareUtil.isSnapshotOlderThan(null, 24));
    }

    @Test
    void isSnapshotOlderThan_recentRecord_returnsFalse() {
        PriceRecord r = record(100_000, null, null, true, LocalDateTime.now().minusHours(1));
        assertFalse(PriceCompareUtil.isSnapshotOlderThan(r, 24));
    }

    @Test
    void isSnapshotOlderThan_oldRecord_returnsTrue() {
        PriceRecord r = record(100_000, null, null, true, LocalDateTime.now().minusHours(25));
        assertTrue(PriceCompareUtil.isSnapshotOlderThan(r, 24));
    }

    @Test
    void isSnapshotOlderThan_exactBoundary_returnsTrue() {
        PriceRecord r = record(100_000, null, null, true, LocalDateTime.now().minusHours(24));
        assertTrue(PriceCompareUtil.isSnapshotOlderThan(r, 24));
    }

    // ── shouldInsertNewRecord ────────────────────────────────────────────────

    @Test
    void shouldInsert_nullSnapshot_returnsFalse() {
        assertFalse(PriceCompareUtil.shouldInsertNewRecord(
                record(100_000, null, null, true, LocalDateTime.now()), null, 24));
    }

    @Test
    void shouldInsert_nullRecord_returnsTrue() {
        assertTrue(PriceCompareUtil.shouldInsertNewRecord(null, snapshot(100_000, null, null, true), 24));
    }

    @Test
    void shouldInsert_priceChanged_returnsTrue() {
        assertTrue(PriceCompareUtil.shouldInsertNewRecord(
                record(100_000, null, null, true, LocalDateTime.now().minusHours(1)),
                snapshot(90_000, null, null, true), 24));
    }

    @Test
    void shouldInsert_nothingChanged_recentRecord_returnsFalse() {
        assertFalse(PriceCompareUtil.shouldInsertNewRecord(
                record(100_000, 120_000, null, true, LocalDateTime.now().minusHours(1)),
                snapshot(100_000, 120_000, null, true), 24));
    }

    @Test
    void shouldInsert_nothingChanged_oldRecord_returnsTrue() {
        assertTrue(PriceCompareUtil.shouldInsertNewRecord(
                record(100_000, 120_000, null, true, LocalDateTime.now().minusHours(25)),
                snapshot(100_000, 120_000, null, true), 24));
    }

    @Test
    void shouldInsert_stockChanged_returnsTrue() {
        assertTrue(PriceCompareUtil.shouldInsertNewRecord(
                record(100_000, null, null, true, LocalDateTime.now().minusHours(1)),
                snapshot(100_000, null, null, false), 24));
    }

    // ── buildInsertReason ────────────────────────────────────────────────────

    @Test
    void buildInsertReason_nullSnapshot_returnsSkipInvalid() {
        assertEquals("SKIP_INVALID_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(null, null, 24));
    }

    @Test
    void buildInsertReason_nullRecord_returnsFirstSnapshot() {
        assertEquals("INSERT_FIRST_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(null, snapshot(100_000, null, null, true), 24));
    }

    @Test
    void buildInsertReason_priceChanged_returnsPriceChanged() {
        assertEquals("INSERT_PRICE_CHANGED",
                PriceCompareUtil.buildInsertReason(
                        record(100_000, null, null, true, LocalDateTime.now().minusHours(1)),
                        snapshot(90_000, null, null, true), 24));
    }

    @Test
    void buildInsertReason_keepalive_returnsKeepalive() {
        assertEquals("INSERT_KEEPALIVE_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(
                        record(100_000, 120_000, null, true, LocalDateTime.now().minusHours(25)),
                        snapshot(100_000, 120_000, null, true), 24));
    }

    @Test
    void buildInsertReason_noChange_returnsSkip() {
        assertEquals("SKIP_NO_MEANINGFUL_CHANGE",
                PriceCompareUtil.buildInsertReason(
                        record(100_000, 120_000, null, true, LocalDateTime.now().minusHours(1)),
                        snapshot(100_000, 120_000, null, true), 24));
    }

    // ── buildSkipReason ──────────────────────────────────────────────────────

    @Test
    void buildSkipReason_noChange_returnsSkip() {
        assertEquals("SKIP_NO_MEANINGFUL_CHANGE",
                PriceCompareUtil.buildSkipReason(
                        record(100_000, 120_000, null, true, LocalDateTime.now().minusHours(1)),
                        snapshot(100_000, 120_000, null, true), 24));
    }

    @Test
    void buildSkipReason_priceChanged_returnsNoSkip() {
        assertEquals("NO_SKIP_PRICE_CHANGED_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(
                        record(100_000, null, null, true, LocalDateTime.now().minusHours(1)),
                        snapshot(90_000, null, null, true), 24));
    }
}
