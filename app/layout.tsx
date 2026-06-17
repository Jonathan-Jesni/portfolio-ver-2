import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif, Hanken_Grotesk } from "next/font/google";
import SmoothScroll from "../components/SmoothScroll";
import { Analytics } from "@vercel/analytics/next";
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

/* TWK Lausanne stand-in — grotesk UI face for the Editorial
   Financial (linen) sections */
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanken",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Jonathan Jesni — AI & Systems Developer",
  description:
    "Jonathan Jesni's developer portfolio — AI/ML tools, computer vision, and real-world software engineering.",
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
    title: "Jonathan Jesni — AI & Systems Developer",
    description:
      "Jonathan Jesni's developer portfolio — AI/ML tools, computer vision, and real-world software engineering.",
    type: "website",
    url: "/",
    siteName: "Jonathan Jesni",
    // og:image is injected automatically by app/opengraph-image.jpeg
  },
  twitter: {
    card: "summary_large_image",
    title: "Jonathan Jesni — AI & Systems Developer",
    description:
      "AI/ML tools, computer vision, and real-world software engineering projects by Jonathan Jesni.",
    // twitter:image is injected automatically by app/twitter-image.jpeg
  },
};

export const viewport: View