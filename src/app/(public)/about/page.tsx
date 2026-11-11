import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  Target,
  Zap,
  ShieldCheck,
  Cpu,
  Globe2,
  CheckCircle2,
  Share2,
  Sparkles,
  BookOpen,
  Layers,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/80 dark:border-white/[0.08] bg-muted/20 py-24">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

        <div className="container mx-auto px-4 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold tracking-wide text-primary mb-6 shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Open Epistemic Infrastructure</span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Mapping the dialectical topology of <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
              human scientific knowledge.
            </span>
          </h1>

          <p className="text-muted-foreground mx-auto max-w-3xl text-lg sm:text-xl leading-relaxed">
            Scientific progress does not occur in linear isolation—it advances through rigorous debate,
            methodological disputes, and empirical synthesis. Ithaca replaces opaque citation counts with
            an interactive, provenance-grounded map of scientific consensus.
          </p>

          {/* Metrics Ribbon */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-5 backdrop-blur-md text-left">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                250M+
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                Academic Works Indexed
              </div>
              <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                OpenAlex & Semantic Scholar
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-5 backdrop-blur-md text-left">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-500 font-mono">
                3 Vectors
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                Dialectic Stance Model
              </div>
              <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                Supports · Contradicts · Extends
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-5 backdrop-blur-md text-left">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-mono">
                60 FPS
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                WebGL Graph Canvas
              </div>
              <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                GPU-Instanced ForceAtlas2
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-5 backdrop-blur-md text-left">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary font-mono">
                100%
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                Provenance Grounding
              </div>
              <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                Verifiable Excerpt Links
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Dialectic Engine Section */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="text-primary inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <Target className="h-4 w-4" />
              The Core Problem
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Scientific knowledge is trapped in static, unlinked PDFs.
            </h2>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Every year, over five million research papers are published. Yet modern researchers still
              navigate literature using metrics designed in the 1960s: raw citation counts and journal impact
              factors that completely obscure whether a paper was cited to celebrate its breakthrough or to
              disprove its core methodology.
            </p>

            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Ithaca analyzes the actual text surrounding citation markers in academic publications. By
              classifying the epistemic relationship between citing and cited works, we construct an
              explorable topological map of scientific consensus and dispute.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/">
                <Button className="gap-2 h-11 px-6 shadow-sm">
                  Explore Citation Canvas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" className="gap-2 h-11 px-6">
                  <BookOpen className="h-4 w-4" />
                  Read Architecture Docs
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Dialectic Inspector Card */}
          <div className="relative rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-9 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl opacity-70" />

            <div className="mb-6 flex items-center justify-between border-b border-border/60 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-foreground">
                <Layers className="h-4 w-4 text-primary" />
                <span>Argumentation Taxonomy</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                Live Dialectic Engine
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 transition-all hover:bg-emerald-500/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    SUPPORTS
                  </span>
                  <span className="text-muted-foreground text-[11px]">Empirical Corroboration</span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs sm:text-[13px] leading-relaxed">
                  Validates core hypothesis with reproducible methodologies, independent cohort replications,
                  or direct mathematical proofs.
                </p>
                <div className="mt-2.5 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] font-mono text-muted-foreground/80">
                  <span>Vaswani 2017 → Radford 2018</span>
                  <span className="text-emerald-400 font-semibold">98.4% Confidence</span>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 transition-all hover:bg-rose-500/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    CONTRADICTS
                  </span>
                  <span className="text-muted-foreground text-[11px]">Methodological Dispute</span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs sm:text-[13px] leading-relaxed">
                  Surfaces replication failures, specification curve divergences, or empirical limits beneath
                  perceived consensus.
                </p>
                <div className="mt-2.5 pt-2 border-t border-rose-500/15 flex items-center justify-between text-[11px] font-mono text-muted-foreground/80">
                  <span>Przybylski 2019 → Twenge 2018</span>
                  <span className="text-rose-400 font-semibold">94.1% Confidence</span>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 transition-all hover:bg-sky-500/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-sky-400 font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    EXTENDS
                  </span>
                  <span className="text-muted-foreground text-[11px]">Theoretical Expansion</span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs sm:text-[13px] leading-relaxed">
                  Generalizes frameworks into new problem domains, scales experimental boundaries, or incorporates
                  complementary protocols.
                </p>
                <div className="mt-2.5 pt-2 border-t border-sky-500/15 flex items-center justify-between text-[11px] font-mono text-muted-foreground/80">
                  <span>Schaeffer 2023 → Wei 2022</span>
                  <span className="text-sky-400 font-semibold">96.7% Confidence</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Quote */}
      <section className="border-y border-border/80 dark:border-white/[0.08] bg-muted/15 dark:bg-white/[0.01] py-16">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <blockquote className="text-lg sm:text-xl md:text-2xl font-serif italic text-foreground/90 leading-relaxed">
            “The game of science is, in principle, without end. He who decides one day that scientific statements do
            not call for any further test, and that they can be regarded as finally verified, retires from the game.”
          </blockquote>
          <div className="mt-4 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Karl Popper · <span className="text-foreground font-semibold">The Logic of Scientific Discovery</span>
          </div>
        </div>
      </section>

      {/* Engineering Pillars Section */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="text-primary mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <Cpu className="h-4 w-4" />
            Engineering Standards
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Built for Scientific Rigor & Open Inquiry
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Our technical choices prioritize computational transparency, verifiable citations, and sub-second
            interactivity over opaque black-box metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border border-border/80 dark:border-white/[0.08] rounded-3xl p-8 shadow-sm backdrop-blur-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="mb-2 text-xs font-mono font-semibold tracking-wider text-blue-500 uppercase">
              Provenance
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">Zero-Hallucination Grounding</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every inferred edge provides verbatim citation sentences, paper DOIs, and confidence intervals.
              If contextual evidence is absent, Ithaca explicitly flags the edge rather than generating synthetic claims.
            </p>
          </div>

          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border border-border/80 dark:border-white/[0.08] rounded-3xl p-8 shadow-sm backdrop-blur-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
              <Zap className="h-6 w-6" />
            </div>
            <div className="mb-2 text-xs font-mono font-semibold tracking-wider text-emerald-500 uppercase">
              Performance
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">High-Throughput WebGL Engine</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Using Sigma.js v3 and custom GPU vertex shaders, our canvas renders 10,000+ nodes and 50,000+ edges at
              a sustained 60fps, with force-directed physics computed in dedicated Web Worker threads.
            </p>
          </div>

          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border border-border/80 dark:border-white/[0.08] rounded-3xl p-8 shadow-sm backdrop-blur-xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-inner">
              <Globe2 className="h-6 w-6" />
            </div>
            <div className="mb-2 text-xs font-mono font-semibold tracking-wider text-purple-500 uppercase">
              Open Science
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">Universal Open Registries</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We ingest and honor open academic corpora including OpenAlex, Semantic Scholar, and Crossref.
              Our taxonomy definitions and graph structures are published openly for reproducible scientific inquiry.
            </p>
          </div>
        </div>

        {/* Epistemic Principles Banner */}
        <div className="border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] mt-10 rounded-2xl p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Commitment to Epistemic Transparency
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                All algorithmic classifications are calibrated with confidence metrics, transparent source sentences,
                and open methodology documentation.
              </p>
            </div>
            <Link href="/blog/rendering-10000-nodes-at-60fps">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-mono whitespace-nowrap">
                Read Shader Deep Dive <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-24 text-center max-w-4xl">
        <h2 className="mb-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Ready to explore the literature?
        </h2>
        <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
          Start with any research topic or DOI, trace historical disputes, and uncover the theoretical foundation
          behind modern breakthroughs.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="h-12 px-8 font-medium">
              Start Exploring
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/changelog">
            <Button size="lg" variant="outline" className="h-12 px-8 font-medium">
              View Changelog
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

