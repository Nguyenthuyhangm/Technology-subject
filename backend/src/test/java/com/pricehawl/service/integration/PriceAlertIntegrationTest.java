package com.pricehawl.service.integration;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.pricehawl.dto.PriceAlertRequest;
import com.pricehawl.entity.PriceAlert;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.User;
import com.pricehawl.repository.PriceAlertRepository;
import com.pricehawl.repository.ProductRepository;
import com.pricehawl.repository.UserRepository;
import com.pricehawl.security.JwtAuthFilter;
import com.pricehawl.security.UserPrincipal;
import com.pricehawl.service.AlertQueuePublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
    "spring.main.lazy-initialization=true",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=none",
    "pricehawk.scheduler.price-refresh.enabled=false"
})
class PriceAlertIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PriceAlertRepository alertRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;

    @MockBean private JwtAuthFilter jwtAuthFilter;
    @MockBean private AlertQueuePublisher alertQueuePublisher;

    private UUID testUserId;
    private UUID testProductId;
    private UserPrincipal principal;

    @BeforeEach
    void setUp() {
        testUserId = UUID.randomUUID();
        testProductId = UUID.randomUUID();

        userRepository.save(User.builder().id(testUserId).email("student@uet.vnu.vn").plan("free").build());
        productRepository.save(Product.builder().id(testProductId).name("Serum Sakura").build());

        principal = new UserPrincipal(testUserId.toString(), "student@uet.vnu.vn");
    }

    private RequestPostProcessor authenticatedUser() {
        return request -> {
            SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of())
            );
            return request;
        };
    }

    @Test
    @DisplayName("1. Tạo mới Alert - Phủ nhánh Create")
    void testCreateAlert() throws Exception {
        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(testProductId);
        req.setTargetPrice(50000);

        mockMvc.perform(post("/api/alerts").with(authenticatedUser())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());

        assertTrue(alertRepository.findByUserIdAndProductId(testUserId, testProductId).isPresent());
    }

    @Test
    @DisplayName("2. Cập nhật Alert cũ - Phủ nhánh Upsert/Update")
    void testUpdateExistingAlert() throws Exception {
        // Tạo sẵn một cái
        testCreateAlert();

        // Gửi request trùng productId nhưng giá khác
        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(testProductId);
        req.setTargetPrice(45000);

        mockMvc.perform(post("/api/alerts").with(authenticatedUser())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetPrice").value(45000));
    }

    @Test
    @DisplayName("3. Chặn tạo quá 5 alert - Phủ nhánh Exception Handling")
    void testLimitExceeded() throws Exception {
        for (int i = 0; i < 5; i++) {
            alertRepository.save(PriceAlert.builder().userId(testUserId).productId(UUID.randomUUID()).targetPrice(1000).isActive(true).build());
        }

        PriceAlertRequest req = new PriceAlertRequest();
        req.setProductId(testProductId);
        req.setTargetPrice(50000);

        mockMvc.perform(post("/api/alerts").with(authenticatedUser())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isInternalServerError()); // Do ném IllegalStateException
    }

    @Test
    @DisplayName("4. Toggle trạng thái Active - Phủ nhánh Logic Bật/Tắt")
    void testToggleAlert() throws Exception {
        PriceAlert alert = alertRepository.save(PriceAlert.builder().userId(testUserId).productId(testProductId).targetPrice(1000).isActive(true).build());

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/toggle").with(authenticatedUser()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));
    }

    @Test
    @DisplayName("5. Cập nhật giá mục tiêu - Phủ nhánh Patch Update")
    void testUpdatePriceOnly() throws Exception {
        PriceAlert alert = alertRepository.save(PriceAlert.builder().userId(testUserId).productId(testProductId).targetPrice(1000).build());

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/price")
                .with(authenticatedUser())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("targetPrice", 88000))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetPrice").value(88000));
    }

    @Test
    @DisplayName("6. Xóa Alert - Phủ nhánh Delete")
    void testDeleteAlert() throws Exception {
        PriceAlert alert = alertRepository.save(PriceAlert.builder().userId(testUserId).productId(testProductId).targetPrice(1000).build());

        mockMvc.perform(delete("/api/alerts/" + alert.getId()).with(authenticatedUser()))
                .andExpect(status().isNoContent());

        assertFalse(alertRepository.findById(alert.getId()).isPresent());
    }
}