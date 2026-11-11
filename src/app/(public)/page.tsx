"use client";

import { useState } from "react";
import { useAnimationPause } from "@/hooks/useAnimationPause";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { OnboardingDialog } from "@/components/auth/onboarding-dialog";
import {
  ArrowRight,
  Search,
  MousePointerClick,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Shield,
  Users,
  BookOpen,
  GraduationCap,
  FileText,
  Play,
  AlertTriangle,
  GitFork,
  ExternalLink,
  Check,
  X,
  Lock,
} from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { GraphConstellation } from "@/components/visual/graph-constellation";
import { AnimatedDemo } from "@/components/landing/animated-demo";
import { PLAN_ENTITLEMENTS } from "@/lib/platform/org-plans";

// Features data
const FEATURES = [
  {
    icon: <CheckCircle2 className="text-supports h-5 w-5" />,
    badgeColor: "bg-supports/15 text-supports border-supports/25",
    title: "Argument Visualization",
    description:
      "Instantly distinguish papers that support, contradict, or extend each other. Navigate the genuine consensus landscape beyond citation counts.",
  },
  {
    icon: <FileText className="text-primary h-5 w-5" />,
    badgeColor: "bg-primary/15 text-primary border-primary/25",
    title: "Passage-Level Citations",
    description:
      "Click any edge to reveal the exact source passages establishing the relationship. Complete transparency and verified evidentiary provenance.",
  },
  {
    icon: <Sparkles className="text-accent-foreground h-5 w-5" />,
    badgeColor: "bg-accent text-accent-foreground border-border",
    title: "AI Confidence Reasoning",
    description:
      "Every inferred relationship provides machine confidence scores, methodological nuance, and contextual reasoning so you know why connections exist.",
  },
  {
    icon: <MousePointerClick className="text-extends h-5 w-5" />,
    badgeColor: "bg-extends/15 text-extends border-extends/25",
    title: "Dynamic Graph Canvas",
    description:
      "Interactive spatial layout with GPU acceleration, pan-and-zoom controls, radial expansion, and keyboard shortcuts built for deep exploration.",
  },
  {
    icon: <Users className="text-primary h-5 w-5" />,
    badgeColor: "bg-primary/15 text-primary border-primary/25",
    title: "Collaborative Landscapes",
    description:
      "Save curated research maps, export high-resolution vector figures for publications or grant proposals, and share live canvases with collaborators.",
  },
  {
    icon: <Shield className="text-supports h-5 w-5" />,
    badgeColor: "bg-supports/15 text-supports border-supports/25",
    title: "Team & Lab Workspaces",
    description:
      "Organization-scoped domains, RBAC roles (Owner, Admin, Member, Viewer), and centralized AI compute quotas tailored for academic groups.",
  },
];

// How it works steps
const STEPS = [
  {
    step: "01",
    title: "Query any domain",
    description:
      "Enter a research hypothesis, seminal paper DOI, or emerging scientific question to seed the graph.",
    icon: Search,
  },
  {
    step: "02",
    title: "Explore the discourse",
    description:
      "Navigate an argumentation-aware topological network showing how papers validate, challenge, or extend one another.",
    icon: MousePointerClick,
  },
  {
    step: "03",
    title: "Synthesize breakthroughs",
    description:
      "Identify open debates, uncover hidden contradictions, and isolate unexplored research gaps in minutes.",
    icon: Lightbulb,
  },
];

// Use cases
const USE_CASES = [
  {
    icon: GraduationCap,
    badge: "EARLY CAREER",
    title: "PhD Students & Postdocs",
    description:
      "Master a new research domain in days rather than months. Grasp foundational debates and avoid building on debunked methodologies.",
  },
  {
    icon: Users,
    badge: "LAB GROUPS",
    title: "Research Teams & PIs",
    description:
      "Accelerate collaborative literature reviews. Map competitive landscapes, synchronize lab findings, and pool institutional knowledge.",
  },
  {
    icon: BookOpen,
    badge: "RESEARCH STRATEGY",
    title: "Grant Writers & Reviewers",
    description:
      "Demonstrate empirical novelty with precise epistemological mapping. Cite foundational consensus and highlight unmet scientific needs.",
  },
];

