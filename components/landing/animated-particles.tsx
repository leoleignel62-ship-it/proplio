"use client";

import { useEffect, useRef } from "react";

const PARTICLE_COUNT = 40;
const COLOR = "#7c3aed";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
};

export function AnimatedParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const surface = canvasRef.current;
    if (!surface) return;
    const ctx = surface.getContext("2d");
    if (!ctx) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const el = surface;
    const g = ctx;

    let raf = 0;
    let particles: Particle[] = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      el.width = Math.floor(cssW * dpr);
      el.height = Math.floor(cssH * dpr);
      el.style.width = `${cssW}px`;
      el.style.height = `${cssH}px`;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initParticles() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() * 0.3 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
        vy: (Math.random() * 0.3 + 0.2) * (Math.random() < 0.5 ? -1 : 1),
        r: Math.random() * 4 + 2,
        opacity: Math.random() * 0.05 + 0.03,
      }));
    }

    function loop() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      g.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -p.r) p.x = w + p.r;
        else if (p.x > w + p.r) p.x = -p.r;
        if (p.y < -p.r) p.y = h + p.r;
        else if (p.y > h + p.r) p.y = -p.r;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fillStyle = COLOR;
        g.globalAlpha = p.opacity;
        g.fill();
        g.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    }

    resize();
    initParticles();
    const onResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[-1] h-full w-full"
      aria-hidden
    />
  );
}
