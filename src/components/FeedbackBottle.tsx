"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { sendFeedback, type FeedbackKind, type SentBottle } from "@/app/feedback-actions";

/**
 * The feedback "ship in a bottle" at the bottom right.
 * - Hover it (or focus it) to show "hide ⇥". Hidden, a sliver with the red flag peeks from the right edge.
 * - While hidden, bringing the mouse within EDGE px of the right edge pops it back out; moving away tucks it again.
 * - Clicking the sliver (or tapping it on a phone) brings it back for good. The choice is remembered per browser.
 * - Clicking the bottle opens a paper note in a drawer; sending "throws it back" and lists it under "bottles you've sent".
 */

const EDGE = 60;
const STORAGE_KEY = "kr-bottle-hidden";
const KINDS: FeedbackKind[] = ["feedback", "idea", "bug"];

// Original pixel art: a wreck with a red pennant inside a bottle. One letter per pixel.
const PAL: Record<string, string> = {
  h: "#6b4a2b", d: "#3e2a17", l: "#8a6a44", s: "#e9dcb8", t: "#cdb98a", r: "#ff5252", R: "#b8233a",
  w: "#1d6fa0", f: "#bfefff", g: "#4de3ff", G: "#2a8fb0", c: "#a5844a", k: "#050a14",
};
const BOTTLE = [
  "......cc......", "......cc......", ".....gkkg.....", ".....gkkg.....", "....gkkkkg....",
  "..ggkklrrrgg..", ".gkkkklrRkkkg.", "gkkkkklrkkkkkg", "gkkkkklskkkkkg", "gkkkkklsskkkkg",
  "gkkkkklstkkkkg", "gkkkkklkkkkkkg", "gkkhhhhhhhhkkg", "gkkkhh.hhhdkkg", "gkwwwwwwwwwwkg",
  "gGwwfwwwwwfwGg", ".gGGGGGGGGGGg.",
];

function BottleSprite({ scale = 5 }: { scale?: number }) {
  const w = BOTTLE[0].length;
  const h = BOTTLE.length;
  return (
    <svg className="kr-px" viewBox={`0 0 ${w} ${h}`} width={w * scale} height={h * scale} aria-hidden>
      {BOTTLE.flatMap((row, y) =>
        [...row].map((ch, x) => (PAL[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PAL[ch]} /> : null)),
      )}
    </svg>
  );
}

function readHidden() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeHidden(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
  } catch {
    /* private mode etc.: just don't remember */
  }
}

export function FeedbackBottle({ name, recent }: { name: string; recent: SentBottle[] }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [near, setNear] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [text, setText] = useState("");
  const [sent, setSent] = useState<SentBottle[]>(recent);
  const [status, setStatus] = useState<"idle" | "thanks" | "error">("idle");
  const [error, setError] = useState("");
  const [throwing, setThrowing] = useState(false);
  const [pending, start] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setHidden(readHidden()), []);

  // While hidden: pop out when a mouse comes near the right edge, tuck back when it leaves.
  useEffect(() => {
    if (!hidden || open) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setNear(window.innerWidth - e.clientX <= EDGE);
    };
    const onLeave = () => setNear(false);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [hidden, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => textRef.current?.focus(), 200);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const peeking = hidden && !near && !open;

  function hide() {
    setHidden(true);
    setNear(false);
    writeHidden(true);
  }
  function onBottleClick() {
    if (peeking) {
      // tapping the sliver brings it back for good (the phone fallback)
      setHidden(false);
      writeHidden(false);
      return;
    }
    setStatus("idle");
    setOpen(true);
  }
  function send() {
    if (!text.trim()) {
      setError("the bottle is empty. write something first.");
      setStatus("error");
      textRef.current?.focus();
      return;
    }
    start(async () => {
      const res = await sendFeedback(kind, text, pathname);
      if (!res.ok) {
        setError(res.message);
        setStatus("error");
        return;
      }
      setSent((s) => [res.bottle, ...s].slice(0, 5));
      setText("");
      setStatus("thanks");
      setThrowing(true);
      setTimeout(() => setThrowing(false), 1600);
      setTimeout(() => setOpen(false), 2000);
    });
  }

  return (
    <>
      <div className={`kr-bottle ${peeking ? "kr-bottle--peek" : ""}`}>
        {!peeking && !open && <span className="kr-bottle__say">any ideas?</span>}
        {!hidden && (
          <button type="button" className="kr-bottle__hide" onClick={hide} aria-label="hide the feedback bottle">
            hide ⇥
          </button>
        )}
        <button
          type="button"
          className="kr-bottle__btn"
          onClick={onBottleClick}
          aria-label={peeking ? "show the feedback bottle" : "send feedback or an idea"}
          title={peeking ? "bring the bottle back" : "any ideas?"}
        >
          <span className="kr-bottle__bob">
            <span className="kr-bottle__tilt">
              <BottleSprite />
              <span className="kr-bottle__shrimp" aria-hidden>
                🦐
              </span>
            </span>
          </span>
        </button>
      </div>

      {throwing && (
        <>
          <span className="kr-throw" aria-hidden>
            🍾
          </span>
          <span className="kr-splash" aria-hidden>
            🌊
          </span>
        </>
      )}

      {open && <div className="kr-scrim" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`kr-note ${open ? "kr-note--open" : ""}`} aria-hidden={!open} aria-label="message in a bottle">
        <div className="kr-note__hd">
          <span>message in a bottle</span>
          <button type="button" className="kr-note__x" onClick={() => setOpen(false)} aria-label="close" tabIndex={open ? 0 : -1}>
            ×
          </button>
        </div>
        <div className="kr-note__sub">from: {name} · to: the crew</div>

        {status === "thanks" ? (
          <div className="kr-note__thanks">
            <span>🍾 🌊</span>
            thrown. it&apos;ll wash up on our shore.
          </div>
        ) : (
          <div>
            <div className="kr-note__kinds" role="radiogroup" aria-label="what kind of message">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  className="kr-note__kind"
                  onClick={() => setKind(k)}
                  tabIndex={open ? 0 : -1}
                >
                  {k}
                </button>
              ))}
            </div>
            <textarea
              ref={textRef}
              id="kr-feedback"
              className="kr-note__text"
              rows={6}
              maxLength={2000}
              placeholder="i would like to see…"
              aria-label="your message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              tabIndex={open ? 0 : -1}
            />
            {status === "error" && <p className="kr-note__err">{error}</p>}
            <button type="button" className="kr-note__send" onClick={send} disabled={pending} tabIndex={open ? 0 : -1}>
              {pending ? "corking…" : "throw it back 🌊"}
            </button>
          </div>
        )}

        {sent.length > 0 && (
          <div className="kr-note__log">
            <span>bottles you&apos;ve sent</span>
            {sent.map((b) => (
              <span key={b.id} className="kr-note__item">
                <b>{b.kind}</b> · {b.message.length > 60 ? b.message.slice(0, 60) + "…" : b.message}
              </span>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
