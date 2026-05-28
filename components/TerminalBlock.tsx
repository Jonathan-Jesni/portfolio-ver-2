"use client";

import React, { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------
   The full command that gets typed out character by character.
------------------------------------------------------------------ */
const COMMAND = "node developer.js";

/* ------------------------------------------------------------------
   Strict JSON output — quoted keys (blue), string values (green),
   structural punctuation (grey).
------------------------------------------------------------------ */
const G = ({ children }: { children: React.ReactNode }) => (
  <span className="term-punct">{children}</span>
);

function JsonOutput() {
  return (
    <pre className="term-output">
      <G>{'{'}</G>{
        '\n'}
      {'  '}<span className="term-key">&quot;current&quot;</span><G>{': '}</G><span className="term-str">&quot;B.Tech CSE, IIIT Pune&quot;</span><G>{','}</G>{
        '\n'}
      {'  '}<span className="term-key">&quot;year&quot;</span><G>{': '}</G><span className="term-str">&quot;3rd Year&quot;</span><G>{','}</G>{
        '\n'}
      {'  '}<span className="term-key">&quot;location&quot;</span><G>{': '}</G><span className="term-str">&quot;Pune, India / Muscat, Oman&quot;</span><G>{','}</G>{
        '\n'}
      {'  '}<span className="term-key">&quot;focus&quot;</span><G>{': ['}</G>{
        '\n'}
      {'    '}<span className="term-str">&quot;AI&quot;</span><G>{','}</G>{
        '\n'}
      {'    '}<span className="term-str">&quot;Systems&quot;</span><G>{','}</G>{
        '\n'}
      {'    '}<span className="term-str">&quot;Security&quot;</span>{
        '\n'}
      {'  '}<G>{'],'}</G>{
        '\n'}
      {'  '}<span className="term-key">&quot;status&quot;</span><G>{': '}</G><span className="term-str">&quot;open to internships&quot;</span>{
        '\n'}
      <G>{'}'}</G>
    </pre>
  );
}

/* ------------------------------------------------------------------
   TerminalBlock
------------------------------------------------------------------ */
export default function TerminalBlock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [command, setCommand] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [started, setStarted] = useState(false);

  /* ---- IntersectionObserver: fires the sequence on first entry ---- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  /* ---- Typewriter: runs once `started` flips to true ---- */
  useEffect(() => {
    if (!started) return;

    let charIndex = 0;

    const interval = setInterval(() => {
      charIndex += 1;
      setCommand(COMMAND.slice(0, charIndex));

      if (charIndex === COMMAND.length) {
        clearInterval(interval);
        // Pause 500 ms, then reveal the output block
        setTimeout(() => setShowOutput(true), 500);
      }
    }, 55); // ~55 ms per character — feels natural

    return () => clearInterval(interval);
  }, [started]);

  return (
    <div ref={containerRef} className="term-shell">
      {/* ---- Title bar ---- */}
      <div className="term-bar">
        <div className="term-dots">
          <span className="term-dot term-dot--red" />
          <span className="term-dot term-dot--yellow" />
          <span className="term-dot term-dot--green" />
        </div>
        <span className="term-title">guest@jonathan: ~</span>
      </div>

      {/* ---- Body ---- */}
      <div className="term-body">
        {/* Command line being typed */}
        <div className="term-line">
          <span className="term-prompt-arrow">➜</span>
          <span className="term-prompt-dir">~</span>
          <span className="term-typed">{command}</span>
          {!showOutput && <span className="terminal-cursor" aria-hidden="true" />}
        </div>

        {/* Output: revealed after typing finishes */}
        {showOutput && (
          <div className="fade-in-fast">
            <JsonOutput />
            {/* Second prompt line at the bottom */}
            <div className="term-line term-line--mt">
              <span className="term-prompt-arrow">➜</span>
              <span className="term-prompt-dir">~</span>
              <span className="terminal-cursor" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
