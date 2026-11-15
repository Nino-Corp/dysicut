"use client";

import { motion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Fade + translate à l'entrée dans le viewport. Respecte prefers-reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <MotionConfig reducedMotion="user">
      <Tag
        className={className}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </Tag>
    </MotionConfig>
  );
}
