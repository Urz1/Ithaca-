import { Badge } from "@/components/ui/badge";

export default function ChangelogPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Changelog</h1>
        <p className="text-muted-foreground text-xl">
          New updates and improvements to Ithaca.
        </p>
      </div>

      <div className="border-border relative ml-4 space-y-12 border-l md:ml-0 md:pl-0">
        <div className="relative md:grid md:grid-cols-[200px_1fr] md:gap-8">
          <div className="mb-4 md:mb-0 md:text-right">
            <span className="text-muted-foreground sticky top-24 text-sm font-medium">
              February 2026
            </span>
            <div className="bg-primary border-background absolute top-1.5 -left-[21px] h-3 w-3 rounded-full border-4 md:-right-[21px] md:left-auto" />
          </div>
          <div className="pl-6 md:pl-0">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-2xl font-bold">Real Data Pipeline</h2>
              <Badge variant="default">v0.2.0</Badge>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p>
                Major milestone: all mock data removed. The platform now runs
                entirely on real academic data.
              </p>
              <ul>
                <li>
                  <strong>OpenAlex Integration:</strong> Search and explore
                  250M+ real papers from OpenAlex.
                </li>
                <li>
                  <strong>LLM Citation Classification:</strong> AI-powered
                  supports/contradicts/extends classification with Semantic
                  Scholar citation contexts.
                </li>
                <li>
                  <strong>Database-backed Dashboard:</strong> Projects,
                  collections, and stats persisted to PostgreSQL.
                </li>
                <li>
                  <strong>Real Health Checks:</strong> Status page pings actual
                  services.
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="relative md:grid md:grid-cols-[200px_1fr] md:gap-8">
          <div className="mb-4 md:mb-0 md:text-right">
            <span className="text-muted-foreground sticky top-24 text-sm font-medium">
              January 2026
            </span>
            <div className="bg-muted border-background absolute top-1.5 -left-[21px] h-3 w-3 rounded-full border-4 md:-right-[21px] md:left-auto" />
          </div>
          <div className="pl-6 md:pl-0">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-muted-foreground text-xl font-bold">
                Initial Prototype
              </h2>
              <Badge variant="secondary">v0.1.0</Badge>
            </div>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <ul>
                <li>Interactive graph canvas with Sigma.js and WebGL</li>
                <li>ForceAtlas2 physics layout</li>
                <li>Authentication with Better Auth (Google, email)</li>
                <li>Dark/light theme support</li>
                <li>Edge evidence popovers and paper inspector panel</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
