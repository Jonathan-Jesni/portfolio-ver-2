"use client";

import { useEffect, useRef, useState } from "react";
import { scrollState } from "./SmoothScroll";

export default function ScrollIndicator() {
  const [hidden, setHidden] = useState(false);
  const progressBarRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const update = () => {
      // Hide scroll indicator after scrolling begins
      setHidden(scrollState.progress > 0.02);

      // Update progress bar
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${scrollState.progress})`;
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <>
      <div ref={progressBarRef} className="progress-bar" />
      <div className={`scroll-indicator ${hidden ? "hidden" : ""}`}>
        <span className="scroll-indicator__text">Scroll to explore</span>
        <div className="scroll-indicator__line" />
      </div>
    </>
  );
}
