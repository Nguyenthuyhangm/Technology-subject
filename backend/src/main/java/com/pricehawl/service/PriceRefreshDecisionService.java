package com.pricehawl.service;

import com.pricehawl.service.model.PriceRefreshJobDTO;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import com.pricehawl.service.model.PriceSnapshotDTO;
import com.pricehawl.service.support.PriceCompareUtil;
import com.pricehawl.entity.PriceRecord;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Service quyết định:
 * - có nên insert PriceRecord mới hay không
 * - action là INSERTED hay SKIPPED
 * - reason là gì
 *
 * Service này KHÔNG ghi DB.
 * Nó chỉ đưa ra quyết định business.
 */
@Service
public class PriceRefreshDecisionService {

    /**
     * Keep-alive snapshot:
     * Nếu quá 24h chưa có snapshot mới thì vẫn insert 1 record,
     * ngay cả khi giá không đổi.
     *
     * Mục đích:
     * - không để time-series quá thưa
     * - vẫn có "dấu mốc" hệ thống đã kiểm tra giá
     */
    private static final long KEEP_ALIVE_HOURS = 24L;

    /**
     * Quyết định insert hay skip, đồng thời build kết quả debug/log.
     */
    public PriceRefreshResultDTO decide(
            PriceRefreshJobDTO job,
            PriceSnapshotDTO snapshot,
            PriceRecord latestRecord
    ) {
        PriceRefreshResultDTO result = new PriceRefreshResultDTO();

        // ===== Thông tin job =====
        if (job != null) {
            result.setProductListingId(job.getProductListingId());
            result.setProductId(job.getProductId());
            result.setUrl(job.getUrl());
            result.setPlatformName(job.getPlatformName());
            result.setWishlistPriority(job.isWishlistPriority());
        }

        result.setProcessedAt(LocalDateTime.now());

        // ===== Nếu snapshot lỗi/null thì fail ngay =====
        if (snapshot == null) {
            result.setCrawlSuccess(false);
            result.setInsertedNewPriceRecord(false);
            result.setAction("FAILED");
            result.setReason("SNAPSHOT_NULL");
            result.setErrorMessage("Crawler trả về snapshot null");
            return result;
        }

        result.setCrawlSuccess(true);

        // ===== Đổ dữ liệu cũ vào result để debug =====
        if (latestRecord != null) {
            result.setOldPrice(latestRecord.getPrice());
            result.setOldOriginalPrice(latestRecord.getOriginalPrice());
            result.setOldInStock(latestRecord.getInStock());
        }

        // ===== Đổ dữ liệu mới vào result để debug =====
        result.setNewPrice(snapshot.getPrice());
        result.setNewOriginalPrice(snapshot.getOriginalPrice());
        result.setNewInStock(snapshot.getInStock());

        // ===== Rule business =====
        boolean shouldInsert = PriceCompareUtil.shouldInsertNewRecord(
                latestRecord,
                snapshot,
                KEEP_ALIVE_HOURS
        );

        if (shouldInsert) {
            result.setInsertedNewPriceRecord(true);
            result.setAction("INSERTED");
            result.setReason(
                    PriceCompareUtil.buildInsertReason(latestRecord, snapshot, KEEP_ALIVE_HOURS)
            );
        } else {
            result.setInsertedNewPriceRecord(false);
            result.setAction("SKIPPED");
            result.setReason(
                    PriceCompareUtil.buildSkipReason(latestRecord, snapshot, KEEP_ALIVE_HOURS)
            );
        }

        return result;
    }

    /**
     * Helper đơn giản nếu chỗ khác chỉ muốn biết true/false.
     */
    public boolean shouldInsert(
            PriceSnapshotDTO snapshot,
            PriceRecord latestRecord
    ) {
        return PriceCompareUtil.shouldInsertNewRecord(
                latestRecord,
                snapshot,
                KEEP_ALIVE_HOURS
        );
    }
}