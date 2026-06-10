import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import SmoothScroll from "../components/SmoothScroll";
import "./globals.css";

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
  title: "Jonathan Jesni — AI & Systems Developer",
  description:
    "Jonathan Jesni's developer portfolio — AI-powered tools, cybersecurity systems, and real-world software engineering.",
  keywords: [
    "Jonathan Jesni",
    "AI developer",
    "systems developer",
    "frontend engineer",
    "machine learning portfolio",
    "cybersecurity projects",
    "recommendation systems",
    "computer vision",
    "document processing",
    "Next.js portfolio",
  ],
  openGraph: {
    title: "Jonathan Jesni — AI & Systems Developer",
    description:
      "Jonathan Jesni's developer portfolio — AI-powered tools, cybersecurity systems, and real-world software engineering.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jonathan Jesni — AI & Systems Developer",
    description:
      "AI-powered tools, cybersecurity systems, and real-world software engineering projects by Jonathan Jesni.",
  },
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
        {/* Film-grain noise overlay — fixed, pointer-events-none, adds physical texture */}
        <div className="grain-overlay" aria-hidden="true" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
