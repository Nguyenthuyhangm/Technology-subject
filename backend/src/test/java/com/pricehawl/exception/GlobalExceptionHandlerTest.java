package com.pricehawl.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("1. Test NoDealsFoundException")
    void handleNoDeals() {
        NoDealsFoundException ex = new NoDealsFoundException("No deals");
        ResponseEntity<Map<String, Object>> response = handler.handleNoDeals(ex);
        
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("NO_DEALS_FOUND", response.getBody().get("code"));
    }

    @Test
    @DisplayName("2. Test ResourceNotFoundException")
    void handleResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Not found");
        ResponseEntity<Map<String, Object>> response = handler.handleResourceNotFound(ex);
        
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody().get("code"));
    }

    @Test
    @DisplayName("3. Test NoHandlerFoundException")
    void handleNoHandler() {
        NoHandlerFoundException ex = new NoHandlerFoundException("GET", "/api/test", new HttpHeaders());
        ResponseEntity<Map<String, Object>> response = handler.handleNoHandler(ex);
        
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertTrue(response.getBody().get("message").toString().contains("/api/test"));
    }

    @Test
    @DisplayName("4. Test HttpRequestMethodNotSupportedException")
    void handleMethodNotSupported() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");
        ResponseEntity<Map<String, Object>> response = handler.handleMethodNotSupported(ex);
        
        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertTrue(response.getBody().get("message").toString().contains("POST"));
    }

    @Test
    @DisplayName("5. Test BadRequest (IllegalArgument & MethodArgumentTypeMismatch)")
    void handleBadRequest() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid UUID");
        ResponseEntity<Map<String, Object>> response = handler.handleBadRequest(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    @DisplayName("6. Test MethodArgumentNotValidException - Phủ nhánh Stream/Mapping")
    void handleValidation() {
        // Mock BindingResult để lấy FieldErrors
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("object", "name", "must not be blank");
        
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));

        ResponseEntity<Map<String, Object>> response = handler.handleValidation(ex);
        
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("name: must not be blank", response.getBody().get("message"));
    }

    @Test
    @DisplayName("7. Test DataIntegrityViolationException - Phủ nhánh cause != null")
    void handleDataIntegrity() {
        DataIntegrityViolationException ex = mock(DataIntegrityViolationException.class);
        Throwable cause = new Throwable("FK constraint fail");
        
        when(ex.getMostSpecificCause()).thenReturn(cause);
        
        ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertTrue(response.getBody().get("message").toString().contains("FK constraint fail"));
    }

    @Test
    @DisplayName("8. Test TrendingDealsComputationException - Phủ nhánh message null/not null")
    void handleTrendingComputation() {
        // Case 1: Message not null
        ResponseEntity<Map<String, Object>> res1 = handler.handleTrendingComputation(new TrendingDealsComputationException("Fail 1"));
        assertEquals("Fail 1", res1.getBody().get("message"));

        // Case 2: Message null (Phủ nhánh ternary else)
        ResponseEntity<Map<String, Object>> res2 = handler.handleTrendingComputation(new TrendingDealsComputationException(null));
        assertTrue(res2.getBody().get("message").toString().contains("Hệ thống đang cập nhật"));
    }

    @Test
    @DisplayName("9. Test ResponseStatusException - Phủ toàn bộ logic rẽ nhánh")
    void handleResponseStatus() {
        // Case 1: 5xx error
        ResponseStatusException ex5xx = new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Down");
        ResponseEntity<Map<String, Object>> res1 = handler.handleResponseStatus(ex5xx);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, res1.getStatusCode());

        // Case 2: 4xx error (nhánh log.warn)
        ResponseStatusException ex4xx = new ResponseStatusException(HttpStatus.FORBIDDEN, "No access");
        ResponseEntity<Map<String, Object>> res2 = handler.handleResponseStatus(ex4xx);
        assertEquals(HttpStatus.FORBIDDEN, res2.getStatusCode());

        // Case 3: status null (giả lập mã HTTP lạ)
        ResponseStatusException exUnknown = mock(ResponseStatusException.class);
        when(exUnknown.getStatusCode()).thenReturn(HttpStatusCode.valueOf(999));
        ResponseEntity<Map<String, Object>> res3 = handler.handleResponseStatus(exUnknown);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, res3.getStatusCode());
    }

    @Test
    @DisplayName("10. Test Fallback Exception - Phủ nhánh message null")
    void handleGeneralException() {
        // Case message null
        Exception ex = new NullPointerException();
        ResponseEntity<Map<String, Object>> response = handler.handleGeneralException(ex);
        
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("NullPointerException", response.getBody().get("message"));
    }
    @Test
@DisplayName("10b. handleGeneralException - message không null -> dùng message trực tiếp")
void handleGeneralException_withMessage() {
    Exception ex = new IllegalStateException("chi tiết lỗi cụ thể");
    ResponseEntity<Map<String, Object>> response = handler.handleGeneralException(ex);

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertEquals("chi tiết lỗi cụ thể", response.getBody().get("message"));
}

@Test
@DisplayName("7b. handleDataIntegrity - getMostSpecificCause() trả null -> fallback message")
void handleDataIntegrity_nullCause() {
    DataIntegrityViolationException ex = mock(DataIntegrityViolationException.class);
    when(ex.getMostSpecificCause()).thenReturn(null);
    when(ex.getMessage()).thenReturn("Data integrity error");

    ResponseEntity<Map<String, Object>> response = handler.handleDataIntegrity(ex);
    assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
    assertNotNull(response.getBody().get("message"));
}

@Test
@DisplayName("6b. handleValidation - nhiều FieldError -> lambda joining được gọi đủ")
void handleValidation_multipleErrors() {
    MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
    BindingResult bindingResult = mock(BindingResult.class);

    // 2 lỗi để lambda collector/joiner chạy qua nhiều phần tử
    List<FieldError> errors = List.of(
        new FieldError("object", "email", "invalid format"),
        new FieldError("object", "name",  "must not be blank")
    );
    when(ex.getBindingResult()).thenReturn(bindingResult);
    when(bindingResult.getFieldErrors()).thenReturn(errors);

    ResponseEntity<Map<String, Object>> response = handler.handleValidation(ex);

    assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    String message = response.getBody().get("message").toString();
    assertTrue(message.contains("email: invalid format"));
    assertTrue(message.contains("name: must not be blank"));
}
}