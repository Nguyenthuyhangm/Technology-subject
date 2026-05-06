package com.pricehawl.service.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.pricehawl.service.model.PriceRefreshResultDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Ghi debug file cho auto price refresh.
 *
 * Mục tiêu:
 * - lưu lại listing nào đã crawl
 * - kết quả insert/skip/fail
 * - dễ đối chiếu khi test
 */
@Component
public class DebugFileWriter {

    private static final Logger log = LoggerFactory.getLogger(DebugFileWriter.class);

    private final ObjectMapper objectMapper;

    @Value("${pricehawk.debug.price-refresh-dir:debug/price-refresh}")
    private String debugDir;

    public DebugFileWriter() {
        this.objectMapper = new ObjectMapper()
                .findAndRegisterModules()
                .enable(SerializationFeature.INDENT_OUTPUT);
    }

    /**
     * Ghi toàn bộ batch kết quả của 1 lần refresh vào 1 file JSON.
     */
    public void writeBatch(List<PriceRefreshResultDTO> results, String prefix) {
        if (results == null || results.isEmpty()) {
            log.info("DebugFileWriter: no results to write for prefix={}", prefix);
            return;
        }

        try {
            Path dir = Path.of(debugDir, LocalDate.now().toString());
            Files.createDirectories(dir);

            String timestamp = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));

            String safePrefix = sanitize(prefix);
            Path file = dir.resolve(safePrefix + "-" + timestamp + ".json");

            String json = objectMapper.writeValueAsString(results);
            Files.writeString(
                    file,
                    json,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING
            );

            log.info("DebugFileWriter: wrote debug batch file {}", file.toAbsolutePath());
        } catch (IOException e) {
            log.error("DebugFileWriter: failed to write batch debug file", e);
        }
    }

    /**
     * Ghi 1 kết quả đơn lẻ vào file NDJSON (mỗi dòng 1 JSON).
     * Dùng được nếu sau này bạn muốn append từng listing.
     */
    public void appendOne(PriceRefreshResultDTO result, String prefix) {
        if (result == null) {
            return;
        }

        try {
            Path dir = Path.of(debugDir, LocalDate.now().toString());
            Files.createDirectories(dir);

            String safePrefix = sanitize(prefix);
            Path file = dir.resolve(safePrefix + ".ndjson");

            String jsonLine = objectMapper.writeValueAsString(result) + System.lineSeparator();

            Files.writeString(
                    file,
                    jsonLine,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.APPEND
            );

        } catch (IOException e) {
            log.error("DebugFileWriter: failed to append single debug result", e);
        }
    }

    private String sanitize(String input) {
        if (input == null || input.isBlank()) {
            return "price-refresh";
        }
        return input.replaceAll("[^a-zA-Z0-9-_]+", "-");
    }
}