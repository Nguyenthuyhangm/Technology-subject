package com.pricehawl.service;

import com.pricehawl.document.ProductDocument;
import com.pricehawl.entity.Product;
import com.pricehawl.entity.Brand;
import com.pricehawl.entity.Category;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ProductMapperTest {

    @Test
    void mapToDocument_ShouldMapCorrectFields() {
        // --- 1. Given: Chuẩn bị dữ liệu mẫu ---
        UUID productId = UUID.randomUUID();

        // Khởi tạo Brand (Dùng new để an toàn nếu chưa cấu hình xong Lombok Builder)
        Brand brand = new Brand();
        brand.setName("Laroche Posay");

        // Khởi tạo Category
        Category category = new Category();
        category.setName("Serum");

        // Khởi tạo Product sử dụng Builder (Vì file Product em gửi đã có @Builder)
        Product product = Product.builder()
                .id(productId)
                .name("Serum Vitamin C")
                .brand(brand)    // Đã có biến brand ở trên
                .category(category)
                .build();

        // --- 2. When: Thực hiện logic Mapping ---
        // Đoạn này mô phỏng lại logic chuyển đổi từ Entity sang Document (Elasticsearch)
        ProductDocument doc = ProductDocument.builder()
                .id(product.getId().toString())
                .name(product.getName())
                .brandName(product.getBrand().getName())
                .categoryName(product.getCategory().getName())
                .build();

        // --- 3. Then: Kiểm tra kết quả ---
        assertNotNull(doc);
        assertEquals(productId.toString(), doc.getId());
        assertEquals("Serum Vitamin C", doc.getName());
        assertEquals("Laroche Posay", doc.getBrandName());
        assertEquals("Serum", doc.getCategoryName());
    }
}