"use client";

import { useEffect, useRef, useState } from "react";

/* Defers mounting heavy children (and their dynamic chunk) until the
   section is about to enter the viewport. Reserves `minHeight` so the
   late mount causes no layout shift. Used to keep the matter-js chunk
   off the initial idle download until Skills is approached. */
export default function InViewMount({
  children,
  minHeight,
  rootMargin = "600px",
}: {
  children: React.ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true); // no observer support: just render
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} style={{ minHeight }}>
      {shown ? children : null}
    </div>
  );
}
