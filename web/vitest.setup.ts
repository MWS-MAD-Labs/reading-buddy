import "@testing-library/jest-dom";
import { expect, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

// Set up environment variables for testing
beforeAll(() => {
  process.env.MINIO_ENDPOINT = "localhost";
  process.env.MINIO_PORT = "9000";
  process.env.MINIO_USE_SSL = "false";
  process.env.MINIO_ACCESS_KEY = "test-access-key";
  process.env.MINIO_SECRET_KEY = "test-secret-key";
  process.env.MINIO_BUCKET_NAME = "test-bucket";
});

// Cleanup after each test case (e.g., clearing jsdom)
afterEach(() => {
  cleanup();
});

// Extend Vitest's expect with jest-dom matchers
expect.extend({});
