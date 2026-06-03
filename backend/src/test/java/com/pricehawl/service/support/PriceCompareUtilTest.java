package com.pricehawl.service.support;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

class PriceCompareUtilTest {

    private PriceRecord record(
            Integer price,
            Integer originalPrice,
            Boolean inStock,
            Float discountPct,
            LocalDateTime crawledAt
    ) {
        PriceRecord record = new PriceRecord();
        record.setPrice(price);
        record.setOriginalPrice(originalPrice);
        record.setInStock(inStock);
        record.setDiscountPct(discountPct);
        record.setCrawledAt(crawledAt);
        return record;
    }

    private PriceSnapshotDTO snapshot(
            Integer price,
            Integer originalPrice,
            Double discountPct,
            Boolean inStock
    ) {
        PriceSnapshotDTO snapshot = new PriceSnapshotDTO();
        snapshot.setPrice(price);
        snapshot.setOriginalPrice(originalPrice);
        snapshot.setDiscountPct(discountPct);
        snapshot.setInStock(inStock);
        return snapshot;
    }

    @Test
    void utilityConstructorShouldBePrivateButCovered() throws Exception {
        Constructor<PriceCompareUtil> constructor = PriceCompareUtil.class.getDeclaredConstructor();
        constructor.setAccessible(true);

        PriceCompareUtil instance = constructor.newInstance();

        assertNotNull(instance);
    }

    @Test
    void hasPriceChangedShouldReturnTrueWhenLatestRecordIsNull() {
        assertTrue(PriceCompareUtil.hasPriceChanged(
                null,
                snapshot(100000, 120000, 10.0, true)
        ));
    }

    @Test
    void hasPriceChangedShouldReturnTrueWhenSnapshotIsNull() {
        assertTrue(PriceCompareUtil.hasPriceChanged(
                record(100000, 120000, true, 10.0f, LocalDateTime.now()),
                null
        ));
    }

