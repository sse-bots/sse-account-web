import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { AppShell } from "@/components/AppShell";
import { GlobalNetworkMonitor } from "@/components/GlobalNetworkMonitor";
import { SITE_SETTINGS } from "@/lib/site-settings";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070b14",
};

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
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
