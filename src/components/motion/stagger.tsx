"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
};

export function Stagger({
  children,
  className,
  delayChildren = 0.05,
  staggerChildren = 0.08,
}: StaggerProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      variants={
        shouldReduceMotion
          ? undefined
          : {
              hidden: {},
              show: {
                transition: {
                  delayChildren,
                  staggerChildren,
                },
              },
            }
      }
      style={
        shouldReduceMotion
          ? undefined
          : ({ contain: "layout style paint" } as React.CSSProperties)
      }
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={
        shouldReduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 10 },
              show: {
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 320,
                  damping: 26,
                  mass: 0.9,
                },
              },
            }
      }
      style={
        shouldReduceMotion
          ? undefined
          : ({ willChange: "transform, opacity" } as React.CSSProperties)
      }
    >
      {children}
    </motion.div>
  );
}
