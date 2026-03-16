type ErrorCode = "NOT_FOUND" | "INVALID_PARAMS" | "INTERNAL_ERROR" | "UNAUTHORIZED";

export function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function notFound(message = "Not found"): Response {
  return errorResponse("NOT_FOUND", message, 404);
}

export function invalidParams(message: string): Response {
  return errorResponse("INVALID_PARAMS", message, 400);
}

export function internalError(message = "Internal server error"): Response {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

export function unauthorized(message = "Unauthorized"): Response {
  return errorResponse("UNAUTHORIZED", message, 401);
}
