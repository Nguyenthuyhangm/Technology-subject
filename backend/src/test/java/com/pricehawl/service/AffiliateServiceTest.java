package com.pricehawl.service;

import com.pricehawl.entity.AffiliateClick;
import com.pricehawl.entity.Platform;
import com.pricehawl.entity.ProductListing;
import com.pricehawl.repository.AffiliateClickRepository;
import com.pricehawl.repository.ProductListingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;


import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AffiliateServiceTest {

    @Mock
    private AffiliateClickRepository clickRepository;

    @Mock
    private ProductListingRepository listingRepository;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private AffiliateService affiliateService;

    private UUID productId;

    @BeforeEach
    void setUp() {
        productId = UUID.randomUUID();

        lenient().when(redisTemplate.opsForValue())
                .thenReturn(valueOperations);
    }

    private ProductListing listing(String url) {
        return ProductListing.builder()
                .id(UUID.randomUUID())
                .platform(
                        Platform.builder()
                                .id(1)
                                .name("Tiki")
                                .isActive(true)
                                .build()
                )
                .platformName("Tiki")
                .url(url)
                .status("active")
                .build();
    }

    // ====================================================
    // BOT CLICK
    // ====================================================

    @Test
    void processClick_botUserAgent_shouldNotSaveClick() {

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of(
                        listing("https://tiki.vn/product")
                ));

        String result = affiliateService.processClick(
                productId,
                "tiki",
                null,
                "127.0.0.1",
                "GoogleBot"
        );

        assertNotNull(result);

        verify(clickRepository, never()).save(any());
    }

    // ====================================================
    // VALID CLICK
    // ====================================================

    @Test
    void processClick_validClick_shouldSave() {

        when(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                eq(5L),
                eq(TimeUnit.MINUTES)
        )).thenReturn(true);

        when(valueOperations.increment(anyString()))
                .thenReturn(1L);

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of(
                        listing("https://tiki.vn/product")
                ));

        String result = affiliateService.processClick(
                productId,
                "tiki",
                UUID.randomUUID().toString(),
                "127.0.0.1",
                "Mozilla"
        );

        assertNotNull(result);

        verify(clickRepository, times(1))
                .save(any(AffiliateClick.class));
    }

    // ====================================================
    // DUPLICATE CLICK
    // ====================================================

    @Test
    void processClick_duplicateClick_shouldNotSave() {

        when(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                eq(5L),
                eq(TimeUnit.MINUTES)
        )).thenReturn(false);

        when(valueOperations.increment(anyString()))
                .thenReturn(1L);

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of(
                        listing("https://tiki.vn/product")
                ));

        affiliateService.processClick(
                productId,
                "tiki",
                null,
                "127.0.0.1",
                "Mozilla"
        );

        verify(clickRepository, never())
                .save(any());
    }

    // ====================================================
    // SUSPICIOUS CLICK
    // ====================================================

    @Test
    void processClick_tooManyClicks_shouldNotSave() {

        when(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                eq(5L),
                eq(TimeUnit.MINUTES)
        )).thenReturn(true);

        when(valueOperations.increment(anyString()))
                .thenReturn(11L);

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of(
                        listing("https://tiki.vn/product")
                ));

        affiliateService.processClick(
                productId,
                "tiki",
                null,
                "127.0.0.1",
                "Mozilla"
        );

        verify(clickRepository, never())
                .save(any());
    }

    // ====================================================
    // NO LISTING
    // ====================================================

    @Test
    void processClick_listingNotFound_shouldReturnHomepage() {

        when(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                eq(5L),
                eq(TimeUnit.MINUTES)
        )).thenReturn(true);

        when(valueOperations.increment(anyString()))
                .thenReturn(1L);

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of());

        String result = affiliateService.processClick(
                productId,
                "tiki",
                null,
                "127.0.0.1",
                "Mozilla"
        );

        assertEquals(
                "https://pricehawk.vn",
                result
        );
    }

    // ====================================================
    // TIKI URL
    // ====================================================

    @Test
    void processClick_tiki_shouldGenerateAffiliateLink() {

        when(valueOperations.setIfAbsent(
                anyString(),
                anyString(),
                eq(5L),
                eq(TimeUnit.MINUTES)
        )).thenReturn(true);

        when(valueOperations.increment(anyString()))
                .thenReturn(1L);

        when(listingRepository.findByProductIdAndPlatformNameIgnoreCase(
                any(), anyString()))
                .thenReturn(List.of(
                        listing("https://tiki.vn/product")
                ));

        String result = affiliateService.processClick(
                productId,
                "tiki",
                null,
                "127.0.0.1",
                "Mozilla"
        );

        assertTrue(result.contains("go.isclix.com"));
        assertTrue(result.contains("4348614231480407268"));
    }

    // ====================================================
    // SAVE CLICK
    // ====================================================

    @Test
    void saveClickAsync_shouldSaveEntity() {

        affiliateService.saveClickAsync(
                UUID.randomUUID(),
                productId,
                "tiki",
                "click123",
                "127.0.0.1",
                "Mozilla"
        );

        verify(clickRepository)
                .save(any(AffiliateClick.class));
    }

    // ====================================================
    // LONG USER AGENT
    // ====================================================

    @Test
    void saveClickAsync_longUserAgent_shouldTrim() {

        String ua = "A".repeat(300);

        affiliateService.saveClickAsync(
                null,
                productId,
                "tiki",
                "click123",
                "127.0.0.1",
                ua
        );

        ArgumentCaptor<AffiliateClick> captor =
                ArgumentCaptor.forClass(AffiliateClick.class);

        verify(clickRepository).save(captor.capture());

        assertEquals(
                255,
                captor.getValue().getUserAgent().length()
        );
    }

    // ====================================================
    // REPOSITORY ERROR
    // ====================================================

    @Test
    void saveClickAsync_repositoryError_shouldNotThrow() {

        doThrow(new RuntimeException("DB Error"))
                .when(clickRepository)
                .save(any());

        assertDoesNotThrow(() ->
                affiliateService.saveClickAsync(
                        null,
                        productId,
                        "tiki",
                        "click123",
                        "127.0.0.1",
                        "Mozilla"
                )
        );
    }
}