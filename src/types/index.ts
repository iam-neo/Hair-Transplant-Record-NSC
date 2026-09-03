export type Role = "SUPER_ADMIN" | "ADMIN" | "DOCTOR" | "ASSISTANT" | "RECEPTION";
export type Permission = string;
export interface SessionUser { id: string; name: string; email: string; role: Role; permissions: Permission[] }
export interface Patient { id: string; fullName: string; dateOfBirth?: string; gender?: string; contactNumber: string; email?: string; address?: string; registrationDate: string; status: "Active" | "Completed" | "Archived"; lastActivity?: string; notes?: string }
export interface ApiResult<T> { ok: boolean; data?: T; error?: string; code?: string }
export interface DashboardData { patients: number; proceduresThisMonth: number; upcomingFollowUps: number; outstandingBalance: number; followUps: { id: string; patient: string; date: string; type: string; status: string }[] }
