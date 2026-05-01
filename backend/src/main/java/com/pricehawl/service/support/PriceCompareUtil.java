package com.pricehawl.service.support;

import com.pricehawl.service.model.PriceSnapshotDTO;
import com.pricehawl.entity.PriceRecord;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Utility dùng để so sánh snapshot giá mới với PriceRecord gần nhất trong DB.
 *
 * Mục tiêu:
 * - tách logic compare ra khỏi service
 * - dễ test
 * - tránh lặp code ở nhiều chỗ
 */
public final class PriceCompareUtil {

    private PriceCompareUtil() {
        // utility class
    }

    /**
     * So sánh giá hiện tại có đổi không.
     */
    public static boolean hasPriceChanged(PriceRecord latestRecord, PriceSnapshotDTO snapshot) {
        if (latestRecord == null || snapshot == null) {
            return true;
        }
        return !Objects.equals(latestRecord.getPrice(), snapshot.getPrice());
    }

    /**
     * So sánh giá gốc có đổi không.
     */
    public static boolean hasOriginalPriceChanged(PriceRecord latestRecord, PriceSnapshotDTO snapshot) {
        if (latestRecord == null || snapshot == null) {
            return true;
        }
        return !Objects.equals(latestRecord.getOriginalPrice(), snapshot.getOriginalPrice());
    }

    /**
     * So sánh trạng thái in-stock có đổi không.
     */
    public static boolean hasStockChanged(PriceRecord latestRecord, PriceSnapshotDTO snapshot) {
        if (latestRecord == null || snapshot == null) {
            return true;
        }
        return !Objects.equals(latestRecord.getInStock(), snapshot.getInStock());
    }

    /**
     * So sánh discount có đổi không.
     * Không bắt buộc dùng để quyết định insert, nhưng để debug/log thì hữu ích.
     */
    public static boolean hasDiscountChanged(PriceRecord latestRecord, PriceSnapshotDTO snapshot) {
        if (latestRecord == null || snapshot == null) {
            return true;
        }
        return !Objects.equals(latestRecord.getDiscountPct(), snapshot.getDiscountPct());
    }

    /**
     * Kiểm tra snapshot gần nhất đã "quá cũ" chưa.
     *
     * Ví dụ:
     * - keepAliveHours = 24
     * - nếu record cũ hơn 24h thì có thể insert 1 snapshot mới dù giá không đổi
     *   để giữ time-series không bị quá thưa.
     */
    public static boolean isSnapshotOlderThan(PriceRecord latestRecord, long keepAliveHours) {
        if (latestRecord == null) {
            return true;
        }

        LocalDateTime crawledAt = latestRecord.getCrawledAt();
        if (crawledAt == null) {
            return true;
        }

        Duration age = Duration.between(crawledAt, LocalDateTime.now());
        return age.toHours() >= keepAliveHours;
    }

    /**
     * Rule tổng hợp: có nên insert PriceRecord mới không.
     *
     * Insert nếu:
     * - chưa có record cũ
     * - hoặc giá đổi
     * - hoặc giá gốc đổi
     * - hoặc stock đổi
     * - hoặc snapshot cũ quá lâu (keepAliveHours)
     */
    public static boolean shouldInsertNewRecord(
            PriceRecord latestRecord,
            PriceSnapshotDTO snapshot,
            long keepAliveHours
    ) {
        if (snapshot == null) {
            return false;
        }

        if (latestRecord == null) {
            return true;
        }

        if (hasPriceChanged(latestRecord, snapshot)) {
            return true;
        }

        if (hasOriginalPriceChanged(latestRecord, snapshot)) {
            return true;
        }

        if (hasStockChanged(latestRecord, snapshot)) {
            return true;
        }

        return isSnapshotOlderThan(latestRecord, keepAliveHours);
    }

    /**
     * Trả về lý do chính để insert.
     * Dùng cho debug/log.
     */
    public static String buildInsertReason(
            PriceRecord latestRecord,
            PriceSnapshotDTO snapshot,
            long keepAliveHours
    ) {
        if (snapshot == null) {
            return "SKIP_INVALID_SNAPSHOT";
        }

        if (latestRecord == null) {
            return "INSERT_FIRST_SNAPSHOT";
        }

        if (hasPriceChanged(latestRecord, snapshot)) {
            return "INSERT_PRICE_CHANGED";
        }

        if (hasOriginalPriceChanged(latestRecord, snapshot)) {
            return "INSERT_ORIGINAL_PRICE_CHANGED";
        }

        if (hasStockChanged(latestRecord, snapshot)) {
            return "INSERT_STOCK_CHANGED";
        }

        if (isSnapshotOlderThan(latestRecord, keepAliveHours)) {
            return "INSERT_KEEPALIVE_SNAPSHOT";
        }

        return "SKIP_NO_MEANINGFUL_CHANGE";
    }

    /**
     * Trả về lý do skip.
     * Dùng cho debug/log.
     */
    public static String buildSkipReason(
            PriceRecord latestRecord,
            PriceSnapshotDTO snapshot,
            long keepAliveHours
    ) {
        if (snapshot == null) {
            return "SKIP_INVALID_SNAPSHOT";
        }

        if (latestRecord == null) {
            return "NO_SKIP_FIRST_SNAPSHOT_SHOULD_INSERT";
        }

        if (hasPriceChanged(latestRecord, snapshot)) {
            return "NO_SKIP_PRICE_CHANGED_SHOULD_INSERT";
        }

        if (hasOriginalPriceChanged(latestRecord, snapshot)) {
            return "NO_SKIP_ORIGINAL_PRICE_CHANGED_SHOULD_INSERT";
        }

        if (hasStockChanged(latestRecord, snapshot)) {
            return "NO_SKIP_STOCK_CHANGED_SHOULD_INSERT";
        }

        if (isSnapshotOlderThan(latestRecord, keepAliveHours)) {
            return "NO_SKIP_KEEPALIVE_SHOULD_INSERT";
        }

        return "SKIP_NO_MEANINGFUL_CHANGE";
    }
}