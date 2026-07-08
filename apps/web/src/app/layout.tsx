import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "AI Workforce",
  description: "Internal digital-employee dashboard for Assertin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">{children}</body>
    </html>
  );
}
