package com.pricehawl.service.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO đại diện cho 1 on-demand crawl job.
 * KHÔNG phải JPA entity — chỉ dùng để serialize/deserialize vào Redis.
 *
 * Lưu trong Redis với key: "crawl_job:{jobId}", TTL 30 phút.
 * Extension polling GET /api/crawl/jobs/{jobId} để đọc DTO này.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OnDemandCrawlJobDTO {

    /** UUID string — primary key của job, trả về cho extension ngay sau trigger */
    private String jobId;

    /** UUID string của user đang đăng nhập — null nếu chưa login */
    private String userId;

    /** Tên sản phẩm gốc lấy từ extension (đã normalize) */
    private String productName;

    /** Platform đang xem: "shopee", "lazada", "tiki", ... */
    private String sourcePlatform;

    /** URL trang sản phẩm gốc */
    private String sourceUrl;

    /**
     * Trạng thái job:
     * - PENDING  : vừa tạo, chưa bắt đầu xử lý
     * - RUNNING  : đang crawl các sàn
     * - DONE     : thành công, productId đã có
     * - FAILED   : thất bại, xem errorMessage
     */
    private String status;

    /** UUID string của product vừa import — null cho đến khi status=DONE */
    private String productId;

    /** Mô tả lỗi nếu status=FAILED */
    private String errorMessage;

    /** ISO-8601 timestamp lúc tạo job */
    private String triggeredAt;

    /** ISO-8601 timestamp lúc kết thúc — null nếu chưa xong */
    private String finishedAt;

    /**
     * Số sàn đã tìm thấy kết quả — dùng để hiện UI "Đã tìm thấy trên X sàn".
     * Được update trong lúc RUNNING.
     */
    @Builder.Default
    private int platformsFound = 0;
}