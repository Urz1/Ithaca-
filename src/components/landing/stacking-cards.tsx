"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  Check,
  AlertTriangle,
  GitFork,
  ShieldCheck,
  Layers,
  BookOpen,
} from "lucide-react";

export interface StanceCardData {
  id: "supports" | "contradicts" | "extends";
  number: string;
  badge: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  accentBar: string;
  cardBorder: string;
  glowColor: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  citingPaper: string;
  citedPaper: string;
  venue: string;
  quote: string;
  metricLabel: string;
  metricValue: string;
  summaryPoint1: string;
  summaryPoint2: string;
}

export const STANCE_CARDS: StanceCardData[] = [
  {
    id: "supports",
    number: "01",
    badge: "SUPPORTS",
    badgeColor: "text-emerald-700 dark:text-emerald-400",
    badgeBorder: "border-emerald-600/30 dark:border-emerald-500/30",
    badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    accentBar: "from-emerald-500 via-emerald-600 to-emerald-400",
    cardBorder: "border-emerald-500/30 dark:border-emerald-500/25",
    glowColor: "rgba(45, 125, 70, 0.15)",
    icon: Check,
    title: "Empirical Validation & Consensus",
    subtitle: "Direct Replication & Hypothesis Confirmation",
    description:
      "Papers that provide confirming empirical data, replicated experiments, or theoretical proof of a preceding hypothesis. Strengthens epistemic consensus across the citation network.",
    citingPaper: "Przybylski et al. (2019)",
    citedPaper: "Orben & Przybylski (2019)",
    venue: "Nature Human Behaviour",
    quote:
      "“Replication across three large-scale independent cohort datasets (n=359,260) confirms minimal negative effect size.”",
    metricLabel: "Consensus Confidence",
    metricValue: "98.4%",
    summaryPoint1: "Independent multi-cohort empirical confirmation",
    summaryPoint2: "Replication across n=359k observed participants",
  },
  {
    id: "contradicts",
    number: "02",
    badge: "CONTRADICTS",
    badgeColor: "text-rose-700 dark:text-rose-400",
    badgeBorder: "border-rose-600/30 dark:border-rose-500/30",
    badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
    accentBar: "from-rose-500 via-rose-600 to-rose-400",
    cardBorder: "border-rose-500/30 dark:border-rose-500/25",
    glowColor: "rgba(192, 57, 43, 0.18)",
    icon: AlertTriangle,
    title: "Empirical Disputes & Refutations",
    subtitle: "Conflicting Findings & Methodological Flaws",
    description:
      "Papers directly challenging prior conclusions, documenting failure to replicate, or revealing unaddressed confounding variables in earlier experimental pipelines.",
    citingPaper: "Przybylski & Weinstein (2019)",
    citedPaper: "Twenge et al. (2018)",
    venue: "Psychological Science",
    quote:
      "“Specification curve analysis demonstrates that reported associations are statistically indistinguishable from noise.”",
    metricLabel: "Divergence Index",
    metricValue: "Critical Dispute",
    summaryPoint1: "Reveals unaddressed specification bias",
    summaryPoint2: "Identifies confounding demographic covariates",
  },
  {
    id: "extends",
    number: "03",
    badge: "EXTENDS",
    badgeColor: "text-sky-700 dark:text-sky-400",
    badgeBorder: "border-sky-600/30 dark:border-sky-500/30",
    badgeBg: "bg-sky-500/10 dark:bg-sky-500/15",
    accentBar: "from-sky-500 via-sky-600 to-sky-400",
    cardBorder: "border-sky-500/30 dark:border-sky-500/25",
    glowColor: "rgba(43, 108, 176, 0.18)",
    icon: GitFork,
    title: "Methodological Evolution & Expansion",
    subtitle: "New Domains & Generalizing Frameworks",
    description:
      "Papers adopting earlier algorithms or experimental setups to cross into new scientific domains, creating novel paradigms and expanding the boundary of the field.",
    citingPaper: "Schaeffer et al. (2023)",
    citedPaper: "Wei et al. (2022)",
    venue: "NeurIPS 2023 Oral",
    quote:
      "“Generalizes emergent ability metrics by demonstrating that non-linear step shifts resolve to smooth scaling curves.”",
    metricLabel: "Generalization Scope",
    metricValue: "High Transfer",
    summaryPoint1: "Transforms non-linear thresholds to smooth metrics",
    summaryPoint2: "Expands evaluation across 8 multi-modal benchmarks",
  },
];

interface CardSurfaceProps {
  card: StanceCardData;
  index: number;
}

