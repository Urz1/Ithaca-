import { Badge } from "@/components/ui/badge";
import { Sparkles, GitCommit, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ReleaseEntry {
  version: string;
  date: string;
  title: string;
  type: "Major" | "Feature" | "Performance" | "Patch";
  summary: string;
  items: {
    category: string;
    points: string[];
  }[];
}

const RELEASES: ReleaseEntry[] = [
  {
    version: "v0.3.0",
    date: "March 2026",
    title: "Epistemic 3D Taxonomy & Architecture Docs",
    type: "Major",
    summary:
      "A landmark release introducing interactive 3D layered taxonomy visualization, comprehensive developer documentation, enriched technical dispatches, and responsive UI craft.",
    items: [
      {
        category: "Visual Craft & 3D Layering",
        points: [
          "Interactive 3D stacked dialectic taxonomy (Supports, Contradicts, Extends) with depth z-index layering and hover fan-out physics.",
          "Dual view mode switcher: toggle between focused 3D Stack and wide Panoramic Matrix.",
          "Full dark and light mode contrast tuning meeting strict WCAG AA criteria.",
        ],
      },
      {
        category: "Documentation & Developer Portal",
        points: [
          "Complete documentation rewrite detailing OpenAlex and Semantic Scholar dual-ingestion architecture.",
          "Step-by-step multi-gate stance inference pipeline diagrams with latency indicators.",
          "Programmatic API specifications with curl and TypeScript response schemas.",
          "Keyboard shortcuts reference matrix with tactile keycap styling.",
        ],
      },
      {
        category: "Research Field Journal",
        points: [
          "Published technical deep-dive on GPU WebGL instancing and Web Worker physics.",
          "Added methodological guide on overcoming citation count bias with LLM stance extraction.",
          "Added product essay on cognitive ergonomics in dense citation networks.",
        ],
      },
    ],
  },
  {
    version: "v0.2.1",
    date: "February 2026",
    title: "Production Hardening & Fallback Pipelines",
    type: "Performance",
    summary:
      "Resilience updates to handle burst traffic from academic conferences, rate-limit backoffs, and deterministic build stabilization.",
    items: [
      {
        category: "Pipeline Resilience",
        points: [
          "Semantic Scholar API circuit breaker with exponential backoff on rate limits.",
          "Graceful fallback to abstract-based semantic classification when in-text sentences are unavailable.",
          "Added provenance flags to all classification payloads (`citation_context` vs `abstract_fallback`).",
        ],
      },
      {
        category: "Database & Builds",
        points: [
          "PostgreSQL connection pooling optimization for high-concurrency graph queries.",
          "Deterministic Next.js static asset build script ensuring zero-downtime serverless deployments.",
        ],
      },
    ],
  },
  {
    version: "v0.2.0",
    date: "February 2026",
    title: "Real Academic Data Pipeline",
    type: "Feature",
    summary:
      "Completed migration away from mock datasets: the entire platform now operates against real scholarly corpora with 250M+ indexed works.",
    items: [
      {
        category: "Live Scholarly Ingestion",
        points: [
          "OpenAlex integration for live paper search, author lineages, and global citation counts.",
          "Semantic Scholar citation context extraction with in-text snippet parsing.",
          "PostgreSQL database persistence for user workspaces, collections, and classified edges.",
          "Automated health monitor pings verifying upstream academic registry status.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0",
    date: "January 2026",
    title: "Initial Prototype & WebGL Canvas",
    type: "Major",
    summary:
      "First public release of Ithaca featuring GPU-accelerated force-directed graph rendering and dialectic edge inspection.",
    items: [
      {
        category: "Core Engine",
        points: [
          "Sigma.js v3 WebGL canvas capable of rendering 10,000+ paper nodes at 60fps.",
          "ForceAtlas2 physics layout executed in a separate Web Worker thread.",
          "Slide-over inspector panel with DOI links and paper metadata.",
          "Authentication system powered by Better Auth.",
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-border/80 dark:border-white/[0.08] bg-muted/20 py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-emerald-500 mb-6 shadow-xs font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Changelog & System Releases</span>
          </div>

          <h1 className="mb-4 text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Platform Evolution
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-base sm:text-lg leading-relaxed">
            Continuous engineering updates, pipeline enhancements, and release notes tracking the development of Ithaca.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 p-4 font-mono text-xs">
            <div>
              <span className="text-muted-foreground">Current: </span>
              <span className="font-bold text-foreground">v0.3.0</span>
            </div>
            <div className="hidden sm:block text-muted-foreground/40">•</div>
            <div>
              <span className="text-muted-foreground">Cadence: </span>
              <span className="font-bold text-foreground">Bi-Weekly</span>
            </div>
            <div className="hidden sm:block text-muted-foreground/40">•</div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-bold text-emerald-500">All Systems Operational</span>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="container mx-auto max-w-4xl px-4 py-16">
        <div className="relative border-l border-border/80 dark:border-white/[0.1] ml-4 sm:ml-8 space-y-16 pl-6 sm:pl-10">
          {RELEASES.map((rel) => (
            <div key={rel.version} className="relative group">
              {/* Timeline Indicator Dot */}
              <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>

              {/* Version Header */}
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {rel.title}
                </span>
                <Badge
                  variant={rel.type === "Major" ? "default" : "secondary"}
                  className="font-mono text-xs"
                >
                  {rel.version}
                </Badge>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                    rel.type === "Major"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : rel.type === "Performance"
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                      : "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {rel.type}
                </span>
                <span className="text-xs font-mono text-muted-foreground ml-auto">
                  {rel.date}
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
                {rel.summary}
              </p>

              {/* Categorized Changes Card */}
              <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-5 sm:p-6 backdrop-blur-md space-y-5">
                {rel.items.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-primary" />
                      {item.category}
                    </h3>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground pl-3">
                      {item.points.map((pt, pIdx) => (
                        <li key={pIdx} className="leading-relaxed flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation CTA */}
        <div className="mt-20 rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/60 p-8 sm:p-10 text-center backdrop-blur-md max-w-3xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
            Want to see these updates in action?
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Launch the Ithaca graph canvas and explore the real-time dialectic between scientific papers.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/">
              <Button className="gap-2 h-11 px-6 shadow-sm">
                Launch Graph Canvas <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline" className="gap-2 h-11 px-6">
                Read Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

