import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { GlobalNetworkMonitor } from "@/components/GlobalNetworkMonitor";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: `${SITE_SETTINGS.siteName} — ${SITE_SETTINGS.tagline}`,
  description: SITE_SETTINGS.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      data-primary={SITE_SETTINGS.defaultTheme.primary}
      data-neutral={SITE_SETTINGS.defaultTheme.neutral}
    >
      <body className="min-h-screen bg-[#07090e] text-slate-100 antialiased">
        <GlobalNetworkMonitor />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
