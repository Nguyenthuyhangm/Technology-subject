package com.pricehawl.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PriceRefreshSchedulerTest {

    @Mock
    private MultiPlatformPriceRefreshService refreshService;

    @InjectMocks
    private PriceRefreshScheduler scheduler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(
                scheduler,
                "schedulerEnabled",
                true
        );
    }

    // =====================================================
    // SCHEDULER DISABLED
    // =====================================================

    @Test
    void runScheduledPriceRefresh_schedulerDisabled_shouldSkip() {

        ReflectionTestUtils.setField(
                scheduler,
                "schedulerEnabled",
                false
        );

        scheduler.runScheduledPriceRefresh();

        verify(refreshService, never())
                .runScheduledRefresh();
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    @Test
    void runScheduledPriceRefresh_success() {

        MultiPlatformPriceRefreshService.RefreshBatchResult batch =
                new MultiPlatformPriceRefreshService.RefreshBatchResult();

        when(refreshService.runScheduledRefresh())
                .thenReturn(batch);

        scheduler.runScheduledPriceRefresh();

        verify(refreshService, times(1))
                .runScheduledRefresh();
    }

    // =====================================================
    // SERVICE THROW EXCEPTION
    // =====================================================

    @Test
    void runScheduledPriceRefresh_serviceThrows_shouldNotCrash() {

        when(refreshService.runScheduledRefresh())
                .thenThrow(new RuntimeException("DB error"));

        assertDoesNotThrow(() ->
                scheduler.runScheduledPriceRefresh()
        );

        verify(refreshService)
                .runScheduledRefresh();
    }

    // =====================================================
    // EMPTY RESULT
    // =====================================================

    @Test
    void runScheduledPriceRefresh_emptyBatch_success() {

        MultiPlatformPriceRefreshService.RefreshBatchResult batch =
                new MultiPlatformPriceRefreshService.RefreshBatchResult();

        assertEquals(0, batch.totalSize());
        assertEquals(0, batch.insertedCount());
        assertEquals(0, batch.failedCount());
        assertEquals(0, batch.skippedCount());

        when(refreshService.runScheduledRefresh())
                .thenReturn(batch);

        assertDoesNotThrow(() ->
                scheduler.runScheduledPriceRefresh()
        );

        verify(refreshService)
                .runScheduledRefresh();
    }
}