package com.pricehawl.service.integration;

import com.pricehawl.security.JwtAuthFilter;
import com.pricehawl.security.UserPrincipal;
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

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "spring.main.lazy-initialization=true",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=none"
})
class UserSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;

    @MockBean private JwtAuthFilter jwtAuthFilter; // Mock để bỏ qua bước verify chữ ký thật với Supabase

    @Test
    @DisplayName("1. Public API - Truy cập không cần Token (Nhuộm xanh permitAll)")
    void testPublicEndpoints_ShouldAllow() throws Exception {
        // Test API lấy danh sách sản phẩm (Public)
        mockMvc.perform(get("/api/products/trending")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
                
        // Test API Chat AI (Public POST)
        mockMvc.perform(post("/api/ai-chat/message")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"Hello\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("2. Private API - Không có Token phải bị chặn (401/403)")
    void testPrivateEndpoints_WithoutToken_ShouldDeny() throws Exception {
        // API Alert yêu cầu đăng nhập
        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("3. Authenticated User - Giả lập Token hợp lệ (Nhuộm xanh UserPrincipal)")
    void testPrivateEndpoints_WithValidUser_ShouldAllow() throws Exception {
        // Giả lập một User đã login vào SecurityContext
        UserPrincipal principal = new UserPrincipal("user-123", "test@uet.vnu.vn");
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Giờ gọi API Alert sẽ thành công (Status 200 thay vì 401)
        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
                
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("4. Error Path - Truy cập sai URL hoặc lỗi hệ thống")
    void testErrorPath_ShouldBePublic() throws Exception {
        // Đường dẫn /error thường phải public để Spring trả về lỗi JSON
        mockMvc.perform(get("/error"))
                .andExpect(status().is4xxClientError());
    }
}