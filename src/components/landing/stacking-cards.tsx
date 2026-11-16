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
    badgeBg: "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black",
    badgeText: "",
    headline: "EMPIRICAL CONSENSUS",
    subheadline: "Direct Replication & Hypothesis Confirmation",
    description:
      "Craft high-confidence epistemic consensus with papers providing confirmed empirical replication across independent cohorts.",
    citingPaper: "Przybylski et al. (2019)",
    citedPaper: "Orben & Przybylski (2019)",
    venue: "Nature Human Behaviour",
    evidenceQuote:
      "“Replication across three large-scale independent cohort datasets (n=359,260) confirms minimal negative effect size.”",
    cardBg: "bg-[#FFFFFF] dark:bg-[#1D2520]",
    cardBorder: "border-stone-200 dark:border-emerald-500/25",
    topRim: "from-emerald-400 via-emerald-500 to-emerald-600",
    metricLabel: "Replication Confidence",
    metricValue: "98.4%",
  },
  {
    id: "contradicts",
    layerNum: "02",
    badge: "CONTRADICTS / DISPUTE",
    badgeBg: "bg-rose-600 text-white dark:bg-rose-500 dark:text-white",
    badgeText: "",
    headline: "SCIENTIFIC DISPUTES",
    subheadline: "Conflicting Findings & Methodological Flaws",
    description:
      "Identify conflicting findings, failure to replicate, or unaddressed confounding variables in earlier experimental pipelines.",
    citingPaper: "Przybylski & Weinstein (2019)",
    citedPaper: "Twenge et al. (2018)",
    venue: "Psychological Science",
    evidenceQuote:
      "“Specification curve analysis demonstrates that reported associations are statistically indistinguishable from noise.”",
    cardBg: "bg-[#FFFFFF] dark:bg-[#2A1D20]",
    cardBorder: "border-stone-200 dark:border-rose-500/35",
    topRim: "from-rose-400 via-rose-500 to-rose-600",
    metricLabel: "Divergence Index",
    metricValue: "Critical Friction",
  },
  {
    id: "extends",
    layerNum: "03",
    badge: "EXTENDS / ADVANCE",
    badgeBg: "bg-amber-600 text-white dark:bg-amber-500 dark:text-black",
    badgeText: "",
    headline: "METHODOLOGICAL ADVANCE",
    subheadline: "New Domains & Generalizing Frameworks",
    description:
      "Discover papers adopting algorithms or methods to cross into new scientific domains, expanding the boundary of the field.",
    citingPaper: "Schaeffer et al. (2023)",
    citedPaper: "Wei et al. (2022)",
    venue: "NeurIPS 2023 Oral",
    evidenceQuote:
      "“Generalizes emergent ability metrics by demonstrating that non-linear step shifts resolve to smooth scaling curves.”",
    cardBg: "bg-[#FFFFFF] dark:bg-[#182438]",
    cardBorder: "border-stone-200 dark:border-sky-500/35",
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
      className={`group relative h-[420px] sm:h-[450px] w-full cursor-pointer select-none rounded-[2rem] sm:rounded-[2.5rem] border ${card.cardBorder} ${card.cardBg} transition-all duration-500 overflow-hidden ${
        isTop
          ? "shadow-[0_2px_0_rgba(0,0,0,0.8),0_4px_0_rgba(0,0,0,0.7),0_6px_0_rgba(0,0,0,0.6),0_8px_0_rgba(0,0,0,0.5),0_30px_70px_-10px_rgba(28,24,21,0.45),0_60px_130px_-15px_rgba(28,24,21,0.35)] dark:shadow-[0_2px_0_rgba(0,0,0,0.95),0_4px_0_rgba(0,0,0,0.9),0_6px_0_rgba(0,0,0,0.85),0_8px_0_rgba(0,0,0,0.8),0_35px_80px_-10px_rgba(0,0,0,0.98),0_70px_140px_-15px_rgba(0,0,0,0.98),0_100px_180px_-20px_rgba(0,0,0,0.95)] ring-1 ring-black/10 dark:ring-white/25"
          : "shadow-[0_2px_0_rgba(0,0,0,0.7),0_4px_0_rgba(0,0,0,0.6),0_6px_0_rgba(0,0,0,0.5),0_20px_50px_-10px_rgba(28,24,21,0.35),0_45px_90px_-15px_rgba(28,24,21,0.25)] dark:shadow-[0_2px_0_rgba(0,0,0,0.9),0_4px_0_rgba(0,0,0,0.85),0_6px_0_rgba(0,0,0,0.8),0_25px_60px_-10px_rgba(0,0,0,0.95),0_50px_110px_-15px_rgba(0,0,0,0.95)] hover:brightness-105 dark:hover:brightness-110"
      }`}
      style={{
        borderBottom: "8px solid rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Top illuminated beveled rim */}
      <div
        aria-hidden
        className={`pointer-events-none absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${card.topRim}`}
      />

      {/* When the card is underneath, render deep ambient occlusion cast from the card above */}
      {isUnder ? (
        <>
          {/* Ambient occlusion shadow cast by upper card */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 via-black/40 to-transparent dark:from-black/95 dark:via-black/55 dark:to-transparent z-10"
          />

          {/* Pinned exposed bottom strip */}
          <div className="absolute inset-x-0 bottom-0 h-[125px] flex items-center justify-between px-7 sm:px-9 md:px-10 border-t border-border/80 dark:border-white/10 bg-inherit z-20">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-muted-foreground/80 dark:text-white/60 uppercase">
                LAYER 0{index + 1}
              </span>
              <div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tight text-foreground dark:text-white uppercase drop-shadow-md">
                  {card.headline}
                </h3>
                <p className="font-mono text-xs sm:text-sm font-semibold text-muted-foreground dark:text-white/80">
                  {card.subheadline}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs sm:text-sm font-black uppercase tracking-wider shadow-md ${card.badgeBg}`}
            >
              <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
              {card.badge}
            </span>
          </div>
        </>
      ) : (
        /* Full card view when active/on top */
        <div className="h-full flex flex-col justify-between p-7 sm:p-9 md:p-10">
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs font-black tracking-widest text-muted-foreground/80 dark:text-white/60 uppercase">
                LAYER 0{index + 1}/03
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs font-black uppercase tracking-wider shadow-md ${card.badgeBg}`}
              >
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                {card.badge}
              </span>
            </div>

            <h3 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-black italic tracking-tight text-foreground dark:text-white uppercase drop-shadow-md">
              {card.headline}
            </h3>
            <p className="mt-1 font-mono text-xs sm:text-sm font-semibold tracking-wide text-muted-foreground dark:text-white/80">
              {card.subheadline}
            </p>
          </div>

          <div className="space-y-3.5 my-3">
            <p className="text-sm sm:text-base text-foreground/90 dark:text-white/90 leading-relaxed font-normal">
              {card.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono text-foreground/90 dark:text-white/90">
              <span className="rounded-xl bg-muted/80 dark:bg-black/50 px-3.5 py-1.5 border border-border dark:border-white/10 font-semibold truncate max-w-[200px] sm:max-w-[240px]">
                {card.citingPaper}
              </span>
              <span className="text-primary dark:text-amber-400 font-black text-base">→</span>
              <span className="rounded-xl bg-muted/80 dark:bg-black/50 px-3.5 py-1.5 border border-border dark:border-white/10 font-semibold truncate max-w-[200px] sm:max-w-[240px]">
                {card.citedPaper}
              </span>
              <span className="ml-auto text-xs text-muted-foreground dark:text-white/60 font-medium">
                {card.venue}
              </span>
            </div>

            <div className="rounded-2xl bg-muted/50 dark:bg-black/50 border border-border/80 dark:border-white/8 p-3.5 sm:p-4 text-xs sm:text-sm italic text-foreground/85 dark:text-white/85 leading-relaxed">
              {card.evidenceQuote}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/70 dark:border-white/10 text-xs sm:text-sm font-mono">
            <span className="text-muted-foreground dark:text-white/70">
              {card.metricLabel}: <strong className="text-foreground dark:text-white">{card.metricValue}</strong>
            </span>
            <span className="flex items-center gap-1.5 text-primary dark:text-amber-400 font-bold group-hover:translate-x-1.5 transition-transform">
              <span>INSPECT TRAVERSAL</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
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
  const card1Y = useTransform(scrollYProgress, [0, 0.25, 0.45], [0, 0, -380]);
  const card1Z = useTransform(scrollYProgress, [0, 0.25, 0.45], [60, 60, 260]);
  const card1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.45], [1, 1, 0]);

  // Card 2 (Middle layer): steps forward to top position, then peels away
  const card2Y = useTransform(
    scrollYProgress,
    [0, 0.25, 0.45, 0.65, 0.85],
    [125, 125, 0, 0, -380]
  );
  const card2Z = useTransform(
    scrollYProgress,
    [0, 0.25, 0.45, 0.65, 0.85],
    [20, 20, 60, 60, 260]
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
    [250, 190, 125, 0]
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
      {/* Sticky Stage Viewport - Seamless with the page canvas, overflow visible */}
      <div className="sticky top-16 sm:top-20 flex min-h-[860px] sm:min-h-[940px] w-full flex-col items-center justify-center overflow-visible py-8 sm:py-12">
        {/* Vibrant Amber/Orange Backlight Glow matching reference image */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 h-[550px] w-[850px] sm:h-[650px] sm:w-[1100px] rounded-full bg-gradient-to-tr from-amber-500/40 via-orange-500/45 to-rose-600/30 blur-[130px] opacity-90"
        />

        {/* 3D Isometric Viewport Container */}
        <div className="relative flex w-full max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
          {/* Right-hand Layer Pagination */}
          <div className="absolute right-4 sm:right-10 lg:right-14 z-40 flex flex-col items-center gap-3 font-mono text-xs text-foreground/60 dark:text-white/50">
            <span
              style={{ writingMode: "vertical-rl" }}
              className="text-[11px] tracking-widest uppercase opacity-75 mb-1 rotate-180"
            >
              LAYERS 0{activeLayer + 1}/03
            </span>
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => jumpToLayer(i)}
                className={`h-3 w-3 rounded-full transition-all duration-300 ${
                  activeLayer === i
                    ? "bg-foreground dark:bg-white scale-125 shadow-[0_0_10px_rgba(255,255,255,0.9)]"
                    : "bg-foreground/25 dark:bg-white/30 hover:bg-foreground/50 dark:hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Isometric Deck Scene with Preserve-3D - Expansive Width */}
          <div
            className="relative flex w-full max-w-5xl items-center justify-center py-6"
            style={{
              perspective: "1600px",
              perspectiveOrigin: "50% 42%",
            }}
          >
            <div
              className="relative w-full max-w-[800px] lg:max-w-[880px] transition-transform duration-700 ease-out"
              style={{
                transformStyle: "preserve-3d",
                // Balanced isometric angle for high readability and expansive presence
                transform:
                  "rotateX(46deg) rotateY(4deg) rotateZ(-20deg)",
              }}
            >
              {shouldReduceMotion ? (
                <div className="space-y-8">
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
                  style={{ minHeight: "720px", transformStyle: "preserve-3d" }}
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
                    {/* Deep Volumetric Floor Shadow underneath Card 3 onto the desk */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -inset-x-8 -bottom-20 h-44 rounded-[3rem] bg-black/60 dark:bg-black/95 blur-3xl -z-10"
                      style={{ transform: "translateZ(-30px)" }}
                    />
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
                    {/* Sharp Contact Shadow from Card 2 onto Card 3 */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-2 -bottom-6 h-20 rounded-[2rem] bg-black/80 dark:bg-black/95 blur-xl -z-10"
                      style={{ transform: "translateZ(-25px)" }}
                    />
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
                    {/* Sharp Contact Shadow from Card 1 onto Card 2 */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-2 -bottom-6 h-20 rounded-[2rem] bg-black/85 dark:bg-black/95 blur-xl -z-10"
                      style={{ transform: "translateZ(-25px)" }}
                    />
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
        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-mono text-muted-foreground/75 dark:text-white/50 z-30">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
          <span>Scroll down to peel through the 3D isometric layers</span>
        </div>
      </div>
    </div>
  );
}
