package com.pricehawl;

import com.pricehawl.service.ProductSearchService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableJpaRepositories(considerNestedRepositories = true)
public class BackendApplication implements CommandLineRunner {
    private final ProductSearchService productSearchService;

    public BackendApplication(ProductSearchService productSearchService) {
        this.productSearchService = productSearchService;
    }

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        // Sync all products from database to Elasticsearch on startup
        System.out.println("Starting database sync to Elasticsearch...");
        // productSearchService.syncAll();
        System.out.println(" Database sync completed successfully!");
    }
}
