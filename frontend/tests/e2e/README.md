# E2E Tests - PriceHawk

## Cấu trúc

```
tests/e2e/
├── integration/           # Integration tests với backend thật
│   ├── playwright.config.ts
│   ├── .env.test         # Credentials cho test user
│   ├── helpers/
│   │   ├── real-auth.ts  # Login helper thật qua UI
│   │   └── selectors.ts   # Selectors dựa trên UI thật
│   ├── pages/
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── SearchPage.ts
│   └── specs/
│       ├── auth.spec.ts
│       ├── navigation.spec.ts
│       └── search.spec.ts
│
├── mock-only/             # Mock tests (backend không cần)
│   ├── playwright.config.ts
│   └── api-mocks.ts
│
├── helpers/               # Common helpers
│   └── api-mocks.ts
│
├── pages/                 # Page Objects
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── SearchPage.ts
│
├── fixtures/
│   └── test-utils.ts
│
└── playwright.config.ts   # Default config
```

## Chạy Tests

### 1. Integration Tests (Cần Backend)

**Điều kiện tiên quyết:**
1. Docker Desktop đang chạy + Redis container
2. Backend chạy tại `http://localhost:8080`
3. Frontend chạy tại `http://localhost:5173`
4. Tài khoản test trong Supabase

**Setup:**
```bash
# 1. Sửa credentials trong .env.test
cd frontend
notepad tests/e2e/integration/.env.test

# 2. Chạy integration tests
npm run test:e2e:integration
# hoặc
npx playwright test -c tests/e2e/integration/playwright.config.ts
```

### 2. Default Tests (Mock - Không cần Backend)

```bash
npm run test:e2e
# hoặc với UI
npm run test:e2e:ui
```

## Nguyên Tắc Viết Test

### Integration Tests
1. **KHÔNG mock** các API chính (products, wishlist, alerts, notifications)
2. **Login thật** qua UI với Supabase auth
3. **Selectors dựa trên attributes**:
   - `input[name="email"]` thay vì hard-code text
   - `button[type="submit"]` thay vì `text=Submit`
4. **Test data từ .env**:
   - Credentials trong `E2E_TEST_EMAIL` và `E2E_TEST_PASSWORD`

### Mock Tests
1. Sử dụng `setupApiMocks()` và `mockApiRoute()`
2. Mock tất cả API calls để test UI không phụ thuộc backend

## Troubleshooting

### Lỗi "Cannot navigate to invalid URL"
- Kiểm tra `baseURL` trong playwright config
- Đảm bảo frontend server đang chạy tại localhost:5173

### Lỗi Login Tests Fail
- Kiểm tra credentials trong `.env.test`
- Đảm bảo Supabase auth đang hoạt động
- Kiểm tra network tab để xem error messages
