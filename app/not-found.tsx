import type { Metadata } from "next";
import Link from "next/link";
import NotFoundReticle from "../components/NotFoundReticle";

export const metadata: Metadata = {
  title: "404 — Signal lost · Jonathan Jesni",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="nf-page">
      <div className="nf-frame">
        <span className="nf-corner nf-corner-tl" />
        <span className="nf-corner nf-corner-tr" />
        <span className="nf-corner nf-corner-bl" />
        <span className="nf-corner nf-corner-br" />

        <NotFoundReticle text="[ NO DETECTION · 0.00 ]" />

        <p className="nf-numeral">404</p>

        <p className="nf-sub">Signal lost. That page isn&apos;t in frame.</p>

        <Link href="/" className="nf-link">
          ←&nbsp;&nbsp;Return to index
        </Link>
      </div>
    </main>
  );
}
