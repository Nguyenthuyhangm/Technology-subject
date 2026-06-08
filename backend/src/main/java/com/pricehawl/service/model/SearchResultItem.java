package com.pricehawl.service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả search từ 1 sàn thương mại.
 *
 * INPUT:  Parse từ HTTP response JSON/HTML của search API từng sàn
 *         (do OnDemandSearchService tạo ra)
 *
 * OUTPUT: Đưa vào OnDemandMatchService để tính similarity score,
 *         sau đó đưa vào OnDemandImportService để import DB.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultItem {

    /** "hasaki" | "tiki" | "guardian" | "cocolux" | "watsons" */
    private String platform;

    /** Tên sản phẩm trên sàn đó */
    private String name;

    /** URL trang chi tiết sản phẩm */
    private String url;

    /** Giá hiện tại (VND) — null nếu không parse được */
    private Integer price;

    /** Giá gốc trước khuyến mãi — nullable */
    private Integer originalPrice;

    /** URL ảnh thumbnail — nullable */
    private String imageUrl;

    /** Tên brand — nullable, dùng để hỗ trợ matching */
    private String brand;

    /**
     * Similarity score so với tên sản phẩm gốc (0.0 – 1.0).
     * Được set bởi OnDemandMatchService sau khi tính Jaro-Winkler.
     * Default 0.0 khi mới tạo.
     */
    @Builder.Default
    private double similarityScore = 0.0;
}