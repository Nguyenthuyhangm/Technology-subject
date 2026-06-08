package com.pricehawl.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Bật @Async cho Spring và config thread pool riêng cho on-demand crawl.
 *
 * QUAN TRỌNG: Nếu thiếu file này, @Async trong OnDemandCrawlService
 * sẽ KHÔNG chạy ngầm mà chạy blocking trên thread của HTTP request,
 * khiến controller bị treo 30–60 giây.
 *
 * Bean "onDemandCrawlExecutor" được inject vào @Async("onDemandCrawlExecutor")
 * trong OnDemandCrawlService.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Thread pool riêng cho on-demand crawl.
     * Tách khỏi crawlerPool của MultiPlatformPriceRefreshService
     * để scheduled crawl và on-demand crawl không tranh nhau thread.
     *
     * - corePoolSize  = 2  : thường chỉ có vài user trigger cùng lúc
     * - maxPoolSize   = 5  : burst tối đa
     * - queueCapacity = 10 : nếu > 5 job đang chạy, xếp hàng tối đa 10
     */
    @Bean(name = "onDemandCrawlExecutor")
    public Executor onDemandCrawlExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("on-demand-crawl-");
        executor.initialize();
        return executor;
    }
}