export default function Home() {
  useAnimationPause();

  const [showSignIn, setShowSignIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden py-20 sm:py-24 md:py-32 lg:py-36">
        {/* Subtle Atmospheric Lighting & Grid Overlay */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.12),transparent_70%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.18),transparent_70%)]" />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[850px] rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl opacity-60" />
        </div>

        <GraphConstellation className="pointer-events-none opacity-30 dark:opacity-50" />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <Stagger className="mx-auto max-w-4xl space-y-6 sm:space-y-8 text-center">
            {/* Announcement Badge */}
            <StaggerItem>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-border/80 dark:border-white/10 bg-muted/40 dark:bg-white/[0.04] px-4 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground shadow-xs backdrop-blur-md transition-colors hover:border-border hover:bg-muted/60">
                <span className="relative flex h-2 w-2">
                  <span className="bg-emerald-500 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                  <span className="bg-emerald-500 relative inline-flex h-2 w-2 rounded-full" />
                </span>
                <span>Beyond citations. Understand the debate.</span>
              </span>
            </StaggerItem>

            {/* Main Headline */}
            <StaggerItem>
              <h1 className="text-4xl leading-[1.08] font-black tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Navigate any research field in{" "}
                <span className="from-primary via-indigo-500 to-cyan-400 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-gradient-to-r bg-clip-text text-transparent">
                  minutes, not months
                </span>
              </h1>
            </StaggerItem>

            {/* Subheadline */}
            <StaggerItem>
              <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed font-normal">
                Ithaca maps how scientific papers{" "}
                <strong className="text-emerald-500 dark:text-emerald-400 font-semibold">support</strong>
                ,{" "}
                <strong className="text-rose-500 dark:text-rose-400 font-semibold">
                  contradict
                </strong>
                , and{" "}
                <strong className="text-sky-500 dark:text-sky-400 font-semibold">extend</strong>{" "}
                each other so you see the real scientific conversation, not just
                references.
              </p>
            </StaggerItem>

            {/* CTAs */}
            <StaggerItem>
              <div className="flex flex-col items-center justify-center gap-3.5 sm:gap-4 pt-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-13 gap-2 rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-xl shadow-foreground/10 transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowSignIn(true)}
                >
                  <span>Start Exploring Free</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 gap-2 rounded-full border-border/80 dark:border-white/10 bg-background/60 dark:bg-white/[0.04] px-7 text-base font-medium backdrop-blur-md transition-all hover:bg-muted/80 dark:hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() =>
                    document
                      .getElementById("demo")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <Play className="h-4 w-4 fill-current opacity-80" />
                  <span>Interactive Demo</span>
                </Button>
              </div>
            </StaggerItem>

            {/* Trust note */}
            <StaggerItem>
              <div className="flex items-center justify-center gap-2 pt-2 text-xs sm:text-sm text-muted-foreground/75 tracking-normal flex-wrap font-medium">
                <span>Free for researchers</span>
                <span className="opacity-40">•</span>
                <span>No credit card required</span>
                <span className="opacity-40">•</span>
                <span>Instant access</span>
              </div>
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      {/* ===== EARLY ACCESS NOTE ===== */}
      <section className="border-y border-border/60 dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] py-4 sm:py-4.5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3 text-center sm:flex-row">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                BUILDING IN PUBLIC
              </span>
              <span className="text-muted-foreground text-xs sm:text-sm">
                Ithaca is in active development. We are rolling out epistemic
                intelligence features continuously with our scientific community.
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== PROBLEM-AGITATION-SOLUTION ===== */}
      <section className="relative py-24 sm:py-28 md:py-36 overflow-hidden">
        {/* Ambient Center Glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[750px] rounded-full bg-gradient-to-tr from-rose-500/5 via-primary/5 to-emerald-500/5 blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 md:mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  THE SCIENTIFIC BOTTLENECK
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Why traditional literature review fails
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  Standard search engines index citations as flat hyperlinks.
                  They cannot tell you whether a citation confirmed an effect or
                  proved it was a statistical artifact.
                </p>
              </div>
            </Reveal>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
              {/* Problem Card */}
              <Reveal delay={0.1}>
                <div className="relative flex h-full flex-col rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-10 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-rose-500/30 hover:shadow-rose-500/5 group overflow-hidden">
                  {/* Subtle corner crimson ambient glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-60"
                  />

                  <div className="mb-6 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-rose-400 uppercase">
                      The Status Quo
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-400 shadow-inner">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                    The Blind Citation Network
                  </h3>
                  <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
                    Researchers sift through hundreds of papers in isolation.
                    Citation counts show fame, not reproducibility, hiding
                    critical refutations beneath mountains of publications.
                  </p>
                  <ul className="text-muted-foreground mt-auto space-y-4 pt-6 border-t border-border/60 dark:border-white/[0.06] text-sm leading-relaxed">
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-400">
                        <X className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-muted-foreground/90">
                        Months lost pursuing hypotheses already contradicted in
                        the literature.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-400">
                        <X className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-muted-foreground/90">
                        No passage-level transparency—you must read entire PDFs
                        to locate the claim context.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-400">
                        <X className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span className="text-muted-foreground/90">
                        Isolated, siloed researcher notes with zero shared lab
                        topography.
                      </span>
                    </li>
                  </ul>
                </div>
              </Reveal>

              {/* Solution Card */}
              <Reveal delay={0.2}>
                <div className="relative flex h-full flex-col rounded-3xl border-2 border-emerald-500/35 dark:border-emerald-500/40 bg-card/90 dark:bg-gradient-to-b dark:from-[#0e1715]/95 dark:via-[#0b1210]/95 dark:to-[#080d0b]/95 p-8 sm:p-10 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/60 hover:shadow-emerald-500/15 group overflow-hidden">
                  {/* Subtle corner emerald ambient glow */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl transition-opacity group-hover:opacity-100 opacity-80"
                  />

                  <div className="mb-6 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-emerald-400 uppercase shadow-xs">
                      The Ithaca Standard
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-inner">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="mb-3 text-2xl font-bold tracking-tight text-foreground">
                    The Epistemic Discourse Map
                  </h3>
                  <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
                    AI models parse scientific discourse into structured
                    argumentation semantics. Instantly trace consensus, locate
                    disputes, and understand methodological divergence.
                  </p>
                  <ul className="text-foreground/95 mt-auto space-y-4 pt-6 border-t border-emerald-500/20 text-sm leading-relaxed">
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span>
                        Real-time classification into Supports, Contradicts, and
                        Extends relationships.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span>
                        Direct citation text snippets and evidentiary reasoning
                        for every connection.
                      </span>
                    </li>
                    <li className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span>
                        Persistent, team-scoped graphs that compound knowledge
                        across entire research groups.
                      </span>
                    </li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===== EDGE TYPE VISUALIZATION ===== */}
      <section className="bg-muted/10 border-border/70 dark:border-white/[0.06] dark:bg-white/[0.01] border-y py-24 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 md:mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  ARGUMENTATION TAXONOMY
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Three relationships that unlock the conversation
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  Every edge in Ithaca represents a peer-reviewed scientific stance,
                  giving you instant clarity on how claims evolve.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Supports */}
              <Reveal delay={0.1}>
                <div className="epistemic-card relative flex h-full flex-col rounded-3xl border border-emerald-500/25 dark:border-emerald-500/25 bg-card/90 dark:bg-gradient-to-b dark:from-emerald-500/[0.06] dark:via-card/90 dark:to-card/50 p-7 sm:p-8 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 group overflow-hidden">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 text-emerald-400 font-bold shadow-inner">
                      <Check className="h-5 w-5 stroke-[2.5]" />
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-emerald-400">
                      SUPPORTS
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">Supports</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    Papers providing confirming empirical evidence, replicated
                    findings, or theoretical validation of a preceding hypothesis.
                  </p>
                  <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-muted/50 dark:bg-black/40 p-4 text-xs leading-relaxed relative overflow-hidden">
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-emerald-500/60" />
                    <p className="text-muted-foreground font-mono pl-2">
                      <strong className="text-foreground">Przybylski 2019</strong>{" "}
                      <span className="text-emerald-500 dark:text-emerald-400 font-semibold">supports</span>{" "}
                      <strong className="text-foreground">Orben 2019</strong>
                    </p>
                    <p className="text-muted-foreground mt-1.5 italic pl-2">
                      “Confirms minimal negative effect size across independent cohorts.”
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Contradicts */}
              <Reveal delay={0.2}>
                <div className="epistemic-card relative flex h-full flex-col rounded-3xl border border-rose-500/25 dark:border-rose-500/25 bg-card/90 dark:bg-gradient-to-b dark:from-rose-500/[0.06] dark:via-card/90 dark:to-card/50 p-7 sm:p-8 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/10 group overflow-hidden">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-400 font-bold shadow-inner">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-rose-400">
                      CONTRADICTS
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">Contradicts</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    Papers challenging prior findings, presenting conflicting
                    measurements, or pinpointing methodological flaws in prior studies.
                  </p>
                  <div className="mt-auto rounded-2xl border border-rose-500/20 bg-muted/50 dark:bg-black/40 p-4 text-xs leading-relaxed relative overflow-hidden">
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-rose-500/60" />
                    <p className="text-muted-foreground font-mono pl-2">
                      <strong className="text-foreground">Przybylski 2019</strong>{" "}
                      <span className="text-rose-500 dark:text-rose-400 font-semibold">contradicts</span>{" "}
                      <strong className="text-foreground">Twenge 2018</strong>
                    </p>
                    <p className="text-muted-foreground mt-1.5 italic pl-2">
                      “Methodological dispute over specification curve analysis.”
                    </p>
                  </div>
                </div>
              </Reveal>

              {/* Extends */}
              <Reveal delay={0.3}>
                <div className="epistemic-card relative flex h-full flex-col rounded-3xl border border-sky-500/25 dark:border-sky-500/25 bg-card/90 dark:bg-gradient-to-b dark:from-sky-500/[0.06] dark:via-card/90 dark:to-card/50 p-7 sm:p-8 backdrop-blur-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/40 hover:shadow-xl hover:shadow-sky-500/10 group overflow-hidden">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/15 text-sky-400 font-bold shadow-inner">
                      <GitFork className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-sky-400">
                      EXTENDS
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold tracking-tight text-foreground">Extends</h3>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    Papers generalizing previous models, expanding experimental
                    paradigms to new domains, or building on foundational protocols.
                  </p>
                  <div className="mt-auto rounded-2xl border border-sky-500/20 bg-muted/50 dark:bg-black/40 p-4 text-xs leading-relaxed relative overflow-hidden">
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-sky-500/60" />
                    <p className="text-muted-foreground font-mono pl-2">
                      <strong className="text-foreground">Schaeffer 2023</strong>{" "}
                      <span className="text-sky-500 dark:text-sky-400 font-semibold">extends</span>{" "}
                      <strong className="text-foreground">Wei 2022</strong>
                    </p>
                    <p className="text-muted-foreground mt-1.5 italic pl-2">
                      “Re-evaluates scaling laws with continuous metric resolutions.”
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 sm:py-28 md:py-36">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 md:mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  STREAMLINED WORKFLOW
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  How Ithaca accelerates discovery
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  From initial curiosity to high-confidence literature synthesis in three steps
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <Reveal key={step.step} delay={index * 0.1}>
                  <div className="relative flex h-full flex-col rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-9 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 group">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-inner">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-primary tracking-widest">
                        {step.step}
                      </span>
                    </div>

                    <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>

                    {/* Subtle connector accent between cards on desktop */}
                    {index < STEPS.length - 1 && (
                      <div className="border-border/60 dark:border-white/10 absolute top-1/2 -right-4 hidden w-8 border-t-2 border-dashed md:block pointer-events-none" />
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section className="bg-muted/10 border-border/70 dark:border-white/[0.06] dark:bg-white/[0.01] border-y py-24 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 md:mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  ENTERPRISE-GRADE CAPABILITIES
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Everything you need to navigate research
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  Engineered specifically for academic labs, principal investigators, and PhD researchers
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <Reveal key={feature.title} delay={index * 0.05}>
                  <div className="relative flex h-full flex-col rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-7 sm:p-8 shadow-md backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-border dark:hover:border-white/20 hover:shadow-xl">
                    <div
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-inner ${feature.badgeColor}`}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="mb-2.5 text-lg font-bold tracking-tight text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCT DEMO / CANVAS FRAME ===== */}
      <section id="demo" className="scroll-mt-20 py-24 sm:py-28 md:py-36">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  LIVE INTERACTIVE DEMO
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  See Ithaca in action
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  Watch our epistemological engine unpack complex research controversies in real time
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              {/* Sleek MacOS / Research Workstation Window Frame */}
              <div className="demo-window-frame border border-border/80 dark:border-white/[0.1] bg-card relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl">
                {/* Window Chrome Header Bar */}
                <div className="border-b border-border/70 dark:border-white/[0.08] bg-muted/50 dark:bg-muted/30 flex items-center justify-between px-4 sm:px-6 py-3.5 backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80 shadow-xs" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80 shadow-xs" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-xs" />
                  </div>
                  <div className="border border-border/70 dark:border-white/10 bg-background/80 text-muted-foreground flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-mono shadow-xs">
                    <Search className="h-3 w-3 opacity-70" />
                    <span className="hidden sm:inline">ithaca.app/canvas/screen-time-development</span>
                    <span className="sm:hidden">ithaca.app/canvas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="bg-emerald-500 absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                      <span className="bg-emerald-500 relative inline-flex h-2 w-2 rounded-full" />
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">Live Canvas</span>
                  </div>
                </div>

                {/* Animated product demo inside */}
                <div className="relative">
                  <AnimatedDemo />
                </div>
              </div>

              {/* CTA below demo */}
              <div className="mt-10 sm:mt-12 flex flex-col items-center justify-center gap-3.5 sm:gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-13 gap-2 rounded-full bg-foreground px-8 text-base font-semibold text-background shadow-xl shadow-foreground/10 transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowSignIn(true)}
                >
                  <span>Explore This Graph Live</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-13 gap-2 rounded-full border-border/80 dark:border-white/10 bg-background/60 dark:bg-white/[0.04] px-7 text-base font-medium backdrop-blur-md transition-all hover:bg-muted/80 dark:hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Link href="/docs">
                    <span>Read Methodology</span>
                    <ExternalLink className="h-4 w-4 opacity-75" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="bg-muted/10 border-border/70 dark:border-white/[0.06] dark:bg-white/[0.01] border-y py-24 sm:py-28 md:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div className="mb-14 sm:mb-16 md:mb-20 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                  TAILORED FOR ACADEMIA
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                  Built for every stage of scientific inquiry
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                  Whether formulating your first dissertation proposal or running an international lab
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
              {USE_CASES.map((useCase, index) => (
                <Reveal key={useCase.title} delay={index * 0.1}>
                  <div className="relative flex h-full flex-col rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-9 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-border dark:hover:border-white/20 hover:shadow-xl">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-inner">
                        <useCase.icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-3 py-1 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                        {useCase.badge}
                      </span>
                    </div>
                    <h3 className="mb-3 text-xl font-bold tracking-tight text-foreground">{useCase.title}</h3>
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="py-24 sm:py-28 md:py-36">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 sm:mb-20 max-w-3xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/80 dark:border-white/10 bg-muted/50 dark:bg-white/[0.04] px-4 py-1 text-[11px] font-bold tracking-widest text-muted-foreground uppercase shadow-xs backdrop-blur-md mb-5">
                TRANSPARENT SUBSCRIPTION TIERS
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground leading-[1.15]">
                Plans that match how research teams work
              </h2>
              <p className="mx-auto mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed font-normal">
                Start free as an individual researcher. Upgrade to Lab or
                Institution when your research team requires shared workspaces,
                domain-gated invites, and unified AI compute.
              </p>
            </Reveal>
          </div>

          {/* Stagger grid with generous top padding to ensure floating badge is never clipped */}
          <Stagger className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3 pt-8 pb-4 items-stretch">
            {(
              [
                PLAN_ENTITLEMENTS.SOLO,
                PLAN_ENTITLEMENTS.LAB,
                PLAN_ENTITLEMENTS.INSTITUTION,
              ] as const
            ).map((plan) => {
              const isLab = plan.id === "LAB";
              return (
                <StaggerItem key={plan.id}>
                  <div
                    className={`relative flex h-full flex-col rounded-3xl p-8 sm:p-9 md:p-10 backdrop-blur-xl transition-all duration-300 ${
                      isLab
                        ? "border-2 border-primary/50 dark:border-primary/50 bg-card/95 dark:bg-gradient-to-b dark:from-primary/[0.08] dark:via-[#11131a]/95 dark:to-[#0c0d12]/95 shadow-2xl shadow-primary/10 ring-4 ring-primary/10 hover:border-primary hover:shadow-primary/20 md:-translate-y-2"
                        : "border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 shadow-lg hover:border-border dark:hover:border-white/20 hover:shadow-xl"
                    }`}
                  >
                    {isLab && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-foreground text-background px-4 py-1 text-[11px] font-bold tracking-wider uppercase shadow-lg">
                        RECOMMENDED FOR LABS
                      </div>
                    )}

                    <div className="mb-6">
                      <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                        {plan.label}
                      </p>
                      <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">{plan.priceLabel}</p>
                      <p className="text-muted-foreground mt-3 text-sm leading-relaxed min-h-[40px]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="my-6 h-px bg-border/60 dark:bg-white/[0.08]" />

                    <ul className="mb-8 flex-1 space-y-4 text-sm leading-relaxed">
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        </div>
                        <span className="text-muted-foreground/90">Up to {plan.maxMembers} team seats</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        </div>
                        <span className="text-muted-foreground/90">
                          {plan.collaborativeWorkspaces
                            ? "Shared lab workspaces"
                            : "Personal researcher workspace"}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        </div>
                        <span className="text-muted-foreground/90">
                          {plan.domainAllowlist
                            ? "Auto-join with university domain"
                            : "Standard email invitations"}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        </div>
                        <span className="text-muted-foreground/90">
                          {plan.maxAiRequests.toLocaleString()} AI inference units / mo
                        </span>
                      </li>
                      {plan.id === "INSTITUTION" && (
                        <li className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                          </div>
                          <span className="text-muted-foreground/90 font-medium">SSO / SAML university directory integration</span>
                        </li>
                      )}
                    </ul>

                    {plan.id === "SOLO" ? (
                      <Button
                        className="h-12 w-full gap-2 rounded-full bg-foreground text-background font-semibold text-sm shadow-md transition-all hover:bg-foreground/90 active:scale-[0.98]"
                        onClick={() => setShowSignIn(true)}
                      >
                        <span>Create Free Account</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : plan.id === "LAB" ? (
                      <Button
                        className="h-12 w-full gap-2 rounded-full bg-foreground text-background font-semibold text-sm shadow-xl shadow-foreground/15 transition-all hover:bg-foreground/90 active:scale-[0.98]"
                        onClick={() => setShowSignIn(true)}
                      >
                        <span>Start Lab Plan</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        asChild
                        className="h-12 w-full rounded-full border-border/80 dark:border-white/10 bg-background/50 dark:bg-white/[0.04] text-foreground font-semibold text-sm hover:bg-muted dark:hover:bg-white/[0.08] active:scale-[0.98] transition-all"
                      >
                        <Link href="/docs">Contact Institutional Sales</Link>
                      </Button>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* ===== FOUNDER TRUST / BUILT BY RHIZAN ===== */}
      <section className="border-t border-border/70 dark:border-white/[0.06] bg-muted/10 dark:bg-white/[0.01] py-18 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-4xl rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-10 shadow-lg backdrop-blur-xl">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
                <div className="flex -space-x-3 overflow-hidden">
                  <div className="border-background relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border-2 shadow-md">
                    <Image
                      src="/founders/abdulaziz_circle.png"
                      alt="Abdulaziz Isa — Technical & AI Lead"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="border-background relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border-2 shadow-md">
                    <Image
                      src="/founders/nebiyu_circle.png"
                      alt="Nebiyu Musbah — Business & Growth Lead"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="border-background relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border-2 shadow-md">
                    <Image
                      src="/founders/sadam_circle.png"
                      alt="Sadam Hussen — Operations & Finance Lead"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    Engineered by Rhizan Tech
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm leading-relaxed">
                    Epistemic Graph Intelligence • Built for researchers &
                    laboratories worldwide
                  </p>
                </div>
              </div>
              <Link href="/about">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full border-border/80 dark:border-white/10 bg-background/60 dark:bg-white/[0.04] px-5 py-5 text-xs sm:text-sm font-medium backdrop-blur-md transition-all hover:bg-muted/80 active:scale-95"
                >
                  <span>Meet the Founders</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden py-28 sm:py-32 md:py-40">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[800px] rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl opacity-60" />
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Reveal>
              <h2 className="mb-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                Ready to see scientific research differently?
              </h2>
              <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed font-normal">
                Join researchers using Ithaca to map consensus, uncover debates,
                and discover breakthroughs.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 gap-2 rounded-full bg-foreground px-10 text-base sm:text-lg font-semibold text-background shadow-2xl shadow-foreground/15 transition-all hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setShowSignIn(true)}
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== AUTH DIALOGS ===== */}
      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
