package com.pricehawl.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 404: resource domain không tồn tại
    @ExceptionHandler(NoDealsFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoDeals(NoDealsFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), "NO_DEALS_FOUND");
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), null);
    }

    // 404: không có handler cho path (ví dụ gõ sai URL)
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoHandler(NoHandlerFoundException ex) {
        log.warn("No handler found: {} {}", ex.getHttpMethod(), ex.getRequestURL());
        return build(HttpStatus.NOT_FOUND,
                "Không tìm thấy endpoint: " + ex.getHttpMethod() + " " + ex.getRequestURL(), null);
    }

    // 405: đúng path nhưng sai method (ví dụ DELETE nhưng controller chỉ có GET)
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("Method not supported: {} (supported={})", ex.getMethod(), ex.getSupportedHttpMethods());
        return build(HttpStatus.METHOD_NOT_ALLOWED,
                "HTTP method '" + ex.getMethod() + "' không được hỗ trợ tại endpoint này", null);
    }

    // 400: tham số URL/query sai kiểu (ví dụ UUID không hợp lệ)
    @ExceptionHandler({ IllegalArgumentException.class, MethodArgumentTypeMismatchException.class })
    public ResponseEntity<Map<String, Object>> handleBadRequest(Exception ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    // 400: @Valid body fail
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .reduce((a, b) -> a + ", " + b).orElse(ex.getMessage());
        return build(HttpStatus.BAD_REQUEST, msg, null);
    }

    // 409: vi phạm ràng buộc DB (FK/unique)
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.error("Data integrity violation", ex);
        String cause = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        return build(HttpStatus.CONFLICT, "Vi phạm ràng buộc dữ liệu: " + cause, null);
    }

    // 503: tính toán trending deals bị lỗi (NPE, dữ liệu bẩn, scoring fail...).
    // Tách khỏi fallback Exception để FE phân biệt "hệ thống đang cập nhật"
    // thay vì lỗi 500 chung chung.
    @ExceptionHandler(TrendingDealsComputationException.class)
    public ResponseEntity<Map<String, Object>> handleTrendingComputation(TrendingDealsComputationException ex) {
        log.error("Trending deals computation failed", ex);
        return build(
                HttpStatus.SERVICE_UNAVAILABLE,
                ex.getMessage() != null
                        ? ex.getMessage()
                        : "Hệ thống đang cập nhật dữ liệu trending, vui lòng thử lại sau.",
                "TRENDING_COMPUTATION_FAILED");
    }

    // Bảo toàn HTTP status mà controller đã chủ động set qua ResponseStatusException.
    // Nếu không tách riêng, ResponseStatusException (vd: 503) sẽ rơi xuống
    // handler Exception.class bên dưới và bị chuyển thành 500.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatusCode code = ex.getStatusCode();
        HttpStatus status = HttpStatus.resolve(code.value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        if (status.is5xxServerError()) {
            log.error("ResponseStatusException {}", code.value(), ex);
        } else {
            log.warn("ResponseStatusException {}: {}", code.value(), ex.getReason());
        }
        String message = ex.getReason() != null ? ex.getReason() : status.getReasonPhrase();
        return build(status, message, null);
    }

    // 500: fallback — log full stacktrace để debug
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        log.error("Unhandled exception ({})", ex.getClass().getName(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName(), null);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String message, String code) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", status.value());
        response.put("error", status.getReasonPhrase());
        response.put("message", message);
        if (code != null) response.put("code", code);
        return new ResponseEntity<>(response, status);
    }
}