    @Test
    void hasPriceChangedShouldReturnFalseWhenPriceIsSame() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertFalse(PriceCompareUtil.hasPriceChanged(latestRecord, snapshot));
    }

    @Test
    void hasPriceChangedShouldReturnTrueWhenPriceIsDifferent() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(99000, 120000, 10.0, true);

        assertTrue(PriceCompareUtil.hasPriceChanged(latestRecord, snapshot));
    }

    @Test
    void hasOriginalPriceChangedShouldReturnTrueWhenLatestRecordIsNull() {
        assertTrue(PriceCompareUtil.hasOriginalPriceChanged(
                null,
                snapshot(100000, 120000, 10.0, true)
        ));
    }

    @Test
    void hasOriginalPriceChangedShouldReturnTrueWhenSnapshotIsNull() {
        assertTrue(PriceCompareUtil.hasOriginalPriceChanged(
                record(100000, 120000, true, 10.0f, LocalDateTime.now()),
                null
        ));
    }

    @Test
    void hasOriginalPriceChangedShouldReturnFalseWhenOriginalPriceIsSame() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertFalse(PriceCompareUtil.hasOriginalPriceChanged(latestRecord, snapshot));
    }

    @Test
    void hasOriginalPriceChangedShouldReturnTrueWhenOriginalPriceIsDifferent() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 150000, 10.0, true);

        assertTrue(PriceCompareUtil.hasOriginalPriceChanged(latestRecord, snapshot));
    }

    @Test
    void hasStockChangedShouldReturnTrueWhenLatestRecordIsNull() {
        assertTrue(PriceCompareUtil.hasStockChanged(
                null,
                snapshot(100000, 120000, 10.0, true)
        ));
    }

    @Test
    void hasStockChangedShouldReturnTrueWhenSnapshotIsNull() {
        assertTrue(PriceCompareUtil.hasStockChanged(
                record(100000, 120000, true, 10.0f, LocalDateTime.now()),
                null
        ));
    }

    @Test
    void hasStockChangedShouldReturnFalseWhenStockIsSame() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertFalse(PriceCompareUtil.hasStockChanged(latestRecord, snapshot));
    }

    @Test
    void hasStockChangedShouldReturnTrueWhenStockIsDifferent() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, false);

        assertTrue(PriceCompareUtil.hasStockChanged(latestRecord, snapshot));
    }

    @Test
    void hasDiscountChangedShouldReturnTrueWhenLatestRecordIsNull() {
        assertTrue(PriceCompareUtil.hasDiscountChanged(
                null,
                snapshot(100000, 120000, 10.0, true)
        ));
    }

    @Test
    void hasDiscountChangedShouldReturnTrueWhenSnapshotIsNull() {
        assertTrue(PriceCompareUtil.hasDiscountChanged(
                record(100000, 120000, true, 10.0f, LocalDateTime.now()),
                null
        ));
    }

    @Test
    void hasDiscountChangedShouldReturnFalseWhenBothDiscountsAreNull() {
        PriceRecord latestRecord = record(100000, 120000, true, null, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, null, true);

        assertFalse(PriceCompareUtil.hasDiscountChanged(latestRecord, snapshot));
    }

    @Test
    void hasDiscountChangedShouldReturnTrueWhenDiscountIsDifferent() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 20.0, true);

        assertTrue(PriceCompareUtil.hasDiscountChanged(latestRecord, snapshot));
    }

    @Test
    void hasDiscountChangedShouldReturnTrueWhenRecordDiscountIsFloatAndSnapshotDiscountIsDouble() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertTrue(PriceCompareUtil.hasDiscountChanged(latestRecord, snapshot));
    }

    @Test
    void isSnapshotOlderThanShouldReturnTrueWhenLatestRecordIsNull() {
        assertTrue(PriceCompareUtil.isSnapshotOlderThan(null, 24));
    }

    @Test
    void isSnapshotOlderThanShouldReturnTrueWhenCrawledAtIsNull() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, null);

        assertTrue(PriceCompareUtil.isSnapshotOlderThan(latestRecord, 24));
    }

    @Test
    void isSnapshotOlderThanShouldReturnFalseWhenRecordIsFresh() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(1)
        );

        assertFalse(PriceCompareUtil.isSnapshotOlderThan(latestRecord, 24));
    }

    @Test
    void isSnapshotOlderThanShouldReturnTrueWhenRecordIsOlderThanKeepAliveHours() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(25)
        );

        assertTrue(PriceCompareUtil.isSnapshotOlderThan(latestRecord, 24));
    }

    @Test
    void isSnapshotOlderThanShouldReturnTrueWhenAgeEqualsKeepAliveHours() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(24).minusMinutes(1)
        );

        assertTrue(PriceCompareUtil.isSnapshotOlderThan(latestRecord, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnFalseWhenSnapshotIsNull() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());

        assertFalse(PriceCompareUtil.shouldInsertNewRecord(latestRecord, null, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnTrueWhenLatestRecordIsNull() {
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertTrue(PriceCompareUtil.shouldInsertNewRecord(null, snapshot, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnTrueWhenPriceChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(90000, 120000, 10.0, true);

        assertTrue(PriceCompareUtil.shouldInsertNewRecord(latestRecord, snapshot, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnTrueWhenOriginalPriceChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 150000, 10.0, true);

        assertTrue(PriceCompareUtil.shouldInsertNewRecord(latestRecord, snapshot, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnTrueWhenStockChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, false);

        assertTrue(PriceCompareUtil.shouldInsertNewRecord(latestRecord, snapshot, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnTrueWhenRecordIsTooOld() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(25)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertTrue(PriceCompareUtil.shouldInsertNewRecord(latestRecord, snapshot, 24));
    }

    @Test
    void shouldInsertNewRecordShouldReturnFalseWhenNothingChangedAndRecordIsFresh() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(1)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertFalse(PriceCompareUtil.shouldInsertNewRecord(latestRecord, snapshot, 24));
    }

    @Test
    void buildInsertReasonShouldReturnSkipInvalidSnapshot() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());

        assertEquals(
                "SKIP_INVALID_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(latestRecord, null, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnInsertFirstSnapshot() {
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "INSERT_FIRST_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(null, snapshot, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnInsertPriceChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(90000, 120000, 10.0, true);

        assertEquals(
                "INSERT_PRICE_CHANGED",
                PriceCompareUtil.buildInsertReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnInsertOriginalPriceChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 150000, 10.0, true);

        assertEquals(
                "INSERT_ORIGINAL_PRICE_CHANGED",
                PriceCompareUtil.buildInsertReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnInsertStockChanged() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, false);

        assertEquals(
                "INSERT_STOCK_CHANGED",
                PriceCompareUtil.buildInsertReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnInsertKeepAliveSnapshot() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(25)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "INSERT_KEEPALIVE_SNAPSHOT",
                PriceCompareUtil.buildInsertReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildInsertReasonShouldReturnSkipNoMeaningfulChange() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(1)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "SKIP_NO_MEANINGFUL_CHANGE",
                PriceCompareUtil.buildInsertReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnSkipInvalidSnapshot() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());

        assertEquals(
                "SKIP_INVALID_SNAPSHOT",
                PriceCompareUtil.buildSkipReason(latestRecord, null, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnNoSkipFirstSnapshotShouldInsert() {
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "NO_SKIP_FIRST_SNAPSHOT_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(null, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnNoSkipPriceChangedShouldInsert() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(90000, 120000, 10.0, true);

        assertEquals(
                "NO_SKIP_PRICE_CHANGED_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnNoSkipOriginalPriceChangedShouldInsert() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 150000, 10.0, true);

        assertEquals(
                "NO_SKIP_ORIGINAL_PRICE_CHANGED_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnNoSkipStockChangedShouldInsert() {
        PriceRecord latestRecord = record(100000, 120000, true, 10.0f, LocalDateTime.now());
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, false);

        assertEquals(
                "NO_SKIP_STOCK_CHANGED_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnNoSkipKeepAliveShouldInsert() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(25)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "NO_SKIP_KEEPALIVE_SHOULD_INSERT",
                PriceCompareUtil.buildSkipReason(latestRecord, snapshot, 24)
        );
    }

    @Test
    void buildSkipReasonShouldReturnSkipNoMeaningfulChange() {
        PriceRecord latestRecord = record(
                100000,
                120000,
                true,
                10.0f,
                LocalDateTime.now().minusHours(1)
        );
        PriceSnapshotDTO snapshot = snapshot(100000, 120000, 10.0, true);

        assertEquals(
                "SKIP_NO_MEANINGFUL_CHANGE",
                PriceCompareUtil.buildSkipReason(latestRecord, snapshot, 24)
        );
    }
}