import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "../lib/AppState";
export const metadata: Metadata = { title: "TriageZero AI", description: "Synthetic emergency report triage" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AppStateProvider>{children}</AppStateProvider></body></html>; }
