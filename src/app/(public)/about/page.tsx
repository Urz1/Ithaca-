import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Target, Users, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="border-border bg-muted/20 border-b">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
            We're mapping the world's <br className="hidden md:block" />{" "}
            scientific knowledge.
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            Ithaca is building the most intuitive interface for exploring
            scientific debates. We help researchers navigate the complex web of
            citations, contradictions, and consensus.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <div className="text-primary inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <Target className="h-4 w-4" />
              Our Mission
            </div>
            <h2 className="text-3xl font-bold">
              Accelerating discovery by connecting the dots.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Scientific knowledge is fragmented across millions of static PDFs.
              Researchers spend countless hours tracing citations and
              reconstructing the history of ideas manually.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              We believe that by visualizing the relationships between papers
              who contradicted whom, who supported whom we can make the
              scientific process transparent and accessible to everyone.
            </p>
          </div>
          <div className="relative flex flex-col justify-center rounded-3xl border border-border/80 dark:border-white/[0.08] bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 p-8 sm:p-10 shadow-xl backdrop-blur-xl overflow-hidden min-h-[420px]">
            <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl opacity-70" />
            <div className="mb-6 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                Topological Synthesis
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                Live Dialectic Engine
              </span>
            </div>
            <div className="space-y-4 font-mono text-xs leading-relaxed">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <span className="text-emerald-400 font-bold">SUPPORTS</span>
                <p className="text-muted-foreground mt-1 text-[13px] font-sans">
                  Validates foundational empirical methodologies with reproducible effect sizes across independent cohorts.
                </p>
              </div>
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
                <span className="text-rose-400 font-bold">CONTRADICTS</span>
                <p className="text-muted-foreground mt-1 text-[13px] font-sans">
                  Surfaces replication divergences and specification curve discrepancies beneath consensus claims.
                </p>
              </div>
              <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-4">
                <span className="text-sky-400 font-bold">EXTENDS</span>
                <p className="text-muted-foreground mt-1 text-[13px] font-sans">
                  Generalizes theoretical frameworks to continuous scales and novel multi-disciplinary paradigms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/10 border-border/70 dark:border-white/[0.06] dark:bg-white/[0.01] border-y py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">How we build</h2>
            <p className="text-muted-foreground text-lg">
              Our principles guide every decision we make, from database
              architecture to pixel-perfect UI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-sm backdrop-blur-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Speed matters</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Research is hard enough. Your tools shouldn't slow you down. We
                obsess over milliseconds and render 10,000+ nodes at 60fps.
              </p>
            </div>

            <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-sm backdrop-blur-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
                <Target className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Truth over vanity</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                We prioritize verifiable provenance and claim-level accuracy over flashy hype.
                Every relationship links to the exact passage.
              </p>
            </div>

            <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-sm backdrop-blur-xl">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-inner">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Open by default</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Science thrives in the open. We build on open scientific registries,
                transparent taxonomies, and reproducible methodologies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Pillars Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="text-primary mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Target className="h-4 w-4" />
            Engineering Standards
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl tracking-tight">
            Built for Scientific Rigor & Open Science
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Ithaca replaces opaque citation counts with transparent argumentation semantics,
            enabling researchers worldwide to map scientific consensus and navigate disputes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-lg backdrop-blur-xl">
            <div className="mb-2 text-xs font-semibold tracking-wider text-blue-500 uppercase">
              Provenance
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">Zero-Hallucination Grounding</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every inferred edge in the graph provides citation text excerpts, DOI provenance, and methodological context so connections are always verifiable.
            </p>
          </div>

          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-lg backdrop-blur-xl">
            <div className="mb-2 text-xs font-semibold tracking-wider text-emerald-500 uppercase">
              Performance
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">High-Throughput WebGL Engine</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Powered by WebGL and GPU-accelerated force-directed layout algorithms, smoothly navigating dense citation topologies with tens of thousands of scientific papers.
            </p>
          </div>

          <div className="bg-card/90 dark:bg-gradient-to-b dark:from-[#13141a]/90 dark:via-[#0e0f14]/90 dark:to-[#0a0b0e]/90 border-border/80 dark:border-white/[0.08] rounded-3xl border p-8 shadow-lg backdrop-blur-xl">
            <div className="mb-2 text-xs font-semibold tracking-wider text-purple-500 uppercase">
              Open Infrastructure
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">Community & Open Science</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Committed to open access research datasets, integration with global repositories, and empowering academic labs with collaborative research landscapes.
            </p>
          </div>
        </div>

        {/* Algorithmic Ownership Banner */}
        <div className="border-border/80 dark:border-white/[0.08] bg-card/60 dark:bg-white/[0.02] mt-12 rounded-2xl border p-6 text-center backdrop-blur-md">
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">
              Transparent Epistemic Semantics:
            </strong>{" "}
            Every stance classification and graph layout pipeline is designed for scientific truth, transparency, and peer-reviewed reproducibility.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="mb-6 text-3xl font-bold">Ready to explore?</h2>
        <div className="flex justify-center gap-4">
          <Link href="/">
            <Button size="lg" className="h-12 px-8">
              Start Exploring
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/blog">
            <Button size="lg" variant="outline" className="h-12 px-8">
              Read the Blog
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
