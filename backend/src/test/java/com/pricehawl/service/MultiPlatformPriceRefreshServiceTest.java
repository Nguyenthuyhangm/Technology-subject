package com.pricehawl.service;

import com.pricehawl.entity.CrawlError;
import com.pricehawl.entity.PriceRecord;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.CrawlErrorRepository;
import com.pricehawl.repository.PriceRecordRepository;
import com.pricehawl.repository.ProductListingRepository;
import com.pricehawl.service.crawler.CrawlerRateLimiter;
import com.pricehawl.service.crawler.PlatformPriceCrawler;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MultiPlatformPriceRefreshServiceTest {

    @Mock
    private ProductListingRepository productListingRepository;

    @Mock
    private PriceRecordRepository priceRecordRepository;

    @Mock
    private PriceRefreshDecisionService decisionService;

    @Mock
    private AlertQueuePublisher alertQueuePublisher;

    @Mock
    private CrawlErrorRepository crawlErrorRepository;

    @Mock
    private PlatformTransactionManager transactionManager;

    @Mock
    private CrawlerRateLimiter rateLimiter;

    @Mock
    private ProductSearchService productSearchService;

    @Mock
    private PlatformPriceCrawler crawler;

    private MultiPlatformPriceRefreshService service;

    @BeforeEach
    void setup() {

        when(crawler.platformName())
                .thenReturn("hasaki");

        service =
                new MultiPlatformPriceRefreshService(
                        productListingRepository,
                        priceRecordRepository,
                        decisionService,
                        alertQueuePublisher,
                        crawlErrorRepository,
                        transactionManager,
                        rateLimiter,
                        List.of(crawler),
                        productSearchService
                );

        ReflectionTestUtils.setField(
                service,
                "maxItemsPerRun",
                50
        );
    }

    // =========================
    // detectErrorType
    // =========================

    @Test
    void shouldDetectTimeout() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "request timeout"
                );

        assertEquals("TIMEOUT", result);
    }

    @Test
    void shouldDetectBlocked() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "403 forbidden"
                );

        assertEquals("BLOCKED", result);
    }

    @Test
    void shouldDetectCaptcha() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "captcha detected"
                );

        assertEquals("CAPTCHA", result);
    }

    @Test
    void shouldDetectNotFound() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "404 not found"
                );

        assertEquals("NOT_FOUND", result);
    }

    @Test
    void shouldDetectHtmlChanged() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "selector changed"
                );

        assertEquals("HTML_CHANGED", result);
    }

    // =========================
    // refreshBestPriceForProduct
    // =========================

    @Test
    void shouldRefreshBestPrice() {

        UUID productId = UUID.randomUUID();

        ProductListing l1 =
                ProductListing.builder()
                        .currentPrice(300000)
                        .platformName("hasaki")
                        .build();

        ProductListing l2 =
                ProductListing.builder()
                        .currentPrice(250000)
                        .platformName("watsons")
                        .build();

        when(productListingRepository.findByProductId(productId))
                .thenReturn(List.of(l1, l2));

        ReflectionTestUtils.invokeMethod(
                service,
                "refreshBestPriceForProduct",
                productId
        );

        verify(productSearchService)
                .updateBestPriceOnly(
                        productId,
                        250000,
                        "watsons"
                );
    }

    @Test
    void shouldNotRefreshBestPriceWhenAllPriceNull() {

        UUID productId = UUID.randomUUID();

        ProductListing l1 =
                ProductListing.builder()
                        .platformName("hasaki")
                        .build();

        when(productListingRepository.findByProductId(productId))
                .thenReturn(List.of(l1));

        ReflectionTestUtils.invokeMethod(
                service,
                "refreshBestPriceForProduct",
                productId
        );

        verifyNoInteractions(productSearchService);
    }

    // =========================
    // saveCrawlError
    // =========================

    @Test
    void shouldSaveCrawlError() {

        Product product =
                Product.builder()
                        .id(UUID.randomUUID())
                        .name("Test Product")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("hasaki")
                        .url("https://test")
                        .build();

        service.saveCrawlError(
                listing,
                "OTHER",
                "some error"
        );

        verify(crawlErrorRepository)
                .save(any(CrawlError.class));
    }

    @Test
    void shouldTruncateLongErrorMessage() {

        Product product =
                Product.builder()
                        .id(UUID.randomUUID())
                        .name("Product")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("hasaki")
                        .url("url")
                        .build();

        String longMsg = "A".repeat(800);

        service.saveCrawlError(
                listing,
                "OTHER",
                longMsg
        );

        ArgumentCaptor<CrawlError> captor =
                ArgumentCaptor.forClass(CrawlError.class);

        verify(crawlErrorRepository)
                .save(captor.capture());

        assertEquals(
                500,
                captor.getValue()
                        .getErrorMessage()
                        .length()
        );
    }

    // =========================
    // processSingleListing
    // =========================

    @Test
    void shouldFailWhenCrawlerMissing() {

        Product product =
                Product.builder()
                        .id(UUID.randomUUID())
                        .name("Product")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("unknown")
                        .url("url")
                        .build();

        PriceRefreshResultDTO result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "processSingleListing",
                        listing,
                        Map.of(),
                        "HIGH"
                );

        assertFalse(result.isCrawlSuccess());
        assertEquals("FAILED", result.getAction());
    }

    @Test
    void shouldReturnOutOfStockWhen404() throws Exception {

        UUID productId = UUID.randomUUID();

        Product product =
                Product.builder()
                        .id(productId)
                        .name("Product")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("hasaki")
                        .url("url")
                        .build();

        when(crawler.crawl(anyString()))
                .thenThrow(new RuntimeException("404 not found"));

        when(productListingRepository.findById(listing.getId()))
                .thenReturn(Optional.of(listing));

        PriceRefreshResultDTO result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "processSingleListing",
                        listing,
                        Map.of(),
                        "HIGH"
                );

        assertEquals(
                "OUT_OF_STOCK",
                result.getAction()
        );
    }

    @Test
    void shouldProcessSuccessfully() throws Exception {

        UUID productId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();

        Product product =
                Product.builder()
                        .id(productId)
                        .name("Product")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(listingId)
                        .product(product)
                        .platformName("hasaki")
                        .url("url")
                        .build();

        PriceSnapshotDTO snapshot =
                new PriceSnapshotDTO(
                        100000,
                        120000,
                        20d,
                        true,
                        "SALE",
                        LocalDateTime.now(),
                        "url"
                );

        PriceRefreshResultDTO decision =
                new PriceRefreshResultDTO();

        decision.setInsertedNewPriceRecord(true);
        decision.setCrawlSuccess(true);
        decision.setAction("INSERTED");

        when(crawler.crawl(anyString()))
                .thenReturn(snapshot);

        when(decisionService.decide(
                any(),
                any(),
                any()))
                .thenReturn(decision);

        when(productListingRepository.findById(listingId))
                .thenReturn(Optional.of(listing));

        when(productListingRepository.findByProductId(productId))
                .thenReturn(List.of(listing));

        PriceRefreshResultDTO result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "processSingleListing",
                        listing,
                        Map.of(),
                        "HIGH"
                );

        assertTrue(result.isCrawlSuccess());

        verify(rateLimiter)
                .acquire("hasaki");

        verify(alertQueuePublisher)
                .publish(productId, 100000);
    }

    // =========================
    // RefreshBatchResult
    // =========================

    @Test
    void shouldCalculateBatchStatistics() {

        MultiPlatformPriceRefreshService.RefreshBatchResult batch =
                new MultiPlatformPriceRefreshService.RefreshBatchResult();

        PriceRefreshResultDTO r1 =
                new PriceRefreshResultDTO();

        r1.setInsertedNewPriceRecord(true);
        r1.setCrawlSuccess(true);

        PriceRefreshResultDTO r2 =
                new PriceRefreshResultDTO();

        r2.setCrawlSuccess(false);
        r2.setAction("FAILED");

        batch.highResults.add(r1);
        batch.mediumResults.add(r2);

        assertEquals(2, batch.totalSize());
        assertEquals(1, batch.insertedCount());
        assertEquals(1, batch.failedCount());
    }
    @Test
    void runHighPriority_shouldCallRepositoryAndProcess() {

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .platformName("hasaki")
                        .build();

        when(productListingRepository.findHighPriorityListings(any()))
                .thenReturn(List.of(listing));

        when(priceRecordRepository.findLatestByProductListingIdIn(any()))
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runHighPriority();

        assertNotNull(result);
    }
    @Test
    void runMediumPriority_shouldCallRepositoryAndProcess() {

        when(productListingRepository.findMediumPriorityListings(any()))
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runMediumPriority();

        assertTrue(result.isEmpty());
    }
    @Test
    void runLowPriority_shouldCallRepositoryAndProcess() {

        when(productListingRepository.findLowPriorityListings(any()))
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runLowPriority();

        assertTrue(result.isEmpty());
    }
    @Test
    void runScheduledRefresh_shouldAggregateAllResults() {

        when(productListingRepository.findHighPriorityListings(any()))
                .thenReturn(List.of());

        when(productListingRepository.findMediumPriorityListings(any()))
                .thenReturn(List.of());

        when(productListingRepository.findLowPriorityListings(any()))
                .thenReturn(List.of());

        MultiPlatformPriceRefreshService.RefreshBatchResult result =
                service.runScheduledRefresh();

        assertNotNull(result);

        assertEquals(
                0,
                result.totalSize()
        );
    }
    @Test
    void runHighPriorityForce_shouldReturnResults() {

        when(productListingRepository.findAllHighPriorityListings())
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runHighPriorityForce();

        assertTrue(result.isEmpty());
    }
    @Test
    void runMediumPriorityForce_shouldReturnResults() {

        when(productListingRepository.findAllMediumPriorityListings())
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runMediumPriorityForce();

        assertTrue(result.isEmpty());
    }
    @Test
    void runLowPriorityForce_shouldReturnResults() {

        when(productListingRepository.findAllLowPriorityListings())
                .thenReturn(List.of());

        List<PriceRefreshResultDTO> result =
                service.runLowPriorityForce();

        assertTrue(result.isEmpty());
    }
    @Test
    void limit_shouldTrimList() {

        ReflectionTestUtils.setField(
                service,
                "maxItemsPerRun",
                2
        );

        List<ProductListing> input =
                List.of(
                        ProductListing.builder().build(),
                        ProductListing.builder().build(),
                        ProductListing.builder().build()
                );

        List<ProductListing> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "limit",
                        input
                );

        assertEquals(
                2,
                result.size()
        );
    }
    @Test
    void loadLatestPriceRecords_shouldCreateMap() {

        UUID listingId = UUID.randomUUID();

        ProductListing listing =
                ProductListing.builder()
                        .id(listingId)
                        .build();

        PriceRecord record =
                PriceRecord.builder()
                        .productListing(listing)
                        .price(100)
                        .build();

        when(priceRecordRepository
                .findLatestByProductListingIdIn(any()))
                .thenReturn(List.of(record));

        Map<UUID, PriceRecord> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "loadLatestPriceRecords",
                        List.of(listingId)
                );

        assertEquals(
                1,
                result.size()
        );
    }
    @Test
    void buildTimeoutResult_shouldSetTimeoutValues() {

        PriceRefreshResultDTO result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "buildTimeoutResult",
                        "MEDIUM"
                );

        assertFalse(result.isCrawlSuccess());

        assertEquals(
                "FAILED",
                result.getAction()
        );

        assertEquals(
                "TIMEOUT",
                result.getReason()
        );

        assertTrue(
                result.isWishlistPriority()
        );
    }
    @Test
    void shutdown_shouldNotThrow() {

        assertDoesNotThrow(
                () -> ReflectionTestUtils.invokeMethod(
                        service,
                        "shutdown"
                )
        );
    }
    @Test
    void refreshBatchResult_shouldCountAllStates() {

        MultiPlatformPriceRefreshService.RefreshBatchResult batch =
                new MultiPlatformPriceRefreshService.RefreshBatchResult();

        PriceRefreshResultDTO skipped =
                new PriceRefreshResultDTO();
        skipped.setAction("SKIPPED");

        PriceRefreshResultDTO stock =
                new PriceRefreshResultDTO();
        stock.setAction("OUT_OF_STOCK");

        batch.highResults.add(skipped);
        batch.mediumResults.add(stock);

        assertEquals(
                1,
                batch.skippedCount()
        );

        assertEquals(
                1,
                batch.outOfStockCount()
        );

        assertEquals(
                2,
                batch.allResults().size()
        );
    }
    @Test
    void shouldDetectOtherError() {

        String result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "detectErrorType",
                        "some strange error"
                );

        assertEquals("OTHER", result);
    }

    @Test
    void saveCrawlError_shouldSwallowRepositoryException() {

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .platformName("hasaki")
                        .url("url")
                        .build();

        doThrow(new RuntimeException("db error"))
                .when(crawlErrorRepository)
                .save(any());

        assertDoesNotThrow(
                () -> service.saveCrawlError(
                        listing,
                        "OTHER",
                        "error"
                )
        );
    }
    @Test
    void shouldIgnoreAlertPublishFailure() throws Exception {

        UUID productId = UUID.randomUUID();

        Product product =
                Product.builder()
                        .id(productId)
                        .name("P")
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("hasaki")
                        .url("url")
                        .build();

        PriceSnapshotDTO snapshot =
                new PriceSnapshotDTO(
                        100,
                        120,
                        20d,
                        true,
                        "SALE",
                        LocalDateTime.now(),
                        "url"
                );

        PriceRefreshResultDTO decision =
                new PriceRefreshResultDTO();

        decision.setInsertedNewPriceRecord(true);
        decision.setCrawlSuccess(true);

        when(crawler.crawl(anyString()))
                .thenReturn(snapshot);

        when(decisionService.decide(any(), any(), any()))
                .thenReturn(decision);

        when(productListingRepository.findById(any()))
                .thenReturn(Optional.of(listing));

        when(productListingRepository.findByProductId(productId))
                .thenReturn(List.of(listing));

        doThrow(new RuntimeException("redis"))
                .when(alertQueuePublisher)
                .publish(any(), anyInt());

        PriceRefreshResultDTO result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "processSingleListing",
                        listing,
                        Map.of(),
                        "HIGH"
                );

        assertTrue(result.isCrawlSuccess());
    }
    @Test
    void shouldSkipRefreshBestPriceWhenNotInserted() throws Exception {

        Product product =
                Product.builder()
                        .id(UUID.randomUUID())
                        .build();

        ProductListing listing =
                ProductListing.builder()
                        .id(UUID.randomUUID())
                        .product(product)
                        .platformName("hasaki")
                        .url("url")
                        .build();

        PriceSnapshotDTO snapshot =
                new PriceSnapshotDTO();

        PriceRefreshResultDTO decision =
                new PriceRefreshResultDTO();

        decision.setInsertedNewPriceRecord(false);
        decision.setCrawlSuccess(true);

        when(crawler.crawl(anyString()))
                .thenReturn(snapshot);

        when(decisionService.decide(any(), any(), any()))
                .thenReturn(decision);

        when(productListingRepository.findById(any()))
                .thenReturn(Optional.of(listing));

        ReflectionTestUtils.invokeMethod(
                service,
                "processSingleListing",
                listing,
                Map.of(),
                "HIGH"
        );

        verify(alertQueuePublisher, never())
                .publish(any(), anyInt());

        verify(productSearchService, never())
                .updateBestPriceOnly(any(), any(), any());
    }
    @Test
    void processListingsParallel_empty() {

        List<PriceRefreshResultDTO> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "processListingsParallel",
                        List.of(),
                        "HIGH"
                );

        assertTrue(result.isEmpty());
    }
    @Test
    void loadLatestPriceRecords_shouldKeepFirstRecord() {

        UUID listingId = UUID.randomUUID();

        ProductListing listing =
                ProductListing.builder()
                        .id(listingId)
                        .build();

        PriceRecord r1 =
                PriceRecord.builder()
                        .productListing(listing)
                        .price(100)
                        .build();

        PriceRecord r2 =
                PriceRecord.builder()
                        .productListing(listing)
                        .price(200)
                        .build();

        when(priceRecordRepository
                .findLatestByProductListingIdIn(any()))
                .thenReturn(List.of(r1, r2));

        Map<UUID, PriceRecord> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "loadLatestPriceRecords",
                        List.of(listingId)
                );

        assertEquals(
                100,
                result.get(listingId).getPrice()
        );
    }
    @Test
    void limit_shouldReturnOriginalList() {

        ReflectionTestUtils.setField(
                service,
                "maxItemsPerRun",
                10
        );

        List<ProductListing> list =
                List.of(
                        ProductListing.builder().build(),
                        ProductListing.builder().build()
                );

        List<ProductListing> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "limit",
                        list
                );

        assertEquals(2, result.size());
    }
    @Test
    void limit_shouldIgnoreWhenConfiguredZero() {

        ReflectionTestUtils.setField(
                service,
                "maxItemsPerRun",
                0
        );

        List<ProductListing> list =
                List.of(
                        ProductListing.builder().build(),
                        ProductListing.builder().build(),
                        ProductListing.builder().build()
                );

        List<ProductListing> result =
                ReflectionTestUtils.invokeMethod(
                        service,
                        "limit",
                        list
                );

        assertEquals(3, result.size());
    }
}