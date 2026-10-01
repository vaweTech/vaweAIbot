/**
 * Lightweight gate for the data-entry endpoints until Firebase Auth is wired up.
 *
 * If ADMIN_ACCESS_CODE is set, every write must carry a matching x-admin-code
 * header. If it is unset the endpoints stay open so local development works,
 * and the console shows a warning banner.
 */

export function adminCodeRequired(): boolean {
  return Boolean(process.env.ADMIN_ACCESS_CODE);
}

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function assertAdmin(request: Request): void {
  const expected = process.env.ADMIN_ACCESS_CODE;
  if (!expected) return;

  const provided = request.headers.get("x-admin-code");
  if (provided !== expected) {
    throw new AdminAuthError("Invalid or missing admin access code.");
  }
}
