import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

/* ------------------------------------------------------------------ */
/*  Font                                                                */
/* ------------------------------------------------------------------ */
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-family",
  display: "swap",
});

/* ------------------------------------------------------------------ */
/*  Metadata                                                            */
/* ------------------------------------------------------------------ */
export const metadata: Metadata = {
  title: {
    default: "Zapp — Fix anything. Fast.",
    template: "%s | Zapp",
  },
  description:
    "On-demand local services platform. Connect with nearby skilled workers in real time.",
  applicationName: "Zapp",
  keywords: ["local services", "on-demand", "plumber", "electrician", "skilled workers"],
  authors: [{ name: "Zapp" }],
  creator: "Zapp",
  metadataBase: new URL("https://zapp.app"),
  openGraph: {
    type: "website",
    siteName: "Zapp",
    title: "Zapp — Fix anything. Fast.",
    description:
      "On-demand local services. Connect with nearby skilled workers in real time.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zapp — Fix anything. Fast.",
    description:
      "On-demand local services. Connect with nearby skilled workers in real time.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D172A",
  viewportFit: "cover", // enables safe-area-inset support
};

/* ------------------------------------------------------------------ */
/*  Layout                                                              */
/* ------------------------------------------------------------------ */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>{children}</body>
    </html>
  );
}