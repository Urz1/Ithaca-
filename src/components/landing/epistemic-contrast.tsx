"use client";

import { useState } from "react";
import {
  FileText,
  Layers,
  Clock,
  ArrowUpRight,
  GitFork,
  Network,
  Scale,
  FileCheck2,
  Info,
} from "lucide-react";

interface NodeData {
  id: string;
  label: string;
  paper: string;
  stance: "contradicts" | "extends" | "supports";
  stanceLabel: string;
  color: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
}

const CITING_PAPERS: Record<string, NodeData> = {
  orben: {
    id: "orben",
    label: "Orben (2019)",
    paper: "Orben & Przybylski (2019) • Nature Human Behaviour",
    stance: "contradicts",
    stanceLabel: "Contradicts",
    color: "#DC2626", // red-600
    bgLight: "bg-red-50",
    bgDark: "dark:bg-red-950/40",
    borderLight: "border-red-200",
    borderDark: "dark:border-red-800/50",
  },
  vuorre: {
    id: "vuorre",
    label: "Vuorre (2021)",
    paper: "Vuorre et al. (2021) • Psychological Science",
    stance: "extends",
    stanceLabel: "Extends",
    color: "#D97706", // amber-600
    bgLight: "bg-amber-50",
    bgDark: "dark:bg-amber-950/40",
    borderLight: "border-amber-200",
    borderDark: "dark:border-amber-800/50",
  },
  przybylski: {
    id: "przybylski",
    label: "Przybylski (2019)",
    paper: "Przybylski & Weinstein (2019) • PNAS",
    stance: "supports",
    stanceLabel: "Supports",
    color: "#059669", // emerald-600
    bgLight: "bg-emerald-50",
    bgDark: "dark:bg-emerald-950/40",
    borderLight: "border-emerald-200",
    borderDark: "dark:border-emerald-800/50",
  },
};

