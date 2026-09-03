"use client";
import type { SessionUser } from "@/types";
const key = "nsc.session";
export type StoredSession = { token: string; user: SessionUser };
export const sessionStore = { get: (): StoredSession | null => { try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }, set: (value: StoredSession) => sessionStorage.setItem(key, JSON.stringify(value)), clear: () => sessionStorage.removeItem(key) };
export const can = (user: SessionUser | null, permission: string) => Boolean(user?.permissions.includes("*") || user?.permissions.includes(permission));
