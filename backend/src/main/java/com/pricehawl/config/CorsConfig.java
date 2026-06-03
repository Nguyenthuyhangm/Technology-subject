package com.pricehawl.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class CorsConfig {

    @Value("${pricehawk.cors.allowed-origins:http://localhost:5173,http://localhost:80,http://localhost:8824,http://127.0.0.1:80,http://127.0.0.1:8824,http://192.168.1.57:80,http://192.168.1.57:8824,http://pricehawk.site:80,http://pricehawk.site:8824,http://www.pricehawk.site:80,http://www.pricehawk.site:8824}")
    private String allowedOrigins;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

   @Bean
   public WebMvcConfigurer corsConfigurer() {
       return new WebMvcConfigurer() {
           @Override
           public void addCorsMappings(CorsRegistry registry) {
               List<String> origins = new ArrayList<>();
               for (String origin : allowedOrigins.split(",")) {
                   String trimmed = origin.trim();
                   if (!trimmed.isEmpty()) {
                       origins.add(trimmed);
                   }
               }
               registry.addMapping("/**")
                       .allowedOriginPatterns(origins.toArray(new String[0]))
                       .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                       .allowedHeaders("*");
           }
       };
   }
}