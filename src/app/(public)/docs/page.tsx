import { Badge } from "@/components/ui/badge";
import { Code, Shield } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <section className="border-border bg-muted/20 border-b">
        <div className="container mx-auto px-8 py-12">
          <div className="mb-4 flex items-center gap-3">
            <h1 className="text-4xl font-bold">Documentation</h1>
            <Badge variant="secondary">Preview</Badge>
          </div>
          <p className="text-muted-foreground text-xl">
            Learn how Ithaca works and how to get the most out of the platform.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-8 py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <h2 id="overview">Overview</h2>
          <p>
            Ithaca is a citation graph explorer that visualizes how scientific
            papers relate to each other. It classifies citation relationships as{" "}
            <strong>supports</strong>, <strong>contradicts</strong>, or{" "}
            <strong>extends</strong> using AI-powered analysis.
          </p>

          <h2 id="data-sources">Data Sources</h2>
          <p>Ithaca pulls data from two academic APIs:</p>
          <ul>
            <li>
              <strong>OpenAlex</strong> &mdash; Paper metadata, citations,
              author info, and concepts. Over 250 million works indexed.
            </li>
            <li>
              <strong>Semantic Scholar</strong> &mdash; Citation context
              sentences extracted from paper full text, used to improve
              classification accuracy.
            </li>
          </ul>

          <h2 id="classification">Citation Classification</h2>
          <p>
            When you explore a topic or paper, Ithaca classifies each citation
            edge using a multi-gate pipeline:
          </p>
          <ol>
            <li>Check for cached classifications in the database</li>
            <li>Extract citation context sentences from Semantic Scholar</li>
            <li>
              Send evidence to an LLM for classification (supports / contradicts
              / extends / cites)
            </li>
            <li>
              Fall back to abstract-based or title-based classification if no
              citation context is available
            </li>
          </ol>
          <p>
            Each edge includes a <strong>confidence score</strong> and a{" "}
            <strong>signal source</strong> indicator so you can see what
            evidence the classifier used.
          </p>

          <h2 id="keyboard-shortcuts">Keyboard Shortcuts</h2>
          <div className="not-prose">
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["Cmd/Ctrl + K", "Open command bar"],
                ["Escape", "Close panels / deselect"],
                ["F", "Toggle ForceAtlas2 layout"],
                ["R", "Reset camera view"],
                ["S", "Toggle selection mode"],
                ["?", "Show keyboard shortcuts help"],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="bg-card flex items-center gap-3 rounded border p-2"
                >
                  <kbd className="bg-muted rounded px-2 py-0.5 font-mono text-xs">
                    {key}
                  </kbd>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <h2 id="api" className="mt-8">
            API Access
          </h2>
          <p>
            A public API for programmatic access to Ithaca&apos;s citation graph
            data is planned for a future release. If you&apos;re interested in
            early access, reach out via the contact information on the About
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
