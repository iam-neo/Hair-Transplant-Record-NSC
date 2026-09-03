"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sessionStore, can } from "@/lib/auth/session";
import type { SessionUser } from "@/types";
const nav = [["Dashboard","/dashboard","reports.view"],["Patients","/patients","patients.view"],["Consultations","/consultations","consultations.view"],["Assessments","/assessments","assessments.view"],["Procedures","/procedures","procedures.view"],["Photos","/photos","photos.view"],["Follow-ups","/followups","followups.view"],["Payments","/payments","payments.view"],["Documents","/documents","documents.view"],["Reports","/reports","reports.view"],["Activity Logs","/activity","audit_logs.view"],["Administration","/administration/users","users.view"]] as const;
export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
 const router=useRouter(),path=usePathname(),[user,setUser]=useState<SessionUser|null>(null);
 useEffect(()=>{const s=sessionStore.get();if(!s){router.replace('/login');return;}setUser(s.user)},[router]);
 const logout=()=>{sessionStore.clear();router.replace('/login')};
 return <div className="app-shell"><aside className="sidebar"><div className="logo"><Image src="/Skin_logo.png" width={39} height={39} alt="Nepalgunj Skin Center"/><span>Nepalgunj Skin Center</span></div><nav>{nav.filter(([, ,p])=>can(user,p)).map(([label,href])=><Link key={href} href={href} className={path===href?'active':''}>{label}</Link>)}</nav><button className="logout" onClick={logout}>Sign out</button></aside><main className="main"><header className="topbar"><h1>{title}</h1><div className="user"><span>{user?.name || 'Loading…'}</span><span className="avatar">{user?.name?.slice(0,1).toUpperCase() || '•'}</span></div></header><section className="content">{children}</section></main></div>;
}
