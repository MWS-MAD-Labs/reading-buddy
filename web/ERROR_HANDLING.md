# Error Handling in Reading Buddy

This document explains the error handling strategy implemented in the Reading Buddy application.

## Error Boundaries

Reading Buddy uses Next.js 15's error handling features to provide user-friendly error messages in production.

### File Structure

```
web/src/app/
├── global-error.tsx       # Root-level error boundary (critical errors)
├── error.tsx              # App-level error boundary
└── (dashboard)/
    └── error.tsx          # Dashboard-specific error boundary
```

## Error Types

### 1. Global Errors (`global-error.tsx`)

**When it triggers:**
- Critical application errors
- Errors in root layout
- Errors that crash the entire app

**User sees:**
- "Critical Application Error"
- Error ID (digest) for support
- Try Again and Go to Home buttons
- In development: Full error details

**Example scenarios:**
- Database connection failures
- Authentication system crashes
- Critical configuration errors

---

### 2. App-Level Errors (`error.tsx`)

**When it triggers:**
- Errors in any page component
- Server Component rendering errors
- Data fetching failures

**User sees:**
- "Oops! Something went wrong"
- Error ID (digest) for support
- Try Again and Go to Home buttons
- In development: Error message and digest

**Example scenarios:**
- Failed API calls
- Missing environment variables
- Unexpected null values

---

### 3. Dashboard Errors (`(dashboard)/error.tsx`)

**When it triggers:**
- Errors within dashboard routes
- Student, teacher, librarian, admin page errors
- Dashboard data loading failures

**User sees:**
- "Dashboard Error"
- Error ID (digest) for support
- Try Again, Go to Dashboard, and Go to Home buttons
- In development: Expandable technical details with stack trace

**Example scenarios:**
- Failed to load books
- Quiz data errors
- User profile loading issues

---

## Production vs Development

### Production Mode
```bash
npm run build
npm run start
```

**Error messages show:**
- ✅ User-friendly message
- ✅ Error ID (digest)
- ✅ Instructions to contact admin
- ❌ No technical details
- ❌ No stack traces
- ❌ No error messages

**Benefits:**
- Doesn't leak sensitive information
- Professional appearance
- Guides users to take screenshots
- Provides error ID for support

---

### Development Mode
```bash
npm run dev
```

**Error messages show:**
- ✅ User-friendly message
- ✅ Error ID (digest)
- ✅ Full error message
- ✅ Stack trace (dashboard errors)
- ✅ Console logging

**Benefits:**
- Fast debugging
- See exact error location
- Understand what went wrong

---

## Error Message Format

### Production Error Screen

```
┌─────────────────────────────────────┐
│           ⚠️  Error Icon            │
│                                     │
│        Dashboard Error              │
│                                     │
│  An error occurred in the Server    │
│  Components render. Please          │
│  screenshot this screen and         │
│  contact your admin.                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Error ID (for support):     │   │
│  │ a1b2c3d4e5f6                │   │
│  │ 📸 Include this ID          │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Try Again ]                      │
│  [ Go to Dashboard ]                │
│  [ Go to Home ]                     │
│                                     │
│  If problem persists, contact       │
│  your system administrator          │
└─────────────────────────────────────┘
```

---

## How to Use Error IDs

When a user reports an error:

1. **Ask for the Error ID** - It's displayed on the error screen
2. **Check server logs** - Search for the digest value
3. **Find the stack trace** - Logs will show the actual error
4. **Reproduce the issue** - Use the error context to debug

### Example Log Search

```bash
# Search Docker logs for specific error
docker logs reading-buddy-web | grep "a1b2c3d4e5f6"

# Or if using PM2
pm2 logs --lines 1000 | grep "a1b2c3d4e5f6"
```

---

## Implementing Error Tracking (Future)

The error boundaries are ready for integration with error tracking services:

### Recommended Services

1. **Sentry** (Most popular)
   ```typescript
   import * as Sentry from "@sentry/nextjs";
   
   useEffect(() => {
     Sentry.captureException(error);
   }, [error]);
   ```

2. **LogRocket**
   ```typescript
   import LogRocket from 'logrocket';
   
   useEffect(() => {
     LogRocket.captureException(error);
   }, [error]);
   ```

3. **Rollbar**
   ```typescript
   import Rollbar from 'rollbar';
   
   useEffect(() => {
     rollbar.error(error);
   }, [error]);
   ```

### Where to Add

Look for these TODO comments in the error files:

```typescript
// TODO: Log to error tracking service (Sentry, LogRocket, etc.)
// Example: Sentry.captureException(error);
```

---

## Testing Error Boundaries

### Trigger an Error (Development)

Create a test component that throws an error:

```typescript
// web/src/app/test-error/page.tsx
export default function TestError() {
  throw new Error('This is a test error');
  return <div>This won't render</div>;
}
```

Then visit `/test-error` to see the error boundary in action.

### Trigger Dashboard Error

```typescript
// web/src/app/(dashboard)/dashboard/test-error/page.tsx
export default function DashboardTestError() {
  throw new Error('Dashboard test error');
  return <div>This won't render</div>;
}
```

Visit `/dashboard/test-error`

---

## Best Practices

### For Developers

1. **Don't catch all errors**
   - Let error boundaries handle UI errors
   - Only catch errors you can actually handle

2. **Provide context**
   - Add meaningful error messages
   - Include relevant data in logs

3. **Use try-catch for expected errors**
   ```typescript
   try {
     await fetchData();
   } catch (error) {
     // Handle specific expected error
     showUserFriendlyMessage();
   }
   ```

4. **Let unexpected errors bubble up**
   - Error boundaries will catch them
   - Better UX than app crash

### For Admins

1. **Monitor error IDs**
   - Keep logs of error digests
   - Look for patterns

2. **Enable error tracking**
   - Implement Sentry or similar service
   - Get notifications for errors

3. **Train users**
   - Teach them to screenshot errors
   - Collect error IDs when reporting

---

## User Instructions

When you see an error screen:

1. **Take a screenshot** - Capture the entire error message
2. **Note the Error ID** - The code in the yellow box
3. **Try Again button** - Might work if it was a temporary issue
4. **Contact admin** - If error persists, report with:
   - Screenshot
   - Error ID
   - What you were doing when error occurred
   - Your role (Student, Teacher, Librarian, Admin)

---

## Common Errors & Solutions

### "Server Components render error"

**Possible causes:**
- Database connection lost
- Missing environment variables
- Invalid data in database
- API quota exceeded (Gemini, etc.)

**Solutions:**
- Check `.env` file
- Verify database is running
- Check API quotas
- Review recent code changes

### "Critical Application Error"

**Possible causes:**
- Root layout error
- Authentication system down
- Supabase/MinIO unavailable

**Solutions:**
- Check all services are running
- Verify network connectivity
- Check service status pages
- Review server logs

---

## Future Improvements

- [ ] Add Sentry integration
- [ ] Implement error rate limiting (don't spam error service)
- [ ] Add user feedback form on error pages
- [ ] Create error analytics dashboard
- [ ] Add retry with exponential backoff
- [ ] Implement graceful degradation for specific features

---

**Version:** 1.0.1  
**Last Updated:** November 19, 2025  
**Next Review:** After implementing error tracking service
