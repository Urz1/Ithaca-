"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Share2,
  FolderOpen,
  GitBranch,
  Settings,
  Edit,
  Activity,
  BookOpen,
  History,
  MoreHorizontal,
  TrendingUp,
  Check,
  Clock,
  Loader2,
  Search,
  ArrowRight,
  Sparkles,
  Bell,
  Orbit,
  Compass,
  ShieldCheck,
  Plus,
  Network,
} from "lucide-react";
import {
  getUserProfile,
  getStats,
  getRecentActivity,
  getCorrections,
  getCollections,
  getSavedGraphs,
  deleteSavedGraph,
  getCalibrationStats,
  getProjects,
  type UserProfile,
  type DashboardStats,
  type CalibrationStats,
  type RecentActivity,
  type CorrectionData,
  type CollectionData,
  type SavedGraphData,
  type ProjectData,
} from "./actions";
import { ProfileSettings } from "@/components/dashboard/profile-settings";
import { PrivacySettings } from "@/components/dashboard/privacy-settings";

const CURATED_PROMPTS = [
  "Piaget vs Vygotsky cognitive schemas",
  "CRISPR-Cas9 off-target DNA cleavage",
  "Transformer long-context reasoning limits",
];

export default function DashboardPage() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) setCurrentTab(tab);
    }
  }, []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [calibration, setCalibration] = useState<CalibrationStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [corrections, setCorrections] = useState<CorrectionData[]>([]);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraphData[]>([]);
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [inquiryQuery, setInquiryQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const [
          profileData,
          statsData,
          calibrationData,
          activityData,
          correctionsData,
          collectionsData,
          savedGraphsData,
          projectsData,
        ] = await Promise.all([
          getUserProfile(),
          getStats(),
          getCalibrationStats(),
          getRecentActivity(),
          getCorrections(),
          getCollections(),
          getSavedGraphs(),
          getProjects(),
        ]);

        setProfile(profileData);
        setStats(statsData);
        setCalibration(calibrationData);
        setActivities(activityData);
        setCorrections(correctionsData);
        setCollections(collectionsData);
        setSavedGraphs(savedGraphsData);
        setProjects(projectsData);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const handleProfileUpdate = async () => {
    const updatedProfile = await getUserProfile();
    setProfile(updatedProfile);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inquiryQuery.trim()) {
      router.push(`/explore?query=${encodeURIComponent(inquiryQuery.trim())}`);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="text-primary mx-auto mb-2 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">{error || "Failed to load"}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const watchedCollections = collections.filter((c) => c.watchEnabled);

  return (
    <div className="bg-muted/30 min-h-full pb-12">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        {/* Workspace Hub Header */}
        <div className="flex flex-col justify-between gap-4 pt-1 pb-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Research Hub
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Synthesize scientific literature, navigate citation lineages, and track laboratory inquiries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs shadow-sm"
            >
              <Link href="/projects">
                <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
                Projects ({projects.length})
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs shadow-sm"
            >
              <Link href="/explore">
                <Orbit className="h-3.5 w-3.5" />
                Open Dialectic Canvas
              </Link>
            </Button>
          </div>
        </div>

        {/* Dialectic Inquiry Launcher */}
        <div className="from-card to-muted/30 border-primary/20 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-sm">
          <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-5">
            <Orbit className="text-primary h-48 w-48" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="text-primary h-4 w-4" />
              <span className="text-primary text-xs font-bold tracking-wider uppercase">
                Dialectic Inquiry Launcher
              </span>
            </div>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Map Scientific Controversies & Consensuses Instantly
            </h2>
            <form onSubmit={handleInquirySubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                <input
                  type="text"
                  value={inquiryQuery}
                  onChange={(e) => setInquiryQuery(e.target.value)}
                  placeholder="Enter a research question, DOI, or scientific claim..."
                  className="border-border/80 bg-background focus:ring-primary/20 focus:border-primary h-11 w-full rounded-xl border pr-4 pl-10 text-sm shadow-inner focus:ring-2 focus:outline-none"
                />
              </div>
              <Button
                type="submit"
                className="h-11 gap-2 rounded-xl px-5 font-medium"
              >
                Explore Debate
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Quick queries:</span>
              {CURATED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInquiryQuery(prompt);
                    router.push(`/explore?query=${encodeURIComponent(prompt)}`);
                  }}
                  className="bg-background border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground rounded-full border px-2.5 py-1 text-[11px] transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <div className="flex items-center justify-between border-b pb-1">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" className="gap-1.5 text-xs">
                <Compass className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="graphs" className="gap-1.5 text-xs">
                <Share2 className="h-3.5 w-3.5" />
                Debate Maps ({savedGraphs.length})
              </TabsTrigger>
              <TabsTrigger value="collections" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Collections ({collections.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Correction History ({corrections.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 text-xs">
                <Settings className="h-3.5 w-3.5" />
                Settings & Privacy
              </TabsTrigger>
            </TabsList>

            <span className="text-muted-foreground hidden text-xs sm:inline">
              {stats.savedGraphs} Maps &bull; {stats.collections} Collections
            </span>
          </div>

          {/* Overview Tab (Research Hub) */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Jump Back In: Saved Debate Maps */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="text-primary h-4 w-4" />
                  <h3 className="text-sm font-bold tracking-tight">
                    Continue Research & Debate Maps
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs"
                  onClick={() => setCurrentTab("graphs")}
                >
                  View all ({savedGraphs.length}) →
                </Button>
              </div>

              {savedGraphs.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {savedGraphs.slice(0, 3).map((graph) => (
                    <Card
                      key={graph.id}
                      className="border-border/80 group overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="from-primary/10 to-primary/5 relative h-24 bg-gradient-to-br p-3">
                        <Badge className="bg-background/90 text-foreground border-border/50 absolute top-2 right-2 text-[10px]">
                          {graph.nodeCount} nodes &bull; {graph.edgeCount} edges
                        </Badge>
                        <span className="text-primary/70 font-mono text-[10px]">
                          TOPOLOGY SNAPSHOT
                        </span>
                      </div>
                      <CardContent className="p-4">
                        <Link
                          href={`/explore?graph=${graph.id}`}
                          className="hover:text-primary font-medium transition-colors"
                        >
                          <h4 className="line-clamp-1 text-sm font-semibold">
                            {graph.title}
                          </h4>
                        </Link>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {graph.projectTitle && (
                            <span className="text-primary font-medium">
                              {graph.projectTitle} &bull;{" "}
                            </span>
                          )}
                          Saved {graph.createdAt}
                        </p>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="text-primary mt-3 h-8 w-full justify-between px-0 text-xs hover:bg-transparent"
                        >
                          <Link href={`/explore?graph=${graph.id}`}>
                            <span>Resume Canvas</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="border-border/80 bg-muted/20 rounded-xl border border-dashed p-4 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-foreground text-sm font-semibold">
                        Recommended Starter Debates
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Clone a pre-calibrated debate map into your lab or launch
                        exploration immediately.
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="mt-3 font-medium sm:mt-0"
                    >
                      <Link href="/explore">
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Blank Canvas
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                      {
                        title: "Transformer Attention vs Recurrent Memory",
                        field: "Deep Learning Architecture",
                        nodes: 42,
                        edges: 68,
                        status: "8 Disputes",
                        query: "How do transformers handle long context?",
                        gradient: "from-purple-500/10 to-indigo-500/5",
                      },
                      {
                        title: "CRISPR-Cas9 Off-Target DNA Cleavage",
                        field: "Molecular Genetics",
                        nodes: 64,
                        edges: 112,
                        status: "14 Extends",
                        query: "CRISPR gene editing",
                        gradient: "from-emerald-500/10 to-teal-500/5",
                      },
                      {
                        title: "Metformin in Non-Diabetic Longevity",
                        field: "Gerontology & Oncology",
                        nodes: 31,
                        edges: 49,
                        status: "11 Contradicts",
                        query: "Does metformin reduce cancer risk?",
                        gradient: "from-rose-500/10 to-amber-500/5",
                      },
                    ].map((starter, i) => (
                      <Card
                        key={i}
                        className="border-border/80 group overflow-hidden transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        <div
                          className={`relative h-24 bg-gradient-to-br ${starter.gradient} p-3`}
                        >
                          <Badge className="bg-background/90 text-foreground border-border/50 absolute top-2 right-2 text-[10px]">
                            {starter.nodes} nodes · {starter.edges} edges
                          </Badge>
                          <span className="text-primary/80 font-mono text-[10px] font-semibold">
                            {starter.status.toUpperCase()}
                          </span>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="group-hover:text-primary line-clamp-1 text-sm font-semibold transition-colors">
                            {starter.title}
                          </h4>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {starter.field}
                          </p>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-primary mt-3 h-8 w-full justify-between px-0 text-xs hover:bg-transparent"
                          >
                            <Link
                              href={`/explore?query=${encodeURIComponent(starter.query)}`}
                            >
                              <span>Explore Dialectic Map</span>
                              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dialectic Literature Radar & Watched Digests */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card className="border-border/80">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="text-primary h-4 w-4" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Literature Radar & Watchlists
                      </h3>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      Weekly Digest
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs">
                    Monitors newly indexed literature citing your seed papers for
                    contradictory findings and extensions.
                  </p>

                  {watchedCollections.length > 0 ? (
                    <div className="space-y-2">
                      {watchedCollections.slice(0, 3).map((col) => (
                        <div
                          key={col.id}
                          className="bg-muted/40 border-border/50 flex items-center justify-between rounded-lg border p-2.5"
                        >
                          <div>
                            <div className="text-xs font-semibold">
                              {col.title}
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              {col.paperCount} papers &bull; Active pulse
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-primary h-7 text-xs"
                          >
                            <Link href={`/explore?collection=${col.id}`}>
                              Open Map →
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-border/60 bg-muted/20 rounded-lg border p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-foreground text-xs font-semibold">
                          Quick-Track Curated Watchlists
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Automated Radar
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3 text-xs">
                        Subscribe your research workspace to automated weekly
                        citation & controversy digests.
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            title: "Foundational LLM Safety & Alignment",
                            papers: "28 seed papers",
                            query: "Large language models",
                          },
                          {
                            title: "mRNA Therapeutics & Nanoparticle Delivery",
                            papers: "19 seed papers",
                            query: "mRNA vaccines",
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="bg-card/70 border-border/50 hover:border-primary/40 flex items-center justify-between rounded-md border p-2 transition-colors"
                          >
                            <div>
                              <div className="text-foreground text-xs font-medium">
                                {item.title}
                              </div>
                              <div className="text-muted-foreground text-[10px]">
                                {item.papers} · Active radar
                              </div>
                            </div>
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="text-primary h-7 text-xs"
                            >
                              <Link
                                href={`/explore?query=${encodeURIComponent(item.query)}`}
                              >
                                Launch →
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lab Trust Calibration */}
              {calibration && (
                <Card className="border-border/80">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500 h-4 w-4" />
                        <h3 className="text-sm font-bold tracking-tight">
                          Epistemic Calibration & Trust
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {calibration.totalClassifications} Classified
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4 text-xs">
                      Classification agreement rate and unresolved
                      low-confidence edges for Pilot Lab E2E.
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <div className="text-muted-foreground text-[10px] font-medium uppercase">
                          Agreement
                        </div>
                        <div className="text-primary mt-1 text-lg font-bold">
                          {(calibration.agreementProxy * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <div className="text-muted-foreground text-[10px] font-medium uppercase">
                          Correction
                        </div>
                        <div className="mt-1 text-lg font-bold">
                          {(calibration.correctionRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2.5">
                        <div className="text-muted-foreground text-[10px] font-medium uppercase">
                          Unresolved
                        </div>
                        <div className="mt-1 text-lg font-bold">
                          {calibration.lowConfidenceUnresolved}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Active Research Projects Shelf */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="text-amber-500 h-4 w-4" />
                  <h3 className="text-sm font-bold tracking-tight">
                    Active Research Projects
                  </h3>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-primary text-xs">
                  <Link href="/projects">Manage all ({projects.length}) →</Link>
                </Button>
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {projects.slice(0, 3).map((project) => (
                    <Card
                      key={project.id}
                      className="border-border/80 transition-all hover:shadow-sm"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <h4 className="truncate text-sm font-semibold">
                              {project.title}
                            </h4>
                          </div>
                          {project.isFavorite && (
                            <span className="text-yellow-500 text-xs">★</span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                          {project.description || "No description"}
                        </p>
                        <div className="text-muted-foreground mt-3 flex items-center justify-between text-[11px]">
                          <span>
                            {project.collectionCount} collections &bull;{" "}
                            {project.graphCount} graphs
                          </span>
                          <span className="text-primary font-medium">
                            Updated {project.lastModified}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-muted-foreground p-6 text-center text-xs">
                    No active projects. Create your first project to organize
                    collections and debate graphs.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Graphs Tab */}
          <TabsContent value="graphs" className="mt-6">
            {savedGraphs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {savedGraphs.map((graph) => (
                  <Card
                    key={graph.id}
                    className="group overflow-hidden transition-shadow hover:shadow-md"
                  >
                    <div className="from-primary/10 to-primary/5 relative h-32 bg-gradient-to-br">
                      <Badge className="bg-card/80 absolute top-2 right-2 text-xs">
                        {graph.nodeCount} nodes &bull; {graph.edgeCount} edges
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-card/80 hover:bg-destructive/10 hover:text-destructive absolute top-2 left-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={async () => {
                          if (!confirm("Delete this saved graph?")) return;
                          await deleteSavedGraph(graph.id);
                          setSavedGraphs((prev) =>
                            prev.filter((g) => g.id !== graph.id),
                          );
                        }}
                      >
                        <span className="text-xs">✕</span>
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <Link
                        href={`/explore?graph=${graph.id}`}
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {graph.title}
                      </Link>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {graph.query !== graph.title && (
                          <span className="mb-0.5 block truncate">
                            Query: {graph.query}
                          </span>
                        )}
                        {graph.projectTitle && (
                          <span className="text-primary">
                            {graph.projectTitle} &bull;{" "}
                          </span>
                        )}
                        Saved {graph.createdAt}
                      </p>
                      <Link
                        href={`/explore?graph=${graph.id}`}
                        className="text-primary mt-2 inline-block text-xs font-medium"
                      >
                        Open debate map →
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground flex flex-col items-center gap-4 p-8 text-center">
                  <p>
                    No saved debate maps yet. Explore a topic, then freeze a
                    shareable map for your lab.
                  </p>
                  <Button asChild>
                    <Link href="/explore">Open Explore</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Collections Tab */}
          <TabsContent value="collections" className="mt-6">
            {collections.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {collections.map((collection) => (
                  <Card
                    key={collection.id}
                    className="transition-shadow hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{collection.title}</h3>
                          <p className="text-muted-foreground text-xs">
                            {collection.paperCount} Papers &bull; Created{" "}
                            {collection.createdAt}
                            {collection.watchEnabled && " · Watching weekly"}
                          </p>
                          <Link
                            href={`/explore?collection=${collection.id}`}
                            className="text-primary mt-2 inline-block text-xs font-medium"
                          >
                            Open debate map →
                          </Link>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/explore?collection=${collection.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground flex flex-col items-center gap-4 p-8 text-center">
                  <p>
                    No collections yet. Create a project collection, import
                    seeds, then explore the debate map.
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/projects">Go to Projects</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            {corrections.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-muted-foreground border-b text-xs uppercase">
                        <th className="p-4 text-left font-medium">
                          Citing Paper
                        </th>
                        <th className="p-4 text-left font-medium">
                          Cited Paper
                        </th>
                        <th className="p-4 text-left font-medium">Edge Type</th>
                        <th className="p-4 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrections.map((correction) => (
                        <tr
                          key={correction.id}
                          className="hover:bg-muted/50 border-b last:border-0"
                        >
                          <td className="p-4 font-mono text-sm text-xs">
                            {correction.citingId}
                          </td>
                          <td className="text-muted-foreground p-4 font-mono text-sm text-xs">
                            {correction.citedId}
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary">
                              {correction.edgeType}
                            </Badge>
                          </td>
                          <td className="text-muted-foreground p-4 text-sm">
                            {correction.date}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-muted-foreground p-8 text-center">
                  <p>No correction history yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <ProfileSettings profile={profile} onUpdate={handleProfileUpdate} />
            <PrivacySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  change?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Icon className="text-muted-foreground/50 h-8 w-8" />
          {change && (
            <span className="text-primary flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              {change}
            </span>
          )}
        </div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </CardContent>
    </Card>
  );
}
