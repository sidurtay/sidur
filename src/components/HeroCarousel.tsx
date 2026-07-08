"use client";
import { useState, useEffect } from "react";

const SLIDES = ["/carousel-clockin.jpg", "/carousel-schedule.jpg", "/carousel-employees.png", "/carousel-tips.png"];
const INTERVAL_MS = 5000;

// Auto-rotating crossfade of real app screenshots — replaces a single static
// hero photo so the landing page actually shows what the product does
// (dashboard, schedule, clock-in) instead of one frozen frame.
export default function HeroCarousel({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive(i => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {SLIDES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="תצוגת אפליקציית Sidur"
          className="w-full h-full object-cover"
          style={{
            objectPosition: "top",
            position: "absolute",
            inset: 0,
            opacity: active === i ? 1 : 0,
            transition: "opacity 0.7s ease",
          }} />
      ))}
    </div>
  );
}
