import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "../components/home/BottomNav";
import UserMenu from "../components/auth/UserMenu";
import { AppProviders } from "@/components/providers/AppProviders";
import { BRAND, BRAND_META } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: BRAND.name,
  title: {
    default: BRAND_META.title,
    template: BRAND_META.titleTemplate,
  },
  description: BRAND_META.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/tobailey-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/brand/tobailey-icon.svg" }],
    shortcut: ["/brand/tobailey-icon.svg"],
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: BRAND.name,
    description: BRAND.tagline,
  },
  twitter: {
    card: "summary",
    title: BRAND.name,
    description: BRAND.tagline,
  },
  appleWebApp: {
    title: BRAND.name,
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: BRAND.navy },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AppProviders>
          {children}
          <UserMenu />
          <BottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
