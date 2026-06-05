import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Jonathan Jesni — AI & Systems Developer",
  description:
    "Jonathan Jesni's developer portfolio — AI-powered tools, cybersecurity systems, and real-world software engineering.",
  openGraph: {
    title: "Jonathan Jesni — AI & Systems Developer",
    description:
      "Jonathan Jesni's developer portfolio — AI-powered tools, cybersecurity systems, and real-world software engineering.",
    type: "website",
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
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Film-grain noise overlay — fixed, pointer-events-none, adds physical texture */}
        <div className="grain-overlay" aria-hidden="true" />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
