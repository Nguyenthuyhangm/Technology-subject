package com.pricehawl.controller;

import com.pricehawl.service.AccessTradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/admin/accesstrade")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AccessTradeController {

    private final AccessTradeService accessTradeService;

    /**
     * GET /api/admin/accesstrade/transactions
     * Lấy danh sách giao dịch từ AccessTrade
     *
     * Params:
     * - since: yyyy-MM-dd (default: 30 ngày trước)
     * - until: yyyy-MM-dd (default: hôm nay)
     * - merchant: tikivn | watsons (optional)
     * - status: 0=pending, 1=approved, 2=rejected (optional)
     */
    @GetMapping("/transactions")
    public ResponseEntity<Object> getTransactions(
        @RequestParam(required = false) String since,
        @RequestParam(required = false) String until,
        @RequestParam(required = false) String merchant,
        @RequestParam(required = false) Integer status
    ) {
        // Default: 30 ngày gần nhất
        if (since == null) {
            since = LocalDate.now().minusDays(30)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + "T00:00:00Z";
        } else {
            since = since + "T00:00:00Z";
        }

        if (until == null) {
            until = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + "T23:59:59Z";
        } else {
            until = until + "T23:59:59Z";
        }

        Object result = accessTradeService.getTransactions(since, until, merchant, status);
        return ResponseEntity.ok(result);
    }
}