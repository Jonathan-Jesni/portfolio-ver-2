import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import SmoothScroll from "../components/SmoothScroll";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// Absolute-URL base for canonical links, OG/Twitter images, and the sitemap.
// Env var wins on Vercel previews; falls back to the production domain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jonathanjesni.com";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Jonathan Jesni: AI & Systems Developer",
  description:
    "Jonathan Jesni's developer portfolio: AI/ML tools, computer vision, and real-world software engineering.",
  keywords: [
    "Jonathan Jesni",
    "AI developer",
    "systems developer",
    "frontend engineer",
    "machine learning portfolio",
    "deep learning",
    "recommendation systems",
    "computer vision",
    "document processing",
    "Next.js portfolio",
  ],
  openGraph: {
    title: "Jonathan Jesni: AI & Systems Developer",
    description:
      "Jonathan Jesni's developer portfolio: AI/ML tools, computer vision, and real-world software engineering.",
    type: "website",
    url: "/",
    siteName: "Jonathan Jesni",
    // og:image is injected automatically by app/opengraph-image.jpeg
  },
  twitter: {
    card: "summary_large_image",
    title: "Jonathan Jesni: AI & Systems Developer",
    description:
      "AI/ML tools, computer vision, and real-world software engineering projects by Jonathan Jesni.",
    // twitter:image is injected automatically by app/twitter-image.jpeg
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0B09",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body>
        {/* Server-rendered preloader mask — present in the raw HTML from the
            first byte so it covers the hero BEFORE any JS runs (PreLoader is
            dynamic/ssr:false and mounts only after hydration). PreLoader removes
            it once its own overlay has painted, so there's never a hero flash. */}
        <div
          id="preloader-mask"
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#0D0B09" }}
        />
        {/* Film-grain noise overlay — fixed, pointer-events-none, adds physical texture */}
        <div className="grain-overlay" aria-hidden="true" />
        <SmoothScroll>{children}</SmoothScroll>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}