"use client";

import { Reveal } from "@/components/motion";
import {
  FileText,
  Bookmark,
  Share2,
  Users,
  CheckCircle2,
  Download,
  ExternalLink,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";

export function WorkbenchBento() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* ========================================================================= */}
        {/* BENTO CELL 1: PASSAGE-LEVEL EVIDENTIARY GROUNDING (2 COLS)                */}
        {/* ========================================================================= */}
        <Reveal delay={0.05} className="md:col-span-2">
          <div className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E7E5E0] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 shadow-sm dark:shadow-none transition-all group overflow-hidden">
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Transparent Evidence
                  </span>
                </div>
                <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                  Passage Grounding
                </span>
              </div>

              {/* Realistic Paper Excerpt Inspector Specimen */}
              <div className="mt-5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/80 dark:bg-black/40 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-stone-500 dark:text-stone-400 pb-2.5 border-b border-stone-200/80 dark:border-white/5">
                  <span>Nature Human Behaviour (2019)</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                    DOI: 10.1038/s41562-018-0518-5
                  </span>
                </div>

                {/* Highlighted Passage Mockup */}
                <div className="mt-3 text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
                  <span>...specification curve analysis across three independent national cohort datasets (n=359,260) demonstrated that </span>
                  <mark className="bg-amber-200/80 dark:bg-amber-500/25 text-stone-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-medium">
                    “reported negative associations between digital technology and well-being are statistically indistinguishable from noise.”
                  </mark>
                  <span className="text-stone-400 dark:text-stone-500"> (Section 4.2, p. 176)</span>
                </div>

                {/* Metadata coordinate badges */}
                <div className="mt-3.5 pt-3 border-t border-stone-200/80 dark:border-white/5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/80 dark:bg-white/10 px-2 py-0.5 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                    Claim ID: #CLM-0982
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 px-2 py-0.5 text-[11px] font-semibold">
                    Contradicts Twenge et al.
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-stone-400 dark:text-stone-500">
                    98.4% Confidence
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E7E5E0] dark:border-white/10">
              <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Passage-Level Evidentiary Provenance
              </h3>
              <p className="mt-1.5 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
                Never read 40-page PDFs just to verify a claim. Ithaca extracts the exact sentence, paragraph coordinate, and empirical reasoning establishing every argumentative connection.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ========================================================================= */}
        {/* BENTO CELL 2: REFERENCE MANAGER SYNC (1 COL)                              */}
        {/* ========================================================================= */}
        <Reveal delay={0.1} className="md:col-span-1">
          <div className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E7E5E0] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 shadow-sm dark:shadow-none transition-all group overflow-hidden">
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Bookmark className="h-4 w-4" />
                  </span>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Integration
                  </span>
                </div>
                <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                  Zotero Sync
                </span>
              </div>

              {/* Live Library Sync Specimen */}
              <div className="mt-5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/80 dark:bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-sans text-xs font-semibold text-stone-800 dark:text-stone-200">
                      Zotero Collection
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-stone-400 dark:text-stone-500">
                    Auto-sync
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 font-mono text-xs text-stone-600 dark:text-stone-400">
                  <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-white/5 border border-stone-200/60 dark:border-white/5">
                    <span className="truncate max-w-[140px]">Adolescent Well-Being</span>
                    <span className="font-bold text-stone-900 dark:text-white">142 papers</span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-white/5 border border-stone-200/60 dark:border-white/5">
                    <span className="truncate max-w-[140px]">LLM Emergent Reasoning</span>
                    <span className="font-bold text-stone-900 dark:text-white">88 papers</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200 dark:border-white/5 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
                  <span>Graph auto-seeded</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E7E5E0] dark:border-white/10">
              <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Reference Manager Sync
              </h3>
              <p className="mt-1.5 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
                Import libraries from Zotero, Mendeley, or BibTeX files with one click. Ithaca parses your collection into an actionable discourse graph instantly.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ========================================================================= */}
        {/* BENTO CELL 3: DETERMINISTIC PUBLICATION EXPORT (1 COL)                    */}
        {/* ========================================================================= */}
        <Reveal delay={0.15} className="md:col-span-1">
          <div className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E7E5E0] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 shadow-sm dark:shadow-none transition-all group overflow-hidden">
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Download className="h-4 w-4" />
                  </span>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Export Ready
                  </span>
                </div>
                <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                  Vector & BibTeX
                </span>
              </div>

              {/* 1-Click Export Specimen */}
              <div className="mt-5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/80 dark:bg-black/40 p-4">
                <span className="font-sans text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Publication Formats
                </span>

                <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200">
                    <span className="font-bold">SVG</span>
                    <span className="text-[10px] text-stone-400">Vector</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200">
                    <span className="font-bold">PDF</span>
                    <span className="text-[10px] text-stone-400">Figure</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200">
                    <span className="font-bold">BibTeX</span>
                    <span className="text-[10px] text-stone-400">Citations</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-stone-200 dark:border-white/10 text-stone-800 dark:text-stone-200">
                    <span className="font-bold">JSON</span>
                    <span className="text-[10px] text-stone-400">Graph</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200 dark:border-white/5 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                  <span>Grant proposal ready</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">300 DPI</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E7E5E0] dark:border-white/10">
              <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Publication-Ready Export
              </h3>
              <p className="mt-1.5 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
                Generate high-resolution vector figures for submissions, export structured BibTeX trees, or embed interactive discourse maps in lab documentation.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ========================================================================= */}
        {/* BENTO CELL 4: LAB-WIDE SHARED TOPOGRAPHY (2 COLS)                          */}
        {/* ========================================================================= */}
        <Reveal delay={0.2} className="md:col-span-2">
          <div className="h-full flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-[#E7E5E0] dark:border-white/10 bg-white dark:bg-[#161514] p-6 sm:p-8 shadow-sm dark:shadow-none transition-all group overflow-hidden">
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5E0] dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Collaboration
                  </span>
                </div>
                <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                  Shared Lab Topology
                </span>
              </div>

              {/* Collaborative Presence Specimen */}
              <div className="mt-5 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/80 dark:bg-black/40 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 font-sans text-xs font-semibold border border-purple-200 dark:border-purple-800/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-ping" />
                      Stanford CogSci Lab Workspace
                    </span>
                    <span className="font-mono text-xs text-stone-400 dark:text-stone-500">
                      @stanford.edu
                    </span>
                  </div>

                  {/* Active Researcher Avatars */}
                  <div className="flex items-center -space-x-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-stone-900" title="Dr. S. Chen">
                      SC
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-stone-900" title="Alex Rivera">
                      AR
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-stone-900" title="Prof. K. Davies">
                      KD
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-300 dark:bg-stone-700 text-[10px] font-medium text-stone-700 dark:text-stone-300 ring-2 ring-white dark:ring-stone-900">
                      +4
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 p-3 rounded-lg bg-white dark:bg-white/5 border border-stone-200/80 dark:border-white/5 text-xs text-stone-600 dark:text-stone-300 flex items-center justify-between">
                  <span className="truncate">
                    <strong>Recent Annotation:</strong> “Added 4 contradictory replications to the adolescent screentime cluster.”
                  </span>
                  <span className="font-mono text-[11px] text-stone-400 shrink-0 ml-3">
                    2m ago
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E7E5E0] dark:border-white/10">
              <h3 className="text-xl font-bold text-stone-900 dark:text-white tracking-tight">
                Persistent Lab Knowledge Graphs
              </h3>
              <p className="mt-1.5 text-sm text-[#4B5563] dark:text-stone-400 leading-relaxed">
                Prevent siloed knowledge. When a student or postdoc uncovers a critical contradiction or methodology flaw, it immediately syncs across your entire research group’s shared workspace.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
