# Integration Tests

## Overview

End-to-end integration tests using Playwright with real Supabase authentication. These tests validate the complete user flows including login, navigation, and search functionality.

## Structure

```
tests/e2e/integration/
├── helpers/
│   ├── real-auth.ts      # Real Supabase authentication helpers
│   └── selectors.ts      # Stable DOM selectors for UI elements
├── specs/
│   ├── auth.spec.ts      # Authentication tests (login, logout)
│   ├── navigation.spec.ts # Navigation tests
│   └── search.spec.ts   # Search functionality tests
├── fixtures/
│   └── test-utils.ts     # Test utilities
├── playwright.config.ts # Playwright configuration
└── README.md           # This file
```

## Prerequisites

1. **Frontend server running** at `http://localhost:5173`
2. **Backend API** at `http://localhost:8080`
3. **Supabase project** with valid credentials

## Setup

### 1. Configure Test Credentials

Create `tests/e2e/integration/.env` (gitignored):

```env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=your-test-email@example.com
TEST_USER_PASSWORD=your-test-password
```

### 2. Update Test User

Edit `helpers/real-auth.ts`:

```typescript
export const TEST_USERS = {
  default: {
    email: "your-email@example.com",
    password: "your-password",
  },
} as const;
```

## Running Tests

### Run all integration tests

```bash
npx playwright test -c tests/e2e/integration/playwright.config.ts
```

### Run specific test file

```bash
npx playwright test -c tests/e2e/integration/playwright.config.ts auth.spec.ts
```

### Run with UI (headed mode)

```bash
npx playwright test -c tests/e2e/integration/playwright.config.ts --ui
```

### Run in CI mode

```bash
CI=true npx playwright test -c tests/e2e/integration/playwright.config.ts
```

## Test Cases

### Authentication (`auth.spec.ts`)

| Test | Description |
|------|-------------|
| 01 | Login page loads correctly |
| 02 | Invalid credentials shows error |
| 03 | Successful login with real account |
| 04 | User stays logged in after reload |

### Navigation (`navigation.spec.ts`)

| Test | Description |
|------|-------------|
| 01 | Unauthenticated user sees login button |
| 02 | Can navigate to Search page |
| 03 | Can navigate to Deals page |

### Search (`search.spec.ts`)

| Test | Description |
|------|-------------|
| 01 | Search page loads with input field |
| 02 | Search updates URL with query param |
| 03 | Shows results or empty state |

## Output & Reports

### Test Results

- **Location**: `frontend/test-results/integration/`
- **Contents**: Screenshots, videos, traces on failure

### HTML Report

- **Location**: `frontend/playwright-report/integration/`
- **Open**: `npx playwright show-report`

## Configuration Notes

- **Workers**: Set to 1 to avoid race conditions with real auth
- **Retries**: 2 in CI, 0 locally
- **Browser**: Chromium only (configured in `playwright.config.ts`)

## Troubleshooting

### Login timeout

If login tests timeout, check:
1. Supabase credentials are correct
2. Frontend can reach Supabase
3. Network connectivity

### Test isolation

Each test clears `localStorage` and `sessionStorage` in `beforeEach` to ensure clean state.

### Debug mode

```bash
DEBUG=pw:browser npx playwright test -c tests/e2e/integration/playwright.config.ts
```

## Adding New Tests

1. Add test file to `specs/`
2. Import required helpers:

```typescript
import { test, expect } from "@playwright/test";
import { loginAsUser, TEST_USERS } from "../helpers/real-auth";
import { SELECTORS } from "../helpers/selectors";
```

3. Use `loginAsUser()` for authenticated tests:

```typescript
test.beforeEach(async ({ page }) => {
  const success = await loginAsUser(page, email, password);
  if (!success) test.skip(true, "Login required");
});
```

## CI Integration

For GitHub Actions or other CI:

```yaml
- name: Run Integration Tests
  run: |
    cd frontend
    npm ci
    npx playwright install chromium
    CI=true npx playwright test -c tests/e2e/integration/playwright.config.ts
```
