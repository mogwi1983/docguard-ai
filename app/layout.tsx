import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocGuard AI — Clinical Documentation Validator",
  description:
    "Real-time clinical documentation validator for MDD. Flag missing components before the note is locked.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
