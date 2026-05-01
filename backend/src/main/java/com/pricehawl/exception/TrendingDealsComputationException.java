package com.pricehawl.exception;

/**
 * Ném ra khi quá trình tính toán snapshot Trending Deals bị lỗi
 * (NPE do dữ liệu bẩn, lỗi scoring, lỗi ánh xạ response, ...).
 *
 * Được GlobalExceptionHandler map sang HTTP 503 (Service Unavailable)
 * với mã lỗi TRENDING_COMPUTATION_FAILED, thay vì 500 chung chung,
 * để frontend nhận biết cụ thể "hệ thống đang cập nhật" và xử lý
 * (xoá cache cũ) tương ứng.
 */
public class TrendingDealsComputationException extends RuntimeException {

    public TrendingDealsComputationException(String message) {
        super(message);
    }

    public TrendingDealsComputationException(String message, Throwable cause) {
        super(message, cause);
    }
}
