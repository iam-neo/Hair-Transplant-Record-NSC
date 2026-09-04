import type { ApiResult, SessionUser } from "@/types";
const endpoint = process.env.NEXT_PUBLIC_API_URL;
export class ApiError extends Error { constructor(message: string, public code?: string) { super(message); } }

/**
 * Core API caller.  Google Apps Script web-apps do a 302→303 redirect chain
 * on POST.  We work around it by:
 *  1. Sending `Content-Type: text/plain` (avoids CORS preflight)
 *  2. Setting `redirect: "follow"` explicitly
 *  3. Adding an AbortController timeout for large payloads (90 s)
 */
export async function api<T>(action: string, payload: Record<string, unknown> = {}, token?: string): Promise<T> {
  if (!endpoint) throw new ApiError("The application backend has not been configured. Set NEXT_PUBLIC_API_URL after deploying Apps Script.", "CONFIGURATION_REQUIRED");

  // Validate endpoint looks like a real GAS url
  if (!/^https:\/\/script\.google\.com\//.test(endpoint)) {
    throw new ApiError(`NEXT_PUBLIC_API_URL does not point to a Google Apps Script deployment: "${endpoint}"`, "CONFIGURATION_REQUIRED");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000); // 90 s timeout

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token, payload }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[API] fetch failed for "${action}":`, msg);

    if (msg.includes("aborted") || msg.includes("AbortError")) {
      throw new ApiError("The request timed out. If you are uploading a large file, try a smaller image size.", "TIMEOUT");
    }

    throw new ApiError(
      "Unable to connect to the backend. Common fixes:\n" +
      "• Check your internet connection\n" +
      "• Re-deploy Apps Script (Deploy → New deployment → Web app → Anyone)\n" +
      "• Make sure the deployment URL in .env matches the latest deployment\n" +
      "• If uploading images, try smaller file sizes (< 5 MB)",
      "NETWORK_ERROR"
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // GAS sometimes returns an HTML error page (e.g. 403 / script error)
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) {
    const body = await response.text();
    console.error(`[API] non-JSON response for "${action}" (${response.status}):`, body.slice(0, 500));
    throw new ApiError(
      `Backend returned HTTP ${response.status}. ` +
      (response.status === 401 || response.status === 403
        ? "Re-deploy your Apps Script with access set to 'Anyone'."
        : "Check the Apps Script deployment and try again."),
      "SERVER_ERROR"
    );
  }

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
