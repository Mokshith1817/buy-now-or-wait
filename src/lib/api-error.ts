/**
 * @file api-error.ts
 * @description Centralized, secure API error response helper ensuring uniform JSON shape and no stack traces.
 */

import { NextResponse } from "next/server";
import { ApiErrorResponse } from "./types";

/**
 * Creates a standardized JSON error response without exposing internal stack traces.
 *
 * @param error Short error title/category.
 * @param message Human-readable, safe error description.
 * @param status HTTP response status code (default: 400).
 * @returns Standardized NextResponse with JSON body `{ error, message }`.
 */
export function createApiError(
  error: string,
  message?: string,
  status = 400
): NextResponse<ApiErrorResponse> {
  const safeMessage = message || error;
  return NextResponse.json(
    {
      error,
      message: safeMessage,
    },
    { status }
  );
}
