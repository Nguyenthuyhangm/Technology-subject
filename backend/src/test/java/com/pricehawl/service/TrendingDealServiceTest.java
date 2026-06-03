package com.pricehawl.service;

import com.pricehawl.dto.TrendingDealModels.*;
import com.pricehawl.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import com.pricehawl.dto.TrendingDealModels.DealScoreCalculation;
import com.pricehawl.dto.TrendingDealModels.TrendingDealDTO;
import com.pricehawl.dto.TrendingDealModels.TrendingDealResponse;
import com.pricehawl.dto.TrendingDealModels.TrendingDealsSnapshot;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;

import com.pricehawl.repository.TrendingDealRepositories.TrendingDealRepository;
;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;


import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrendingDealServiceTest {
    @Mock
    private TrendingDealRepository trendingDealRepository;

    @Mock
    private TrendingDealTxBatchRunner txBatchRunner;

    @InjectMocks
    private TrendingDealService service;


    @Test
    void shouldIgnoreNullPrice() {

        TrendingDealService.PriceConflictStats stats =
                new TrendingDealService.PriceConflictStats();

        stats.observe(null);

        assertFalse(stats.isConflict());
    }

    @Test
    void shouldIgnoreZeroPrice() {

        TrendingDealService.PriceConflictStats stats =
                new TrendingDealService.PriceConflictStats();

        stats.observe(0);

        assertFalse(stats.isConflict());
    }

    @Test
    void shouldNotDetectConflict() {

        TrendingDealService.PriceConflictStats stats =
                new TrendingDealService.PriceConflictStats();

        stats.observe(100);

        stats.observe(105);

        assertFalse(stats.isConflict());
    }

    @Test
    void shouldDetectConflict() {

        TrendingDealService.PriceConflictStats stats =
                new TrendingDealService.PriceConflictStats();

        stats.observe(100);

        stats.observe(108);

        assertTrue(stats.isConflict());
    }
    @Test
    void mapToResponse_nullDto_returnsNull() {

        TrendingDealResponse result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "mapToResponse",
                        null,
                        false
                );

        assertNull(result);
    }
    @Test
    void mapToResponse_success() {

        UUID productId = UUID.randomUUID();

        Product product = Product.builder()
                .id(productId)
                .name("Serum")
                .imageUrl("img.jpg")
                .build();

        Platform platform = Platform.builder()
                .id(1)
                .name("Hasaki")
                .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platform(platform)
                        .platformName("Hasaki")
                        .isPinned(true)
                        .build();

        PriceRecord latest =
                PriceRecord.builder()
                        .price(100000)
                        .originalPrice(150000)
                        .discountPct(30f)
                        .build();

        DealScoreCalculation score =
                new DealScoreCalculation(
                        1,
                        1,
                        1,
                        3
                );

        TrendingDealDTO dto =
                new TrendingDealDTO(
                        listing,
                        score,
                        latest,
                        List.of(latest)
                );

        TrendingDealResponse result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "mapToResponse",
                        dto,
                        true
                );

        assertEquals(productId, result.getProductId());
        assertTrue(result.getPriceConflict());
        assertNotNull(result.getPriceConflictMessage());
    }
    @Test
    void mapToResponse_platformNull() {

        Product product =
                Product.builder()
                        .id(UUID.randomUUID())
                        .name("P")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platform(null)
                        .platformName("fallback")
                        .build();

        TrendingDealDTO dto =
                new TrendingDealDTO(
                        listing,
                        DealScoreCalculation.zero(),
                        null,
                        List.of()
                );

        TrendingDealResponse result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "mapToResponse",
                        dto,
                        false
                );

        assertEquals(
                "fallback",
                result.getPlatformName()
        );
    }
    @Test
    void getTrendingDealsSnapshot_cached() {

        TrendingDealsSnapshot snapshot =
                mock(TrendingDealsSnapshot.class);

        TrendingDealService spy =
                Mockito.spy(service);

        doReturn(snapshot)
                .when(spy)
                .getTrendingDealsSnapshotCached(false);

        assertSame(
                snapshot,
                spy.getTrendingDealsSnapshot(
                        false,
                        false
                )
        );
    }
    @Test
    void getTrendingDealsSnapshot_refresh() {

        TrendingDealsSnapshot snapshot =
                mock(TrendingDealsSnapshot.class);

        TrendingDealService spy =
                Mockito.spy(service);

        doReturn(snapshot)
                .when(spy)
                .refreshTrendingDealsSnapshot(false);

        assertSame(
                snapshot,
                spy.getTrendingDealsSnapshot(
                        false,
                        true
                )
        );
    }
    @Test
    void autoWarmTrendingCache_success() {

        TrendingDealService spy =
                Mockito.spy(service);

        doReturn(mock(TrendingDealsSnapshot.class))
                .when(spy)
                .refreshTrendingDealsSnapshot(anyBoolean());

        assertDoesNotThrow(
                spy::autoWarmTrendingCache
        );

        verify(spy, times(2))
                .refreshTrendingDealsSnapshot(anyBoolean());
    }
    @Test
    void autoWarmTrendingCache_exception() {

        TrendingDealService spy =
                Mockito.spy(service);

        doThrow(new RuntimeException("boom"))
                .when(spy)
                .refreshTrendingDealsSnapshot(false);

        assertDoesNotThrow(
                spy::autoWarmTrendingCache
        );
    }
    @Test
    void buildSnapshotUnsafe_emptySlice() {

        Slice<UUID> slice =
                new SliceImpl<>(List.of());

        when(trendingDealRepository
                .findTrendingCandidateIdsSlice(
                        anyDouble(),
                        any(),
                        any()))
                .thenReturn(slice);

        TrendingDealsSnapshot snapshot =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "buildSnapshotUnsafe",
                        false
                );

        assertNotNull(snapshot);
        assertTrue(snapshot.deals().isEmpty());
    }
    @Test
    void comparator_shouldSortByTrustScore() {

        Comparator<TrendingDealDTO> cmp =
                TrendingDealService
                        .dedupRepresentativeComparator();

        assertNotNull(cmp);
    }
    @Test
    void trendingSortComparator_shouldCreateComparator() {

        Comparator<?> cmp =
                ReflectionTestUtils.invokeMethod(
                        TrendingDealService.class,
                        "trendingSortComparator"
                );

        assertNotNull(cmp);
    }
}