package com.pricehawl.service.crawler;

import com.pricehawl.service.model.PriceSnapshotDTO;

/**
 * Interface chung cho tất cả platform crawler.
 *
 * Mỗi platform implement interface này và trả về PriceSnapshotDTO chuẩn.
 * MultiPlatformPriceRefreshService chỉ cần biết interface này.
 */
public interface PlatformPriceCrawler {

    /**
     * Tên platform khớp với platform_name trong DB (lowercase).
     * Ví dụ: "hasaki", "cocolux", "tiki", "watsons", "guardian"
     */
    String platformName();

    /**
     * Crawl giá hiện tại từ URL sản phẩm.
     *
     * @param productUrl URL trang sản phẩm trên platform
     * @return PriceSnapshotDTO chứa giá mới nhất
     * @throws Exception nếu crawl thất bại
     */
    PriceSnapshotDTO crawl(String productUrl) throws Exception;
}