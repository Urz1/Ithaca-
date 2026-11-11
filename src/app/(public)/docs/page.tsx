import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Database,
  GitBranch,
  Layers,
  Network,
  Search,
  Sparkles,
  Terminal,
  Workflow,
  CheckCircle2,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Header Banner */}
      <section className="relative overflow-hidden border-b border-border/80 dark:border-white/[0.08] bg-muted/20 py-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-20%,rgba(59,130,246,0.12),rgba(255,255,255,0))]" />

        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-0.5 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              Platform Reference
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              v0.3.0
            </Badge>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OpenAlex & S2 Active
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Ithaca Documentation & Architecture
          </h1>

          <p className="text-muted-foreground mt-3 max-w-3xl text-base sm:text-lg leading-relaxed">
            Understand how Ithaca ingests academic works, extracts verbatim citation sentences,
            infers epistemological stance edges, and renders 10,000+ node topologies at 60fps.
          </p>

          {/* Quick Jump Navigation Chips */}
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-medium">
            <a
              href="#overview"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              1. Overview
            </a>
            <a
              href="#ingestion"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              2. Dual Ingestion
            </a>
            <a
              href="#pipeline"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              3. Multi-Gate Pipeline
            </a>
            <a
              href="#taxonomy"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              4. Taxonomy Semantics
            </a>
            <a
              href="#shortcuts"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              5. Canvas Hotkeys
            </a>
            <a
              href="#api"
              className="rounded-lg border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              6. Programmatic API
            </a>
          </div>
        </div>
      </section>

      {/* Main Docs Content */}
      <div className="container mx-auto px-4 max-w-5xl py-12 space-y-16">
        {/* Section 1: Overview */}
        <section id="overview" className="scroll-mt-24 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Network className="h-4 w-4" />
            01 / System Overview
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            What is Ithaca?
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Ithaca is an exploratory citation graph engine that transforms raw academic bibliographies
            into structured dialectic networks. Traditional search tools treat every citation identically,
            creating an echo chamber where highly-cited flawed papers look indistinguishable from robust
            breakthroughs. Ithaca unpacks citations into three primary relational categories:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-emerald-400">SUPPORTS</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Replicates findings, verifies mathematical claims, or adopts identical experimental conclusions.
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-rose-400">CONTRADICTS</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Highlights replication drift, refutes empirical claims, or exposes methodological edge cases.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-sky-400">EXTENDS</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Broadens mathematical frameworks, adapts models to new domains, or scales dataset boundaries.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Dual Ingestion Architecture */}
        <section id="ingestion" className="scroll-mt-24 space-y-6 pt-4 border-t border-border/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Database className="h-4 w-4" />
            02 / Data Sources & Ingestion
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dual Ingestion Architecture
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Ithaca relies on two complementary open academic providers to achieve both wide topical coverage
            and deep semantic granularity:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-foreground">OpenAlex</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                  Topological Spine
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Provides canonical metadata for over 250 million academic publications, including DOIs, author
                lineages, institutional affiliations, open access URLs, and bi-directional citation counts.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground/90 font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  Fast global paper search & DOI lookup
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  Citation graph seed traversal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                  Concept tagging & field clustering
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-6 sm:p-7 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-lg font-bold text-foreground">Semantic Scholar</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  Sentence Contexts
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Extracts the literal in-text citation passages where author A mentions author B. These context
                sentences provide the empirical evidence used by our classification model.
              </p>
              <ul className="text-xs space-y-2 text-muted-foreground/90 font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  In-text citation excerpts & section headers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Highly influential citation indicators
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  TLDR synthesis fallbacks
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: Multi-Gate Stance Inference Pipeline */}
        <section id="pipeline" className="scroll-mt-24 space-y-6 pt-4 border-t border-border/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Workflow className="h-4 w-4" />
            03 / Multi-Gate Pipeline
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Multi-Gate Stance Inference
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            When a user expands a paper node in the graph, edges are resolved through an asynchronous multi-stage
            classifier designed to minimize latency while guaranteeing evidence provenance:
          </p>

          {/* Visual Pipeline Flow */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/70 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 font-mono font-bold text-xs shrink-0 mt-0.5">
                  G1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">PostgreSQL Edge Cache</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Checks indexed paper pairs in local PostgreSQL store. If an edge was previously classified with high confidence, returns in &lt;1ms.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-border/60 bg-muted/40 text-muted-foreground shrink-0 self-start md:self-auto">
                Sub-millisecond
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/70 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 font-mono font-bold text-xs shrink-0 mt-0.5">
                  G2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Citation Context Extraction</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pings Semantic Scholar Graph API with the citing paper&apos;s corpus ID to retrieve exact contextual sentences around the citation mark.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0 self-start md:self-auto">
                Contextual Gold
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/70 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 font-mono font-bold text-xs shrink-0 mt-0.5">
                  G3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Epistemic Stance Classifier</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Evaluates candidate sentences using strict dialectic prompts. Emits a stance token (`supports`, `contradicts`, `extends`, or `cites`) and calibrated confidence.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-400 shrink-0 self-start md:self-auto">
                Dialectic Inference
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/70 p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 font-mono font-bold text-xs shrink-0 mt-0.5">
                  G4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Abstract & Title Fallback</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If no citation sentence was extracted, the pipeline classifies based on abstract semantic overlap and marks the signal source as `abstract` with bounded confidence.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 shrink-0 self-start md:self-auto">
                Provenance Flagged
              </span>
            </div>
          </div>
        </section>

        {/* Section 4: Argumentation Taxonomy */}
        <section id="taxonomy" className="scroll-mt-24 space-y-6 pt-4 border-t border-border/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Layers className="h-4 w-4" />
            04 / Taxonomy Semantics
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Taxonomy & Confidence Calibration
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Edges on the canvas are visually distinguished by color, line stroke, and flow animation:
          </p>

          <div className="overflow-x-auto rounded-2xl border border-border/80 dark:border-white/[0.08]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/80 dark:border-white/[0.08]">
                <tr>
                  <th className="py-3 px-4">Stance</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4">Confidence Cutoff</th>
                  <th className="py-3 px-4">Typical In-Text Patterns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-white/[0.06] font-mono text-xs">
                <tr>
                  <td className="py-3 px-4 font-bold text-emerald-400">SUPPORTS</td>
                  <td className="py-3 px-4 text-muted-foreground">Emerald (#10b981)</td>
                  <td className="py-3 px-4 text-foreground">&ge; 70%</td>
                  <td className="py-3 px-4 font-sans text-muted-foreground">“replicates”, “confirms”, “consistent with”, “validates”</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-rose-400">CONTRADICTS</td>
                  <td className="py-3 px-4 text-muted-foreground">Rose (#f43f5e)</td>
                  <td className="py-3 px-4 text-foreground">&ge; 65%</td>
                  <td className="py-3 px-4 font-sans text-muted-foreground">“fails to replicate”, “contrary to”, “disputes”, “in contrast”</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-sky-400">EXTENDS</td>
                  <td className="py-3 px-4 text-muted-foreground">Sky (#0ea5e9)</td>
                  <td className="py-3 px-4 text-foreground">&ge; 70%</td>
                  <td className="py-3 px-4 font-sans text-muted-foreground">“generalizes”, “broadens”, “builds upon”, “expands”</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-muted-foreground">CITES / NEUTRAL</td>
                  <td className="py-3 px-4 text-muted-foreground">Slate (#94a3b8)</td>
                  <td className="py-3 px-4 text-foreground">Standard</td>
                  <td className="py-3 px-4 font-sans text-muted-foreground">“prior work”, “see also”, background mentions without stance</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5: Canvas Shortcuts */}
        <section id="shortcuts" className="scroll-mt-24 space-y-6 pt-4 border-t border-border/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Terminal className="h-4 w-4" />
            05 / Canvas Controls & Shortcuts
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Keyboard Shortcuts
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            The Ithaca WebGL canvas supports fluid single-key navigation designed for researcher flow:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "⌘ K / Ctrl K", desc: "Open global paper search & command palette" },
              { key: "Escape", desc: "Deselect active paper / close inspector panel" },
              { key: "F", desc: "Toggle ForceAtlas2 physics simulation on/off" },
              { key: "R", desc: "Reset camera to bounding box of active cluster" },
              { key: "S", desc: "Toggle multi-node box selection mode" },
              { key: "Click + Drag", desc: "Pan camera across dense citation networks" },
              { key: "Scroll", desc: "Smooth zoom with dynamic LOD node labeling" },
              { key: "?", desc: "Open interactive keyboard shortcut overlay" },
            ].map(({ key, desc }) => (
              <div
                key={key}
                className="rounded-xl border border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] p-3.5 flex items-center justify-between gap-3 shadow-xs"
              >
                <span className="text-xs text-muted-foreground">{desc}</span>
                <kbd className="rounded-md border border-border bg-muted/80 px-2 py-1 font-mono text-[11px] font-semibold text-foreground shadow-xs shrink-0">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Programmatic API */}
        <section id="api" className="scroll-mt-24 space-y-6 pt-4 border-t border-border/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-primary uppercase">
            <Code2 className="h-4 w-4" />
            06 / Programmatic Access
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Research API Endpoints
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            Academic labs and bibliometric researchers can query Ithaca&apos;s classification pipeline directly.
          </p>

          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-[#0c0d11] p-5 font-mono text-xs overflow-x-auto shadow-inner space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 dark:border-white/[0.08] pb-2 text-[11px] text-muted-foreground">
              <span>POST /api/research/stance</span>
              <span className="text-emerald-400">200 OK JSON</span>
            </div>

            <pre className="text-foreground/90 leading-relaxed">
{`curl -X POST https://ithaca.science/api/research/stance \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceDoi": "10.1038/s41562-018-0506-1",
    "targetDoi": "10.1177/0956797617753176",
    "includeEvidence": true
  }'`}
            </pre>
          </div>

          <div className="rounded-2xl border border-border/80 dark:border-white/[0.08] bg-card/60 p-5 space-y-2">
            <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              Example Response Payload
            </h4>
            <pre className="text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">
{`{
  "stance": "contradicts",
  "confidence": 0.941,
  "signalSource": "citation_context",
  "excerpt": "Applying specification curve analysis to the same cohort indicates that the reported association is statistically indistinguishable from background noise.",
  "source": { "authors": ["Przybylski", "Weinstein"], "year": 2019 },
  "target": { "authors": ["Twenge", "Joiner"], "year": 2018 }
}`}
            </pre>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 dark:border-white/[0.08]">
          <Link href="/about">
            <Button variant="ghost" className="gap-2 text-xs font-mono">
              ← About Ithaca Philosophy
            </Button>
          </Link>
          <Link href="/">
            <Button className="gap-2 h-11 px-6 shadow-sm">
              Launch Graph Explorer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

