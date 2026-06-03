package com.pricehawl.service;

import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.ProductSearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProductSearchIndexBootstrap {

    private final ProductRepository productRepository;
    private final ProductSearchRepository productSearchRepository;
    private final ProductSearchService productSearchService;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeSearchIndex() {
        try {
            long productCount = productRepository.count();
            long indexedCount = productSearchRepository.count();

            if (productCount == 0) {
                log.info("Skip Elasticsearch sync: product table is empty");
                return;
            }

            if (indexedCount > 0) {
                log.info("Elasticsearch index already has {} documents, skip initial sync", indexedCount);
                return;
            }

            log.info("Elasticsearch index is empty, syncing {} products from database", productCount);
            productSearchService.syncAll();
        } catch (Exception ex) {
            log.warn("Initial Elasticsearch sync check failed, trying full sync once: {}", ex.getMessage());
            try {
                productSearchService.syncAll();
            } catch (Exception syncEx) {
                log.error("Initial Elasticsearch sync failed: {}", syncEx.getMessage(), syncEx);
            }
        }
    }
}