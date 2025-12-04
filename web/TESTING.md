# Testing Guide

This document outlines the testing strategy, conventions, and best practices for the Reading Buddy application.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Overview

Reading Buddy uses a comprehensive testing strategy with multiple layers:

1. **Unit Tests** - Test individual functions and utilities
2. **Integration Tests** - Test server actions and API interactions
3. **E2E Tests** - Test full user workflows with Playwright

**Current Test Coverage**: ~72% overall

## Testing Stack

### Unit & Integration Testing

- **Framework**: [Vitest](https://vitest.dev/) v4.0.15
- **Component Testing**: [@testing-library/react](https://testing-library.com/react) v16.3.0
- **DOM Matchers**: [@testing-library/jest-dom](https://github.com/testing-library/jest-dom) v6.9.1
- **Test Environment**: [happy-dom](https://github.com/capricorn86/happy-dom) v20.0.10
- **Coverage**: [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html) v4.0.15

### E2E Testing

- **Framework**: [Playwright](https://playwright.dev/) v1.57.0
- **Browsers**: Chromium (configurable for Firefox, WebKit)

## Test Types

### 1. Unit Tests

**Location**: `src/__tests__/lib/`

Test individual functions and utilities in isolation.

**Example**:
```typescript
// src/__tests__/lib/rate-limit.test.ts
import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("should allow requests within limit", async () => {
    const result = await rateLimit("test-user", "standardApi");
    expect(result.success).toBe(true);
  });
});
```

**Coverage Areas**:
- ✅ Rate limiting utilities (82% coverage)
- ✅ Auth role checking (100% coverage)
- ✅ File type detection (80% coverage)
- ✅ MinIO utilities (68% coverage)
- ✅ PDF extraction (58% coverage)

### 2. Integration Tests

**Location**: `src/__tests__/`

Test server actions, API routes, and database interactions.

**Example**:
```typescript
// src/__tests__/actions/book-upload.test.ts
import { describe, it, expect, vi } from "vitest";
import { uploadBook } from "@/app/(dashboard)/dashboard/librarian/actions";

describe("uploadBook", () => {
  it("should validate file format", async () => {
    // Test implementation
  });
});
```

**TODO**: Add comprehensive server action tests for:
- Book upload workflow
- Quiz generation
- Checkpoint management
- Class management

### 3. E2E Tests

**Location**: `e2e/`

Test complete user workflows using real browsers.

**Example**:
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('should show login page', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});
```

**Coverage Areas**:
- ✅ Homepage navigation
- ✅ Authentication flows
- ✅ Dashboard access control
- TODO: Authenticated user workflows
- TODO: Book management
- TODO: Quiz taking

## Running Tests

### Unit & Integration Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/lib/rate-limit.test.ts
```

### E2E Tests

```bash
# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# View last test report
npm run test:e2e:report

# Run specific E2E test
npx playwright test e2e/auth.spec.ts
```

### Run All Tests

```bash
# Run unit + E2E tests
npm run test:all
```

## Writing Tests

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { functionToTest } from "@/lib/module";

describe("functionToTest", () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it("should do something specific", () => {
    const result = functionToTest(input);
    expect(result).toBe(expected);
  });

  it("should handle error case", () => {
    expect(() => functionToTest(badInput)).toThrow("Error message");
  });
});
```

### Mocking

#### Mock External Dependencies

```typescript
vi.mock("@/lib/minio", () => ({
  getMinioClient: vi.fn(() => mockMinioClient),
  getMinioBucketName: vi.fn(() => "test-bucket"),
}));
```

#### Mock Next.js Navigation

```typescript
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT: ${url}`);
  }),
}));
```

#### Mock Supabase Client

```typescript
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => mockSupabaseClient),
}));
```

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform user action', async ({ page }) => {
    // Navigate to page
    await page.goto('/path');
    
    // Interact with elements
    await page.getByRole('button', { name: /submit/i }).click();
    
    // Assert results
    await expect(page.getByText(/success/i)).toBeVisible();
  });
});
```

### Component Testing (React)

```typescript
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { MyComponent } from '@/components/MyComponent';

