package com.pricehawl.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class WebCorsConfig {

    @Value("${pricehawk.cors.allowed-origins:http://localhost:5173,http://localhost:80,http://localhost:8824,http://127.0.0.1:80,http://127.0.0.1:8824,http://192.168.1.57:80,http://192.168.1.57:8824,http://pricehawk.site:80,http://pricehawk.site:8824,http://www.pricehawk.site:80,http://www.pricehawk.site:8824}")
    private String allowedOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        List<String> origins = new ArrayList<>();
        for (String origin : allowedOrigins.split(",")) {
            String trimmed = origin.trim();
            if (!trimmed.isEmpty()) {
                origins.add(trimmed);
            }
        }
        origins.add("http://localhost:*");
        origins.add("http://127.0.0.1:*");
        origins.add("https://localhost:*");
        origins.add("chrome-extension://*");
        config.setAllowedOriginPatterns(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "X-Trending-Computed-At",
                "X-Trending-Next-Refresh-After",
                "X-Trending-Cache-Ttl-Seconds"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
