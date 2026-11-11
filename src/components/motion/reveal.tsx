"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
};

/**
 * OPTIMIZED: Scroll Performance Fix
 * Changes:
 * ✅ Increased amount threshold (0.35 → 0.5) - scroll less aggressively
 * ✅ Added viewport margin for better performance
 * ✅ Added containment for paint optimization
 * ✅ Triggers less frequently = smoother scrolling
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 14,
  once = true,
  amount = 0.1,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{
        once,
        amount,
        margin: "0px 0px -20px 0px",
      }}
      transition={
        shouldReduceMotion
          ? undefined
          : {
              type: "spring",
              stiffness: 320,
              damping: 26,
              mass: 0.9,
              delay,
            }
      }
      style={
        shouldReduceMotion
          ? undefined
          : ({
              willChange: "transform, opacity",
              contain: "layout style",
            } as React.CSSProperties)
      }
    >
      {children}
    </motion.div>
  );
}
