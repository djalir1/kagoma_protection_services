import { useEffect, useState, type CSSProperties } from "react";
import badge from "@/assets/brand/badge.webp";

/**
 * The Kagoma badge: gold particles converge, the badge turns in on its axis,
 * a ring of light settles under it, then a shine sweeps across the eagle
 * every few seconds. Particles are created after mount so server and client
 * render the same markup.
 */
export function EagleBadge({ className = "" }: { className?: string }) {
  const [particles, setParticles] = useState<{ sx: string; sy: string; delay: string }[]>([]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setParticles(
      Array.from({ length: 46 }, () => {
        const a = Math.random() * Math.PI * 2;
        const d = 90 + Math.random() * 190;
        return {
          sx: `${(Math.cos(a) * d).toFixed(1)}px`,
          sy: `${(Math.sin(a) * d).toFixed(1)}px`,
          delay: `${(Math.random() * 1.1).toFixed(2)}s`,
        };
      }),
    );
  }, []);

  return (
    <div className={`kps-stage ${className}`} aria-hidden="true">
      <div className="absolute inset-0 -m-10 rounded-full bg-primary/10 blur-3xl" />
      <div className="kps-particles">
        {particles.map((p, i) => (
          <i
            key={i}
            style={{ "--sx": p.sx, "--sy": p.sy, animationDelay: p.delay } as CSSProperties}
          />
        ))}
      </div>
      <div
        className="kps-badge w-[min(74%,300px)]"
        style={{ aspectRatio: "440/585", "--kps-mask": `url(${badge})` } as CSSProperties}
      >
        <img src={badge} alt="" className="h-full w-full object-contain" />
        <span className="kps-shine" />
      </div>
      <span className="kps-ring" />
    </div>
  );
}