export function EpistemicContrast() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="w-full relative">
      {/* Centered Desktop "VS" Divider Connector */}
      <div
        aria-hidden
        className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 items-center justify-center h-10 w-10 rounded-full border border-[#E7E5E0] dark:border-white/15 bg-white dark:bg-[#1A1918] shadow-md text-stone-500 dark:text-stone-400 font-sans text-xs font-semibold tracking-wider uppercase select-none pointer-events-none"
      >
        vs
      </div>

      {/* 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* ========================================================================= */}
        {/* PANE 01: CONVENTIONAL SEARCH (Demoted, Neutral Gray, Single Warning Mark) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-[#E7E5E0] dark:border-white/10 bg-[#FBFBFA] dark:bg-[#141413] p-6 sm:p-7 md:p-8 transition-colors">
          <div>
            {/* Header / Pane Label */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
              <h3 className="text-xl font-bold text-stone-700 dark:text-stone-200 tracking-tight">
                Conventional search
              </h3>
              <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
                Keyword index
              </span>
            </div>

            {/* Realistic Search Result Card */}
            <div className="mt-6 rounded-xl border border-[#E7E5E0] dark:border-white/10 bg-white dark:bg-[#1A1918] p-5">
              <h4 className="text-lg font-semibold text-stone-900 dark:text-stone-100 leading-[26px]">
                Association of Screen Time with Adolescent Psychological Well-Being
              </h4>
              <p className="mt-1 text-sm text-[#4B5563] dark:text-stone-400 leading-5">
                Twenge et al. (2018) • Clinical Psychological Science
              </p>
              <div className="mt-3 pt-3 border-t border-[#E7E5E0] dark:border-white/10 flex items-center justify-between">
                <a
                  href="#conventional-citations"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 dark:text-sky-400 hover:underline"
                >
                  Cited by 1,420 papers
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <span className="text-xs text-stone-400 dark:text-stone-500">
                  Flat hyperlink
                </span>
              </div>
            </div>

            {/* Single Focused Callout */}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 p-4">
              <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-red-600" />
              <p className="text-sm font-medium text-red-900 dark:text-red-300 leading-snug">
                42% of citing papers contradict this finding. Search shows none of it.
              </p>
            </div>
          </div>

          {/* Clean 3-Item Limitations List */}
          <div className="mt-8 pt-5 border-t border-[#E7E5E0] dark:border-white/10 space-y-3">
            <div className="flex items-start gap-3 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              <span>Conflates citation volume with scientific consensus</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
              <Layers className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              <span>Contradictions and caveats remain buried in 40-page PDFs</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
              <span>Researchers spend months pursuing debunked hypotheses</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 02: ITHACA (Elevated Surface, Interactive Graph, Stance Cards)        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl border border-[#E7E5E0] dark:border-white/15 bg-white dark:bg-[#1A1918] p-6 sm:p-7 md:p-8 shadow-xl shadow-stone-900/5 ring-1 ring-stone-900/5 dark:ring-white/10 relative transition-all">
          <div>
            {/* Header / Pane Label */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="font-bold text-xs">ι</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                  Ithaca
                </h3>
              </div>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Epistemic graph active
              </span>
            </div>

            {/* Interactive Mini Epistemic Graph */}
            <div className="mt-6 rounded-xl border border-[#E7E5E0] dark:border-white/10 bg-[#FAFAF7] dark:bg-[#141413] p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500 font-sans mb-2">
                <span>Interactive citation topology</span>
                <span className="italic">Click or hover node</span>
              </div>

              {/* Accessible Graph Container for >= 480px / sm */}
              <div
                role="img"
                aria-label="Interactive graph displaying citation relationships connected to Twenge et al. (2018): Orben contradicts, Vuorre extends, and Przybylski supports."
                className="hidden sm:block relative h-44 sm:h-48 w-full select-none"
              >
                {/* SVG Connecting Edges */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                  {/* Line to Orben (Contradicts - Top Right) */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="80%"
                    y2="24%"
                    stroke={CITING_PAPERS.orben.color}
                    strokeWidth={hoveredNode === "orben" ? 3 : 1.75}
                    strokeDasharray={hoveredNode === "orben" ? "none" : "3 3"}
                    className="transition-all duration-300 opacity-90"
                  />
                  {/* Line to Vuorre (Extends - Bottom Right) */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="80%"
                    y2="76%"
                    stroke={CITING_PAPERS.vuorre.color}
                    strokeWidth={hoveredNode === "vuorre" ? 3 : 1.75}
                    strokeDasharray={hoveredNode === "vuorre" ? "none" : "3 3"}
                    className="transition-all duration-300 opacity-90"
                  />
                  {/* Line to Przybylski (Supports - Left) */}
                  <line
                    x1="50%"
                    y1="50%"
                    x2="20%"
                    y2="50%"
                    stroke={CITING_PAPERS.przybylski.color}
                    strokeWidth={hoveredNode === "przybylski" ? 3 : 1.75}
                    strokeDasharray={hoveredNode === "przybylski" ? "none" : "3 3"}
                    className="transition-all duration-300 opacity-80"
                  />
                </svg>

                {/* Seed Node (Center: Twenge et al.) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="px-3 py-1.5 rounded-lg bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-semibold shadow-md border border-stone-700 dark:border-white/20 whitespace-nowrap">
                    Twenge (2018)
                  </div>
                  <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 mt-1">
                    Seed paper
                  </span>
                </div>

                {/* Node 1: Orben (Contradicts - Top Right) */}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredNode("orben")}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setHoveredNode(hoveredNode === "orben" ? null : "orben")}
                  className={`absolute right-2 sm:right-4 top-2 sm:top-3 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    hoveredNode === "orben"
                      ? "bg-red-600 text-white border-red-700 shadow-md scale-105"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                  Orben (2019) • Contradicts
                </button>

                {/* Node 2: Vuorre (Extends - Bottom Right) */}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredNode("vuorre")}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setHoveredNode(hoveredNode === "vuorre" ? null : "vuorre")}
                  className={`absolute right-2 sm:right-4 bottom-2 sm:bottom-3 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    hoveredNode === "vuorre"
                      ? "bg-amber-600 text-white border-amber-700 shadow-md scale-105"
                      : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                  Vuorre (2021) • Extends
                </button>

                {/* Node 3: Przybylski (Supports - Left) */}
                <button
                  type="button"
                  onMouseEnter={() => setHoveredNode("przybylski")}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => setHoveredNode(hoveredNode === "przybylski" ? null : "przybylski")}
                  className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    hoveredNode === "przybylski"
                      ? "bg-emerald-600 text-white border-emerald-700 shadow-md scale-105"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current mr-1.5" />
                  Przybylski • Supports
                </button>
              </div>

              {/* Simplified Vertical List under 480px / sm */}
              <div className="sm:hidden space-y-2 py-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-semibold">
                  <span>Twenge (2018)</span>
                  <span className="text-[10px] text-stone-300 dark:text-stone-600 font-normal">Seed paper</span>
                </div>
                <div className="pl-3 border-l-2 border-stone-200 dark:border-stone-800 space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setHoveredNode(hoveredNode === "orben" ? null : "orben")}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                      hoveredNode === "orben"
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                    }`}
                  >
                    <span>Orben & Przybylski (2019)</span>
                    <span className="font-semibold">Contradicts</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoveredNode(hoveredNode === "vuorre" ? null : "vuorre")}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                      hoveredNode === "vuorre"
                        ? "bg-amber-600 text-white border-amber-700"
                        : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    <span>Vuorre et al. (2021)</span>
                    <span className="font-semibold">Extends</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoveredNode(hoveredNode === "przybylski" ? null : "przybylski")}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium border text-left transition-colors ${
                      hoveredNode === "przybylski"
                        ? "bg-emerald-600 text-white border-emerald-700"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    <span>Przybylski (2019)</span>
                    <span className="font-semibold">Supports</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Two Stance Cards (Contradicts & Extends) */}
            <div className="mt-5 space-y-3.5">
              {/* Card 1: CONTRADICTS */}
              <div
                onMouseEnter={() => setHoveredNode("orben")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  hoveredNode === "orben"
                    ? "border-red-400 dark:border-red-500 bg-red-50/70 dark:bg-red-950/30 shadow-sm"
                    : "border-[#E7E5E0] dark:border-white/10 bg-[#FBFBFA] dark:bg-[#141413]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/80 dark:border-red-800/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                    Contradicts
                  </div>
                  <div
                    title="Algorithmic epistemic classification confidence based on citation context extraction"
                    className="inline-flex items-center gap-1 font-mono text-xs text-stone-500 dark:text-stone-400 cursor-help"
                  >
                    <span>98% confidence</span>
                    <Info className="h-3 w-3 text-stone-400" />
                  </div>
                </div>

                <h4 className="mt-2.5 text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                  Orben & Przybylski (2019)
                </h4>
                <p className="text-xs text-[#4B5563] dark:text-stone-400">
                  Nature Human Behaviour
                </p>

                {/* Excerpt quote with 2px left border */}
                <div className="mt-2.5 border-l-2 border-red-400/80 dark:border-red-500 pl-3">
                  <p className="italic text-sm text-[#4B5563] dark:text-stone-300 leading-relaxed font-sans">
                    “Specification curve analysis demonstrates that reported associations are statistically indistinguishable from noise.”
                  </p>
                </div>
              </div>

              {/* Card 2: EXTENDS */}
              <div
                onMouseEnter={() => setHoveredNode("vuorre")}
                onMouseLeave={() => setHoveredNode(null)}
                className={`rounded-xl border p-4 transition-all duration-200 ${
                  hoveredNode === "vuorre"
                    ? "border-amber-400 dark:border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-sm"
                    : "border-[#E7E5E0] dark:border-white/10 bg-[#FBFBFA] dark:bg-[#141413]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    Extends
                  </div>
                  <div
                    title="Algorithmic epistemic classification confidence based on citation context extraction"
                    className="inline-flex items-center gap-1 font-mono text-xs text-stone-500 dark:text-stone-400 cursor-help"
                  >
                    <span>94% confidence</span>
                    <Info className="h-3 w-3 text-stone-400" />
                  </div>
                </div>

                <h4 className="mt-2.5 text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                  Vuorre et al. (2021)
                </h4>
                <p className="text-xs text-[#4B5563] dark:text-stone-400">
                  Psychological Science
                </p>

                {/* Excerpt quote with 2px left border */}
                <div className="mt-2.5 border-l-2 border-amber-400/80 dark:border-amber-500 pl-3">
                  <p className="italic text-sm text-[#4B5563] dark:text-stone-300 leading-relaxed font-sans">
                    “Generalizes specification curves across 72 longitudinal cohorts, isolating adolescent developmental trajectories.”
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clean 3-Item Capabilities List */}
          <div className="mt-8 pt-5 border-t border-[#E7E5E0] dark:border-white/10 space-y-3">
            <div className="flex items-start gap-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Passage-level provenance pinpointing exact claim context</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              <Scale className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Automated stance classification (Supports, Contradicts, Extends)</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
              <Network className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Persistent, lab-wide graphs that compound over time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