it('should render component', () => {
  render(<MyComponent />);
  expect(screen.getByText(/expected text/i)).toBeInTheDocument();
});
```

## Best Practices

### General

1. **Test Naming**: Use descriptive test names that explain what's being tested
   - ✅ `should redirect to login when user not authenticated`
   - ❌ `test auth`

2. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   it("should calculate total", () => {
     // Arrange
     const items = [1, 2, 3];
     
     // Act
     const result = calculateTotal(items);
     
     // Assert
     expect(result).toBe(6);
   });
   ```

3. **One Assertion Per Test**: Focus each test on a single behavior
   - Exception: Related assertions (e.g., status code + response body)

4. **Avoid Test Interdependence**: Each test should run independently

5. **Use Descriptive Variables**: Make test intent clear
   ```typescript
   const unauthorizedUser = { role: "STUDENT" };
   const adminUser = { role: "ADMIN" };
   ```

### Unit Tests

1. **Mock External Dependencies**: Isolate the unit under test
2. **Test Edge Cases**: Empty arrays, null values, boundary conditions
3. **Test Error Handling**: Ensure errors are handled correctly
4. **Keep Tests Fast**: Unit tests should run in milliseconds

### E2E Tests

1. **Use Semantic Selectors**: Prefer `getByRole`, `getByLabel` over CSS selectors
   - ✅ `page.getByRole('button', { name: /submit/i })`
   - ❌ `page.locator('.submit-btn')`

2. **Wait for Elements**: Use Playwright's auto-waiting features
   ```typescript
   await expect(page.getByText(/success/i)).toBeVisible();
   ```

3. **Use Page Object Model**: For complex workflows
   ```typescript
   class LoginPage {
     constructor(private page: Page) {}
     async login(email: string, password: string) {
       await this.page.getByLabel(/email/i).fill(email);
       await this.page.getByLabel(/password/i).fill(password);
       await this.page.getByRole('button', { name: /login/i }).click();
     }
   }
   ```

4. **Test Critical Paths**: Focus on user journeys that must work
5. **Keep Tests Isolated**: Clean up after each test

### Coverage Goals

- **Overall**: 80%+ coverage
- **Critical Paths**: 100% coverage (auth, payments, data loss)
- **Utils**: 90%+ coverage
- **UI Components**: 70%+ coverage

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

### Pre-commit Hooks

Consider adding with [husky](https://typicode.github.io/husky/):

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Test File Organization

```
web/
├── src/
│   ├── __tests__/              # Unit & integration tests
│   │   ├── lib/                # Library utilities
│   │   │   ├── rate-limit.test.ts
│   │   │   ├── auth/
│   │   │   │   └── roleCheck.test.ts
│   │   │   └── pdf-extractor.test.ts
│   │   └── actions/            # Server action tests (TODO)
│   │       └── book-upload.test.ts
│   └── components/             # Components can have co-located tests
│       └── Button.test.tsx     # (if preferred)
├── e2e/                        # E2E tests
│   ├── homepage.spec.ts
│   ├── auth.spec.ts
│   └── dashboard.spec.ts
├── vitest.config.ts            # Vitest configuration
├── vitest.setup.ts             # Test setup file
└── playwright.config.ts        # Playwright configuration
```

## Common Testing Patterns

### Testing Async Functions

```typescript
it("should fetch data", async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

### Testing Errors

```typescript
it("should throw on invalid input", () => {
  expect(() => validateInput(null)).toThrow("Invalid input");
});

it("should reject promise on error", async () => {
  await expect(asyncFunction()).rejects.toThrow("Error message");
});
```

### Testing with Timers

```typescript
import { vi } from "vitest";

it("should call function after delay", () => {
  vi.useFakeTimers();
  
  const callback = vi.fn();
  setTimeout(callback, 1000);
  
  vi.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

## Contributing

When adding new features:

1. Write tests first (TDD) or alongside implementation
2. Ensure tests pass locally before pushing
3. Maintain or improve code coverage
4. Update this guide if introducing new patterns

---

**Last Updated**: 2025-12-04
**Test Coverage**: 72.41% (Unit), E2E setup complete
