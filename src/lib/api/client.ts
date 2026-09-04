import type { ApiResult, SessionUser } from "@/types";
const endpoint = process.env.NEXT_PUBLIC_API_URL;
export class ApiError extends Error { constructor(message: string, public code?: string) { super(message); } }
export async function api<T>(action: string, payload: Record<string, unknown> = {}, token?: string): Promise<T> {
  if (!endpoint) throw new ApiError("The application backend has not been configured. Set NEXT_PUBLIC_API_URL after deploying Apps Script.", "CONFIGURATION_REQUIRED");
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, token, payload }) });
  const result = await response.json() as ApiResult<T>;
  if (!result.ok) throw new ApiError(result.error || "The request could not be completed.", result.code);
  return result.data as T;
}
export const authApi = {
  login: (identity: string, password: string) => api<{ token: string; user: SessionUser }>("auth.login", { identity, password }),
  logout: (token: string) => api("auth.logout", {}, token),
  me: (token: string) => api<SessionUser>("auth.me", {}, token),
  changePassword: (token: string, currentPassword: string, newPassword: string) => api<{ message: string }>("auth.changePassword", { currentPassword, newPassword }, token),
  updateProfile: (token: string, fullName: string, username: string) => api<{ user: SessionUser }>("auth.updateProfile", { fullName, username }, token),
};