function CardSurface({ card, index }: CardSurfaceProps) {
  return (
    <div
      className={`relative w-full rounded-3xl border ${card.cardBorder} bg-[#FDFBF7] dark:bg-[#1C1815] p-6 sm:p-8 md:p-10 transition-colors backdrop-blur-2xl shadow-[0_22px_45px_-12px_rgba(35,31,27,0.22),0_4px_12px_-2px_rgba(35,31,27,0.08),0_0_0_1px_rgba(35,31,27,0.05)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85),0_8px_20px_-4px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden`}
    >
      {/* Top 3D beveled tactile rim glow */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.accentBar}`}
      />

      {/* Subtle ambient corner gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl opacity-40 transition-opacity"
        style={{ backgroundColor: card.glowColor }}
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        {/* Left Narrative Column */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-wider uppercase shadow-xs ${card.badgeColor} ${card.badgeBorder} ${card.badgeBg}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {card.number}. {card.badge}
            </span>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              Dialectic Edge Type {card.number} of 03
            </span>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${card.badgeBorder} ${card.badgeBg} ${card.badgeColor} shadow-inner`}
            >
              <card.icon className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {card.title}
              </h3>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground/90 mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </div>

          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl font-normal pt-1">
            {card.description}
          </p>

          {/* Quick takeaway bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/50 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{card.summaryPoint1}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{card.summaryPoint2}</span>
            </div>
          </div>
        </div>

        {/* Right Concrete Citation Specimen Column */}
        <div className="w-full lg:max-w-md shrink-0">
          <div className="rounded-2xl border border-border/80 dark:border-white/[0.1] bg-[#F5F1E8]/70 dark:bg-black/45 p-5 space-y-3.5 shadow-inner backdrop-blur-md">
            {/* Header pill & confidence */}
            <div className="flex items-center justify-between border-b border-border/50 dark:border-white/[0.06] pb-2.5 text-[11px] font-mono">
              <span
                className={`font-semibold uppercase tracking-wider flex items-center gap-1.5 ${card.badgeColor} ${card.badgeBg} ${card.badgeBorder} px-2.5 py-0.5 rounded-md border`}
              >
                {card.badge} EDGE
              </span>
              <span className="text-muted-foreground font-semibold">
                {card.metricLabel}:{" "}
                <strong className="text-foreground">{card.metricValue}</strong>
              </span>
            </div>

            {/* Edge Direction / Traversal */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
                Scientific Traversal Edge
              </span>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="font-semibold text-foreground bg-background/90 dark:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-border/70 dark:border-white/[0.1] truncate max-w-[150px] shadow-2xs">
                  {card.citingPaper}
                </span>
                <span className="text-primary font-black text-base px-0.5">→</span>
                <span className="font-semibold text-foreground bg-background/90 dark:bg-white/[0.08] px-3 py-1.5 rounded-lg border border-border/70 dark:border-white/[0.1] truncate max-w-[150px] shadow-2xs">
                  {card.citedPaper}
                </span>
              </div>
            </div>

            {/* Verbatim Ingested Evidence Excerpt */}
            <div className="rounded-xl border border-border/60 dark:border-white/[0.06] bg-background/90 dark:bg-black/35 p-3.5 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 block mb-1">
                Extracted Evidentiary Passage
              </span>
              <p className="text-xs text-foreground/90 leading-relaxed italic">
                {card.quote}
              </p>
            </div>

            {/* Publication Source & Verification Badge */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-muted-foreground">
              <span className="font-medium text-foreground/85 flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-primary" />
                {card.venue}
              </span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified Semantic Link
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StackingCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<number>(0);

  // Track scroll progress along the multi-screen runway
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Calculate current active card index based on scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.33) {
        setActiveTab(0);
      } else if (latest < 0.66) {
        setActiveTab(1);
      } else {
        setActiveTab(2);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Card 1 (SUPPORTS) - Front card on top
  // As user scrolls down from 0 to 0.38, Card 1 lifts up, tilts slightly, and glides away upward (-130%)
  const card1Y = useTransform(
    scrollYProgress,
    [0, 0.22, 0.38],
    ["0%", "0%", "-130%"]
  );
  const card1Opacity = useTransform(scrollYProgress, [0, 0.22, 0.38], [1, 1, 0]);
  const card1RotateX = useTransform(scrollYProgress, [0, 0.22, 0.38], [0, 0, 8]);
  const card1Scale = useTransform(scrollYProgress, [0, 0.22, 0.38], [1, 1, 0.94]);

  // Card 2 (CONTRADICTS) - Middle card
  // Starts underneath Card 1 (scale: 0.96, translateY: 24px).
  // As Card 1 moves away (0 -> 0.34), Card 2 scales to 1.0, centers to 0px.
  // Then as scroll continues (0.55 -> 0.72), Card 2 lifts and glides away upward (-130%)
  const card2Y = useTransform(
    scrollYProgress,
    [0, 0.24, 0.38, 0.55, 0.72],
    ["24px", "16px", "0px", "0px", "-130%"]
  );
  const card2Scale = useTransform(
    scrollYProgress,
    [0, 0.24, 0.38, 0.55, 0.72],
    [0.96, 0.97, 1.0, 1.0, 0.94]
  );
  const card2Opacity = useTransform(
    scrollYProgress,
    [0, 0.55, 0.72],
    [1, 1, 0]
  );
  const card2RotateX = useTransform(
    scrollYProgress,
    [0.38, 0.55, 0.72],
    [0, 0, 8]
  );

  // Card 3 (EXTENDS) - Bottom card
  // Starts underneath Card 2 (scale: 0.92, translateY: 48px).
  // As Card 1 and Card 2 peel away, Card 3 steps up to full prominence (scale: 1.0, translateY: 0px)
  const card3Y = useTransform(
    scrollYProgress,
    [0, 0.38, 0.55, 0.72],
    ["48px", "24px", "16px", "0px"]
  );
  const card3Scale = useTransform(
    scrollYProgress,
    [0, 0.38, 0.55, 0.72],
    [0.92, 0.96, 0.97, 1.0]
  );

  // Smooth scroll handler to jump directly to a card
  const scrollToCard = (cardIndex: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const containerHeight = rect.height - window.innerHeight;

    let targetScroll = containerTop;
    if (cardIndex === 0) targetScroll = containerTop;
    else if (cardIndex === 1) targetScroll = containerTop + containerHeight * 0.45;
    else if (cardIndex === 2) targetScroll = containerTop + containerHeight * 0.85;

    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: shouldReduceMotion ? "auto" : "280vh" }}
    >
      {/* Sticky Viewport Stage */}
      <div className="sticky top-20 sm:top-24 flex min-h-[580px] sm:min-h-[620px] flex-col justify-start items-center py-4">
        {/* Interactive Deck Control Tabs */}
        <div className="mb-6 sm:mb-8 flex items-center justify-center gap-1.5 sm:gap-2.5 rounded-full border border-border/80 dark:border-white/10 bg-card/80 dark:bg-[#181512]/80 p-1.5 backdrop-blur-xl shadow-md z-40">
          {STANCE_CARDS.map((card, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => scrollToCard(i)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 text-xs font-mono font-bold uppercase transition-all duration-300 ${
                  isActive
                    ? `${card.badgeBg} ${card.badgeColor} border ${card.badgeBorder} shadow-xs scale-105`
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-current animate-pulse" : "bg-muted-foreground/40"
                  }`}
                />
                <span>
                  {card.number}. {card.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3D Stack Stage */}
        <div
          className="relative w-full max-w-5xl"
          style={{
            perspective: "1200px",
            perspectiveOrigin: "50% 40%",
          }}
        >
          {shouldReduceMotion ? (
            /* Accessible / Reduced motion stacked view */
            <div className="space-y-6">
              {STANCE_CARDS.map((card, idx) => (
                <CardSurface key={card.id} card={card} index={idx} />
              ))}
            </div>
          ) : (
            /* True 3D Scroll-Driven Physical Card Stack */
            <div className="relative w-full" style={{ minHeight: "480px" }}>
              {/* Card 3 (EXTENDS) - Bottom Layer */}
              <motion.div
                style={{
                  y: card3Y,
                  scale: card3Scale,
                  zIndex: 10,
                  transformOrigin: "top center",
                }}
                className="absolute inset-x-0 top-0"
              >
                <CardSurface card={STANCE_CARDS[2]} index={2} />
              </motion.div>

              {/* Card 2 (CONTRADICTS) - Middle Layer */}
              <motion.div
                style={{
                  y: card2Y,
                  scale: card2Scale,
                  opacity: card2Opacity,
                  rotateX: card2RotateX,
                  zIndex: 20,
                  transformOrigin: "top center",
                }}
                className="absolute inset-x-0 top-0"
              >
                <CardSurface card={STANCE_CARDS[1]} index={1} />
              </motion.div>

              {/* Card 1 (SUPPORTS) - Top Layer */}
              <motion.div
                style={{
                  y: card1Y,
                  scale: card1Scale,
                  opacity: card1Opacity,
                  rotateX: card1RotateX,
                  zIndex: 30,
                  transformOrigin: "top center",
                }}
                className="absolute inset-x-0 top-0"
              >
                <CardSurface card={STANCE_CARDS[0]} index={0} />
              </motion.div>
            </div>
          )}
        </div>

        {/* Tactile Deck Depth Cue / Scroll Hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground/75 z-40">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Scroll down to peel through the 3D dialectic deck</span>
        </div>
      </div>
    </div>
  );
}
