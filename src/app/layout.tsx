import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Hair Transplant | Nepalgunj Skin Center", description: "Secure hair transplant patient documentation" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
