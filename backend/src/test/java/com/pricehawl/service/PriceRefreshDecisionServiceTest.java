package com.pricehawl.service;

import com.pricehawl.entity.PriceRecord;
import com.pricehawl.service.model.PriceRefreshJobDTO;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PriceRefreshDecisionServiceTest {

    private PriceRefreshDecisionService service;

    @BeforeEach
    void setUp() {
        service = new PriceRefreshDecisionService();
    }

    private PriceRefreshJobDTO job() {
        PriceRefreshJobDTO j = new PriceRefreshJobDTO();
        j.setProductListingId(UUID.randomUUID());
        j.setProductId(UUID.randomUUID());
        j.setUrl("https://example.com/product");
        j.setPlatformName("Tiki");
        j.setWishlistPriority(false);
        return j;
    }

    private PriceSnapshotDTO snapshot(int price) {
        PriceSnapshotDTO s = new PriceSnapshotDTO();
        s.setPrice(price);
        s.setOriginalPrice(120_000);
        s.setInStock(true);
        return s;
    }

    private PriceRecord latestRecord(int price, LocalDateTime crawledAt) {
        return PriceRecord.builder()
                .price(price)
                .originalPrice(120_000)
                .inStock(true)
                .crawledAt(crawledAt)
                .build();
    }

    // ── snapshot null → FAILED ────────────────────────────────────────────────

    @Test
    void decide_nullSnapshot_actionFailed() {
        PriceRefreshResultDTO result = service.decide(job(), null, null);
        assertEquals("FAILED", result.getAction());
        assertFalse(result.isCrawlSuccess());
        assertFalse(result.isInsertedNewPriceRecord());
    }

    // ── no existing record → INSERT_FIRST_SNAPSHOT ────────────────────────────

    @Test
    void decide_noExistingRecord_actionInserted() {
        PriceRefreshResultDTO result = service.decide(job(), snapshot(100_000), null);
        assertEquals("INSERTED", result.getAction());
        assertTrue(result.isInsertedNewPriceRecord());
        assertEquals("INSERT_FIRST_SNAPSHOT", result.getReason());
    }

    // ── price changed → INSERTED ──────────────────────────────────────────────

    @Test
    void decide_priceChanged_actionInserted() {
        PriceRecord old = latestRecord(100_000, LocalDateTime.now().minusHours(1));
        PriceRefreshResultDTO result = service.decide(job(), snapshot(90_000), old);
        assertEquals("INSERTED", result.getAction());
        assertEquals("INSERT_PRICE_CHANGED", result.getReason());
    }

    // ── no change, recent record → SKIPPED ───────────────────────────────────

    @Test
    void decide_noChange_recentRecord_actionSkipped() {
        PriceRecord old = latestRecord(100_000, LocalDateTime.now().minusHours(1));
        PriceRefreshResultDTO result = service.decide(job(), snapshot(100_000), old);
        assertEquals("SKIPPED", result.getAction());
        assertFalse(result.isInsertedNewPriceRecord());
    }

    // ── no change, old record (>24h) → INSERTED keepalive ────────────────────

    @Test
    void decide_noChange_oldRecord_keepaliveInserted() {
        PriceRecord old = latestRecord(100_000, LocalDateTime.now().minusHours(25));
        PriceRefreshResultDTO result = service.decide(job(), snapshot(100_000), old);
        assertEquals("INSERTED", result.getAction());
        assertEquals("INSERT_KEEPALIVE_SNAPSHOT", result.getReason());
    }

    // ── job null → không crash, vẫn xử lý snapshot ───────────────────────────

    @Test
    void decide_nullJob_doesNotThrow() {
        PriceRefreshResultDTO result = service.decide(null, snapshot(100_000), null);
        assertEquals("INSERTED", result.getAction());
    }

    // ── shouldInsert helper ───────────────────────────────────────────────────

    @Test
    void shouldInsert_nullSnapshot_returnsFalse() {
        assertFalse(service.shouldInsert(null, null));
    }

    @Test
    void shouldInsert_priceChanged_returnsTrue() {
        PriceRecord old = latestRecord(100_000, LocalDateTime.now().minusHours(1));
        assertTrue(service.shouldInsert(snapshot(80_000), old));
    }

    @Test
    void shouldInsert_noChange_recentRecord_returnsFalse() {
        PriceRecord old = latestRecord(100_000, LocalDateTime.now().minusHours(1));
        assertFalse(service.shouldInsert(snapshot(100_000), old));
    }
}
