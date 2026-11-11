import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
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
          <div className="border-border relative aspect-square overflow-hidden rounded-2xl border shadow-lg md:aspect-auto md:h-[500px]">
            <Image
              src="/founders/all3.jpg"
              alt="Rhizan Tech Founding Team: Abdulaziz Isa, Nebiyu Musbah, and Sadam Hussen"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 text-white">
              <p className="text-sm font-semibold">
                The RHIZAN TECH Founding Team
              </p>
              <p className="text-xs text-zinc-300">
                Architecting the Epistemic Graph for Human Scientific Discovery
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="bg-muted/30 border-border border-y">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">How we build</h2>
            <p className="text-muted-foreground text-lg">
              Our principles guide every decision we make, from database
              architecture to pixel-perfect UI.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-background border-border rounded-xl border p-8 shadow-sm">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Speed matters</h3>
              <p className="text-muted-foreground">
                Research is hard enough. Your tools shouldn't slow you down. We
                obsess over milliseconds.
              </p>
            </div>

            <div className="bg-background border-border rounded-xl border p-8 shadow-sm">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Truth over vanity</h3>
              <p className="text-muted-foreground">
                We prioritize accuracy and data integrity over flashy features.
                What you see is cited fact.
              </p>
            </div>

            <div className="bg-background border-border rounded-xl border p-8 shadow-sm">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="mb-3 text-xl font-bold">Open by default</h3>
              <p className="text-muted-foreground">
                Science thrives in the open. We build focused on open access and
                transparent methodologies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Founding Team Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="text-primary mb-3 inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Users className="h-4 w-4" />
            Founders & Engineering Leadership
          </div>
          <h2 className="mb-4 text-3xl font-bold md:text-4xl">
            Builders Driven by First Principles
          </h2>
          <p className="text-muted-foreground text-lg">
            A complementary founding triad uniting distributed graph computing,
            in-process neural inference, and operational execution to map the
            global frontier of science.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Abdulaziz Isa */}
          <div className="bg-card border-border flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md">
            <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/founders/abdulaziz.jpg"
                alt="Abdulaziz Isa — Co-Founder & Technical / AI Lead"
                fill
                className="object-cover object-top transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-1 text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                Technical & AI Lead
              </div>
              <h3 className="mb-2 text-xl font-bold">Abdulaziz Isa</h3>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                Systems architect specializing in high-throughput graph
                computing, WebGL visualization engines, and low-latency
                in-process neural classification. Built Ithaca's sub-millisecond
                epistemic stance pipeline.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Systems Architecture
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  WebGL / Sigma.js
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Epistemic AI Moat
                </span>
              </div>
            </div>
          </div>

          {/* Nebiyu Musbah */}
          <div className="bg-card border-border flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md">
            <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/founders/nebiyu.jpg"
                alt="Nebiyu Musbah — Co-Founder & Business / Growth Lead"
                fill
                className="object-cover object-top transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-1 text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                Business & Growth Lead
              </div>
              <h3 className="mb-2 text-xl font-bold">Nebiyu Musbah</h3>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                Drives global product-led growth, institutional research
                partnerships, open-science repository alliances, and deep
                workflow ingress across reference management ecosystems.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Global Growth
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Academic Alliances
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Workflow Ingress
                </span>
              </div>
            </div>
          </div>

          {/* Sadam Hussen */}
          <div className="bg-card border-border flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md">
            <div className="bg-muted relative aspect-[4/5] w-full overflow-hidden">
              <Image
                src="/founders/sadam.jpg"
                alt="Sadam Hussen — Co-Founder & Operations / Strategic Lead"
                fill
                className="object-cover object-top transition-transform duration-300 hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-1 text-xs font-semibold tracking-wider text-purple-600 uppercase dark:text-purple-400">
                Operations & Strategic Lead
              </div>
              <h3 className="mb-2 text-xl font-bold">Sadam Hussen</h3>
              <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                Directs high-cadence platform engineering, enterprise data
                governance, cloud infrastructure reliability, and operational
                scalability for research teams and institutional deployments.
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Platform Operations
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Enterprise Governance
                </span>
                <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
                  Execution Rigor
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Engineering Philosophy Banner */}
        <div className="border-border bg-muted/30 mt-12 rounded-xl border p-6 text-center">
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">
              100% In-House Algorithmic Ownership:
            </strong>{" "}
            Every stance classifier, layout pipeline, and graph algorithm is
            engineered in-house from first principles • Built for scientific
            truth, transparency, and reproducibility.
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
