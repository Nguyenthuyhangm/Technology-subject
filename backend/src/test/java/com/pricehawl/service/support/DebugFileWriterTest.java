package com.pricehawl.service.support;

import com.pricehawl.service.model.PriceRefreshResultDTO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class DebugFileWriterTest {

    @TempDir
    Path tempDir;

    private DebugFileWriter writerWithTempDir() {
        DebugFileWriter writer = new DebugFileWriter();
        ReflectionTestUtils.setField(writer, "debugDir", tempDir.toString());
        return writer;
    }

    private PriceRefreshResultDTO sampleResult() {
        PriceRefreshResultDTO result = new PriceRefreshResultDTO();
        result.setProductListingId(UUID.randomUUID());
        result.setProductId(UUID.randomUUID());
        result.setUrl("https://example.com/product");
        result.setPlatformName("cocolux");
        result.setWishlistPriority(true);
        result.setCrawlSuccess(true);
        result.setInsertedNewPriceRecord(true);
        result.setAction("INSERTED");
        result.setReason("Price changed");
        result.setOldPrice(120000);
        result.setNewPrice(99000);
        return result;
    }

    @Test
    void writeBatchShouldCreateJsonFileWhenResultsAreNotEmpty() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(List.of(sampleResult()), "price refresh test");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertTrue(Files.exists(todayDir));
        assertTrue(Files.isDirectory(todayDir));

        try (Stream<Path> files = Files.list(todayDir)) {
            Path jsonFile = files
                    .filter(path -> path.getFileName().toString().startsWith("price-refresh-test-"))
                    .filter(path -> path.getFileName().toString().endsWith(".json"))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError("Expected JSON debug file was not created"));

            String content = Files.readString(jsonFile);

            assertTrue(content.contains("https://example.com/product"));
            assertTrue(content.contains("cocolux"));
            assertTrue(content.contains("INSERTED"));
            assertTrue(content.contains("Price changed"));
        }
    }

    @Test
    void writeBatchShouldUseDefaultPrefixWhenPrefixIsNull() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(List.of(sampleResult()), null);

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertTrue(Files.exists(todayDir));

        try (Stream<Path> files = Files.list(todayDir)) {
            boolean exists = files.anyMatch(path ->
                    path.getFileName().toString().startsWith("price-refresh-")
                            && path.getFileName().toString().endsWith(".json")
            );

            assertTrue(exists);
        }
    }

    @Test
    void writeBatchShouldUseDefaultPrefixWhenPrefixIsBlank() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(List.of(sampleResult()), "   ");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertTrue(Files.exists(todayDir));

        try (Stream<Path> files = Files.list(todayDir)) {
            boolean exists = files.anyMatch(path ->
                    path.getFileName().toString().startsWith("price-refresh-")
                            && path.getFileName().toString().endsWith(".json")
            );

            assertTrue(exists);
        }
    }

    @Test
    void writeBatchShouldSanitizeUnsafePrefix() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(List.of(sampleResult()), "price refresh: test/value");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertTrue(Files.exists(todayDir));

        try (Stream<Path> files = Files.list(todayDir)) {
            boolean exists = files.anyMatch(path ->
                    path.getFileName().toString().startsWith("price-refresh-test-value-")
                            && path.getFileName().toString().endsWith(".json")
            );

            assertTrue(exists);
        }
    }

    @Test
    void writeBatchShouldNotCreateFileWhenResultsAreNull() {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(null, "empty-test");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertFalse(Files.exists(todayDir));
    }

    @Test
    void writeBatchShouldNotCreateFileWhenResultsAreEmpty() {
        DebugFileWriter writer = writerWithTempDir();

        writer.writeBatch(List.of(), "empty-test");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertFalse(Files.exists(todayDir));
    }

    @Test
    void appendOneShouldCreateNdjsonFile() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(sampleResult(), "single result");

        Path file = tempDir
                .resolve(LocalDate.now().toString())
                .resolve("single-result.ndjson");

        assertTrue(Files.exists(file));

        String content = Files.readString(file);

        assertTrue(content.contains("https://example.com/product"));
        assertTrue(content.contains("cocolux"));
        assertTrue(content.contains("INSERTED"));
    }

    @Test
    void appendOneShouldAppendMultipleJsonObjects() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(sampleResult(), "append-test");
        writer.appendOne(sampleResult(), "append-test");

        Path file = tempDir
                .resolve(LocalDate.now().toString())
                .resolve("append-test.ndjson");

        assertTrue(Files.exists(file));

        String content = Files.readString(file);

        assertEquals(2, countOccurrences(content, "\"action\" : \"INSERTED\""));
        assertEquals(2, countOccurrences(content, "\"platformName\" : \"cocolux\""));
    }

    @Test
    void appendOneShouldDoNothingWhenResultIsNull() {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(null, "null-test");

        Path todayDir = tempDir.resolve(LocalDate.now().toString());

        assertFalse(Files.exists(todayDir));
    }

    @Test
    void appendOneShouldUseDefaultPrefixWhenPrefixIsNull() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(sampleResult(), null);

        Path file = tempDir
                .resolve(LocalDate.now().toString())
                .resolve("price-refresh.ndjson");

        assertTrue(Files.exists(file));
    }

    @Test
    void appendOneShouldUseDefaultPrefixWhenPrefixIsBlank() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(sampleResult(), "   ");

        Path file = tempDir
                .resolve(LocalDate.now().toString())
                .resolve("price-refresh.ndjson");

        assertTrue(Files.exists(file));
    }

    @Test
    void appendOneShouldSanitizeUnsafePrefix() throws Exception {
        DebugFileWriter writer = writerWithTempDir();

        writer.appendOne(sampleResult(), "price refresh: test/value");

        Path file = tempDir
                .resolve(LocalDate.now().toString())
                .resolve("price-refresh-test-value.ndjson");

        assertTrue(Files.exists(file));
    }

    private int countOccurrences(String text, String keyword) {
        int count = 0;
        int index = 0;

        while ((index = text.indexOf(keyword, index)) != -1) {
            count++;
            index += keyword.length();
        }

        return count;
    }
}