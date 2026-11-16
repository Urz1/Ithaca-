"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck, BookOpen, Layers } from "lucide-react";

export interface StanceCardData {
  id: "supports" | "contradicts" | "extends";
  layerNum: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  headline: string;
  subheadline: string;
  description: string;
  citingPaper: string;
  citedPaper: string;
  venue: string;
  evidenceQuote: string;
  cardBg: string;
  cardBorder: string;
  topRim: string;
  metricLabel: string;
  metricValue: string;
}

export const STANCE_CARDS: StanceCardData[] = [
  {
    id: "supports",
    layerNum: "01",
    badge: "SUPPORTS / 98.4%",
    badgeBg: "bg-emerald-500",
    badgeText: "text-black",
    headline: "EMPIRICAL CONSENSUS",
    subheadline: "Direct Replication & Hypothesis Confirmation",
    description:
      "Craft high-confidence epistemic consensus with papers providing confirmed empirical replication across independent cohorts.",
    citingPaper: "Przybylski et al. (2019)",
    citedPaper: "Orben & Przybylski (2019)",
    venue: "Nature Human Behaviour",
    evidenceQuote:
      "“Replication across three large-scale independent cohort datasets (n=359,260) confirms minimal negative effect size.”",
    cardBg: "bg-[#181614] dark:bg-[#141210]",
    cardBorder: "border-white/12",
    topRim: "from-emerald-400 via-emerald-500 to-emerald-600",
    metricLabel: "Replication Confidence",
    metricValue: "98.4%",
  },
  {
    id: "contradicts",
    layerNum: "02",
    badge: "CONTRADICTS / DISPUTE",
    badgeBg: "bg-rose-500",
    badgeText: "text-white",
    headline: "SCIENTIFIC DISPUTES",
    subheadline: "Conflicting Findings & Methodological Flaws",
    description:
      "Identify conflicting findings, failure to replicate, or unaddressed confounding variables in earlier experimental pipelines.",
    citingPaper: "Przybylski & Weinstein (2019)",
    citedPaper: "Twenge et al. (2018)",
    venue: "Psychological Science",
    evidenceQuote:
      "“Specification curve analysis demonstrates that reported associations are statistically indistinguishable from noise.”",
    cardBg: "bg-[#211B19] dark:bg-[#1C1614]",
    cardBorder: "border-rose-500/25",
    topRim: "from-rose-400 via-rose-500 to-rose-600",
    metricLabel: "Divergence Index",
    metricValue: "Critical Friction",
  },
  {
    id: "extends",
    layerNum: "03",
    badge: "EXTENDS / ADVANCE",
    badgeBg: "bg-amber-500",
    badgeText: "text-black",
    headline: "METHODOLOGICAL ADVANCE",
    subheadline: "New Domains & Generalizing Frameworks",
    description:
      "Discover papers adopting algorithms or methods to cross into new scientific domains, expanding the boundary of the field.",
    citingPaper: "Schaeffer et al. (2023)",
    citedPaper: "Wei et al. (2022)",
    venue: "NeurIPS 2023 Oral",
    evidenceQuote:
      "“Generalizes emergent ability metrics by demonstrating that non-linear step shifts resolve to smooth scaling curves.”",
    cardBg: "bg-[#161C26] dark:bg-[#121720]",
    cardBorder: "border-sky-500/25",
    topRim: "from-amber-400 via-amber-500 to-amber-600",
    metricLabel: "Generalization Scope",
    metricValue: "High Transfer",
  },
];

interface IsometricCardProps {
  card: StanceCardData;
  index: number;
  activeLayer: number;
  onClick: () => void;
}

