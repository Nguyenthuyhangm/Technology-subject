package com.pricehawl.config;

import com.pricehawl.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

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