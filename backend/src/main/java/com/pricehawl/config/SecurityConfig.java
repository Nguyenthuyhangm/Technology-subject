package com.pricehawl.config;

import com.pricehawl.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.*;
import org.springframework.web.cors.*;

import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Dùng setAllowedOrigins("*") thay vì setAllowedOriginPatterns
        // OK vì allowCredentials = false
        config.setAllowedOrigins(List.of("*"));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtAuthFilter jwtFilter
    ) throws Exception {

        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        // Cho phép preflight request từ frontend
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Actuator endpoints cho monitoring
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/actuator/prometheus"
                        ).permitAll()

                        // Auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // Public GET APIs
                        .requestMatchers(HttpMethod.GET,
                                "/products/**",
                                "/api/products/**",
                                "/api/trending-deals/**",
                                "/api/v1/price-history/**",
                                "/api/compare/**",
                                "/api/go/**",               // affiliate redirect
                                "/api/recommendations/**"
                        ).permitAll()

                        // AI Chat dùng POST nên phải permit riêng
                        .requestMatchers(HttpMethod.POST,
                                "/api/ai-chat/**"
                        ).permitAll()

                        // Nếu sau này có GET cho AI Chat thì cũng cho qua
                        .requestMatchers(HttpMethod.GET,
                                "/api/ai-chat/**"
                        ).permitAll()

                        // Các API còn lại cần đăng nhập
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtFilter,
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}