function IsometricCardSurface({
  card,
  index,
  activeLayer,
  onClick,
}: IsometricCardProps) {
  const isTop = activeLayer === index;
  const isUnder = activeLayer < index;

  return (
    <div
      onClick={onClick}
      className={`group relative h-[310px] sm:h-[330px] w-full cursor-pointer select-none rounded-[2rem] border ${card.cardBorder} ${card.cardBg} p-7 sm:p-8 flex flex-col justify-between transition-all duration-500 ${
        isTop
          ? "shadow-[0_45px_110px_-15px_rgba(0,0,0,0.95),0_25px_50px_-10px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.22)] ring-1 ring-white/25"
          : "shadow-[0_35px_80px_-20px_rgba(0,0,0,0.95),0_18px_36px_-10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.08)] hover:brightness-110"
      }`}
      style={{
        borderBottom: "5px solid rgba(0, 0, 0, 0.7)",
      }}
    >
      {/* Top illuminated beveled rim */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 right-0 h-1.5 rounded-t-[2rem] bg-gradient-to-r ${card.topRim}`}
      />

      {/* When the card is underneath the top card, the exposed bottom strip shows its headline & badge! */}
      {isUnder ? (
        <div className="flex h-full flex-col justify-end pb-1">
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
            <div>
              <h3 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white uppercase drop-shadow-md">
                {card.headline}
              </h3>
              <p className="font-mono text-xs font-semibold text-white/60">
                {card.subheadline}
              </p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider shadow-md ${card.badgeBg} ${card.badgeText}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {card.badge}
            </span>
          </div>
        </div>
      ) : (
        /* Full card view when active/on top (matching Framer component layout) */
        <>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] font-black tracking-widest text-white/40 uppercase">
                LAYER 0{index + 1}/03
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-[11px] font-black uppercase tracking-wider shadow-md ${card.badgeBg} ${card.badgeText}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {card.badge}
              </span>
            </div>

            <h3 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tight text-white uppercase drop-shadow-md">
              {card.headline}
            </h3>
            <p className="mt-0.5 font-mono text-xs font-semibold tracking-wide text-white/70">
              {card.subheadline}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal line-clamp-2">
              {card.description}
            </p>

            <div className="flex items-center gap-2 text-xs font-mono text-white/90">
              <span className="rounded-lg bg-black/40 px-2.5 py-1 border border-white/10 font-semibold truncate max-w-[140px]">
                {card.citingPaper}
              </span>
              <span className="text-amber-400 font-black text-sm">→</span>
              <span className="rounded-lg bg-black/40 px-2.5 py-1 border border-white/10 font-semibold truncate max-w-[140px]">
                {card.citedPaper}
              </span>
              <span className="ml-auto text-[10px] text-white/50 font-medium">
                {card.venue}
              </span>
            </div>

            <div className="rounded-xl bg-black/50 border border-white/8 p-2 text-[11px] italic text-white/75 leading-relaxed line-clamp-1">
              {card.evidenceQuote}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
            <span className="text-white/60 text-[11px]">
              {card.metricLabel}: <strong className="text-white">{card.metricValue}</strong>
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-1 transition-transform text-[11px]">
              <span>INSPECT TRAVERSAL</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function StackingCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeLayer, setActiveLayer] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest < 0.35) {
        setActiveLayer(0);
      } else if (latest < 0.7) {
        setActiveLayer(1);
      } else {
        setActiveLayer(2);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Card 1 (Topmost layer): peels away upward on scroll
  const card1Y = useTransform(scrollYProgress, [0, 0.25, 0.45], [0, 0, -320]);
  const card1Z = useTransform(scrollYProgress, [0, 0.25, 0.45], [60, 60, 240]);
  const card1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.45], [1, 1, 0]);

  // Card 2 (Middle layer): steps forward to top position, then peels away
  const card2Y = useTransform(
    scrollYProgress,
    [0, 0.25, 0.45, 0.65, 0.85],
    [98, 98, 0, 0, -320]
  );
  const card2Z = useTransform(
    scrollYProgress,
    [0, 0.25, 0.45, 0.65, 0.85],
    [20, 20, 60, 60, 240]
  );
  const card2Opacity = useTransform(
    scrollYProgress,
    [0, 0.68, 0.85],
    [1, 1, 0]
  );

  // Card 3 (Bottom layer): steps forward to 2nd position, then to 1st
  const card3Y = useTransform(
    scrollYProgress,
    [0, 0.45, 0.65, 0.85],
    [196, 150, 98, 0]
  );
  const card3Z = useTransform(
    scrollYProgress,
    [0, 0.45, 0.65, 0.85],
    [-20, 0, 20, 60]
  );

  const jumpToLayer = (layerIndex: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const containerHeight = rect.height - window.innerHeight;

    let targetScroll = containerTop;
    if (layerIndex === 0) targetScroll = containerTop;
    else if (layerIndex === 1) targetScroll = containerTop + containerHeight * 0.48;
    else if (layerIndex === 2) targetScroll = containerTop + containerHeight * 0.88;

    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: shouldReduceMotion ? "auto" : "280vh" }}
    >
      {/* Sticky Stage Viewport */}
      <div className="sticky top-16 sm:top-20 flex min-h-[720px] sm:min-h-[780px] w-full flex-col items-center justify-center overflow-hidden py-8">
        {/* Warm Ambient Backlight Glow (matching user reference image) */}
        <div
          aria-hidden
          className="pointer-events-none absolute h-[480px] w-[600px] sm:h-[600px] sm:w-[740px] rounded-full bg-gradient-to-tr from-amber-600/35 via-orange-600/25 to-rose-600/15 blur-[130px] opacity-80"
        />

        {/* 3D Isometric Viewport Container */}
        <div className="relative flex w-full max-w-5xl items-center justify-center px-4">
          {/* Right-hand Layer Pagination (Matching Reference Image) */}
          <div className="absolute right-2 sm:right-6 z-40 flex flex-col items-center gap-3 font-mono text-xs text-foreground/60 dark:text-white/50">
            <span
              style={{ writingMode: "vertical-rl" }}
              className="text-[10px] tracking-widest uppercase opacity-75 mb-1 rotate-180"
            >
              LAYERS 0{activeLayer + 1}/03
            </span>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToLayer(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                  activeLayer === i
                    ? "bg-foreground dark:bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                    : "bg-foreground/25 dark:bg-white/30 hover:bg-foreground/50 dark:hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Isometric Deck Scene with Preserve-3D */}
          <div
            className="relative flex w-full max-w-2xl items-center justify-center py-6"
            style={{
              perspective: "1400px",
              perspectiveOrigin: "50% 45%",
            }}
          >
            <div
              className="relative w-full max-w-[560px] transition-transform duration-700 ease-out"
              style={{
                transformStyle: "preserve-3d",
                // Exact 3D Isometric Tilt Angle matching uploaded image
                transform:
                  "rotateX(52deg) rotateY(6deg) rotateZ(-26deg) scale(0.95)",
              }}
            >
              {shouldReduceMotion ? (
                <div className="space-y-6">
                  {STANCE_CARDS.map((card, i) => (
                    <IsometricCardSurface
                      key={card.id}
                      card={card}
                      index={i}
                      activeLayer={activeLayer}
                      onClick={() => setActiveLayer(i)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="relative w-full"
                  style={{ minHeight: "540px", transformStyle: "preserve-3d" }}
                >
                  {/* Layer 3: EXTENDS (Bottom Card) */}
                  <motion.div
                    style={{
                      y: card3Y,
                      z: card3Z,
                      zIndex: 10,
                      transformStyle: "preserve-3d",
                    }}
                    className="absolute inset-x-0 top-0"
                  >
                    <IsometricCardSurface
                      card={STANCE_CARDS[2]}
                      index={2}
                      activeLayer={activeLayer}
                      onClick={() => jumpToLayer(2)}
                    />
                  </motion.div>

                  {/* Layer 2: CONTRADICTS (Middle Card) */}
                  <motion.div
                    style={{
                      y: card2Y,
                      z: card2Z,
                      opacity: card2Opacity,
                      zIndex: 20,
                      transformStyle: "preserve-3d",
                    }}
                    className="absolute inset-x-0 top-0"
                  >
                    <IsometricCardSurface
                      card={STANCE_CARDS[1]}
                      index={1}
                      activeLayer={activeLayer}
                      onClick={() => jumpToLayer(1)}
                    />
                  </motion.div>

                  {/* Layer 1: SUPPORTS (Top Card) */}
                  <motion.div
                    style={{
                      y: card1Y,
                      z: card1Z,
                      opacity: card1Opacity,
                      zIndex: 30,
                      transformStyle: "preserve-3d",
                    }}
                    className="absolute inset-x-0 top-0"
                  >
                    <IsometricCardSurface
                      card={STANCE_CARDS[0]}
                      index={0}
                      activeLayer={activeLayer}
                      onClick={() => jumpToLayer(0)}
                    />
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tactile scroll hint */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-foreground/60 dark:text-white/50 z-30">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Scroll down to peel through the 3D isometric layers</span>
        </div>
      </div>
    </div>
  );
}
