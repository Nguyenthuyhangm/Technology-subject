package com.pricehawl.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;

import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;

@Configuration
public class RedisConfig {

    @Bean
    @Primary
    public CacheManager redisCacheManager(RedisConnectionFactory factory) {
        // Cấu hình ObjectMapper để hỗ trợ Java 8 Time (LocalDateTime)
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(mapper);

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1)) // Mặc định cache 1 tiếng
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        // Cấu hình riêng cho product-search (5 phút)
        RedisCacheConfiguration searchConfig = defaultConfig.entryTtl(Duration.ofMinutes(5));

        // Cấu hình riêng cho price-history (10 phút - để giá cập nhật mới liên tục)
        RedisCacheConfiguration historyConfig = defaultConfig.entryTtl(Duration.ofMinutes(10));

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withCacheConfiguration("product-search", searchConfig)
                .withCacheConfiguration("priceHistory", historyConfig) // Khớp với tên ở @Cacheable
                .build();
    }
}