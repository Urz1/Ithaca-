"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  ArrowRight,
  FileText,
  Sparkles,
  Loader2,
  GitFork,
  Flame,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { graphAPI, type SearchResult } from "@/lib/api/graph-api";
import { resolveExploreEntryTarget } from "@/lib/graph-snapshot";
import type { RelationshipFocusType } from "@/components/canvas/relationship-focus-control";

interface CanvasEmptyStateProps {
  /** Callback when user selects a paper/topic from search */
  onSearchSelect?: (id: string) => void;
  /** Callback when user clicks the search prompt (fallback to ⌘K) */
  onSearchClick?: () => void;
  /** Optional custom message */
  message?: string;
  /** Whether to show the animated background */
  showAnimation?: boolean;
  /** Current relationship focus */
  relationshipFocus?: RelationshipFocusType;
  /** Callback when relationship focus changes */
  onRelationshipFocusChange?: (focus: RelationshipFocusType) => void;
}

interface CuratedDebate {
  id: string;
  topic: string;
  category: string;
  papersCount: number;
  disputeCount: number;
  badge: string;
  badgeVariant: "contradicts" | "supports" | "extends";
}

// Curated dialectic starter landscapes
const CURATED_DEBATES: CuratedDebate[] = [
  {
    id: "transformers-context",
    topic: "How do transformers handle long context?",
    category: "AI Architecture",
    papersCount: 42,
    disputeCount: 8,
    badge: "Active Debate",
    badgeVariant: "contradicts",
  },
  {
    id: "crispr-editing",
    topic: "CRISPR gene editing",
    category: "Genomics",
    papersCount: 64,
    disputeCount: 14,
    badge: "Consensus Lineage",
    badgeVariant: "supports",
  },
  {
    id: "metformin-cancer",
    topic: "Does metformin reduce cancer risk?",
    category: "Oncology",
    papersCount: 31,
    disputeCount: 11,
    badge: "Bifurcated Trials",
    badgeVariant: "extends",
  },
];

// Curated topic suggestions shown as quick chips
const SUGGESTED_TOPICS = [
  "Large language models",
  "mRNA vaccines",
  "Piaget vs Vygotsky cognitive schemas",
];

/**
 * Empty state shown when the graph canvas has no data to display.
 * Features an inline search with live suggestions matching the design spec.
 */
export function CanvasEmptyState({
  onSearchSelect,
  onSearchClick,
  message = "Paste a DOI, ask a research question, or enter a topic. Ithaca builds the debate map — supports, contradictions, and extensions — without project setup.",
  showAnimation = true,
  relationshipFocus = "all",
  onRelationshipFocusChange,
}: CanvasEmptyStateProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const r = await graphAPI.searchPapers(query);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = useCallback(
    (id: string) => {
      setQuery("");
      setResults([]);
      setIsFocused(false);
      onSearchSelect?.(id);
    },
    [onSearchSelect],
  );

  const handleTopicClick = useCallback(
    (topic: string) => {
      handleSelect(resolveExploreEntryTarget(topic));
    },
    [handleSelect],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        handleSelect(resolveExploreEntryTarget(query));
      }
    },
    [query, handleSelect],
  );

  // Separate papers and topics
  const papers = results.filter((r) => r.type === "paper");
  const topics = results.filter((r) => r.type === "topic");

  const showDropdown = isFocused && (results.length > 0 || isSearching);

  return (
    <div className="bg-background absolute inset-0 flex items-center justify-center">
      {/* Subtle dot grid */}
      {showAnimation && (
        <div className="absolute inset-0 overflow-hidden opacity-[0.04] dark:opacity-[0.06]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="empty-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="20" cy="20" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#empty-grid)" />
          </svg>
        </div>
      )}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Icon */}
        <div className="relative mb-5">
          <div className="bg-primary/8 border-primary/10 rounded-2xl border p-5">
            <Search className="text-primary h-8 w-8" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-foreground mb-2 text-xl font-semibold">
          See the debate in minutes
        </h2>

        {/* Subtitle */}
        <p className="text-muted-foreground mb-6 max-w-md text-sm leading-relaxed">
          {message}
        </p>

        {/* Inline Search Input */}
        <div className="relative w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <div
              className={`bg-background relative flex items-center rounded-xl border shadow-lg transition-all ${
                isFocused
                  ? "border-primary ring-primary/20 shadow-xl ring-2"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Search className="text-muted-foreground pointer-events-none absolute left-4 h-4.5 w-4.5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                placeholder="Ask a question, or paste a DOI / topic..."
                className="placeholder:text-muted-foreground w-full rounded-xl bg-transparent py-3.5 pr-12 pl-11 text-sm focus:outline-none"
              />
              {query.trim() && (
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-2.5 rounded-lg p-1.5 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {isSearching && (
                <Loader2 className="text-muted-foreground absolute right-4 h-4 w-4 animate-spin" />
              )}
            </div>
          </form>

          {/* Live Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="bg-card border-border absolute top-full right-0 left-0 z-50 mt-2 max-h-[320px] overflow-hidden overflow-y-auto rounded-xl border shadow-2xl"
              >
                {/* Papers */}
                {papers.length > 0 && (
                  <div>
                    <div className="bg-muted/30 border-border/40 border-b px-4 py-2">
                      <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                        Papers ({papers.length})
                      </span>
                    </div>
                    {papers.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r.id)}
                        className="hover:bg-muted/50 flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors"
                      >
                        <FileText className="text-muted-foreground/60 mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {r.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {r.authors} · {r.year}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Topics */}
                {topics.length > 0 && (
                  <div>
                    <div className="bg-muted/30 border-border/40 border-t-border/20 border-t border-b px-4 py-2">
                      <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                        Topics ({topics.length})
                      </span>
                    </div>
                    {topics.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(r.id)}
                        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      >
                        <Sparkles className="h-4 w-4 shrink-0 text-blue-500/60" />
                        <span className="text-sm font-medium">{r.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Searching indicator */}
                {isSearching && results.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <Loader2 className="text-muted-foreground mx-auto mb-2 h-5 w-5 animate-spin" />
                    <p className="text-muted-foreground text-xs">
                      Searching...
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard hint */}
        <p className="text-muted-foreground mt-3 text-xs">
          or press{" "}
          <kbd className="border-border bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>{" "}
          for advanced search
        </p>

        {/* Curated Dialectic Starters */}
        <div data-tour="curated-debates" className="mt-8 w-full text-left">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
              <Sparkles className="text-primary size-3.5" />
              Curated Scientific Debates
            </span>
            <span className="text-muted-foreground/80 text-[10px]">
              1-Click Topology Load
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CURATED_DEBATES.map((debate) => {
              const badgeColors = {
                contradicts:
                  "bg-contradicts/10 text-contradicts border-contradicts/30",
                supports: "bg-supports/10 text-supports border-supports/30",
                extends: "bg-extends/10 text-extends border-extends/30",
              }[debate.badgeVariant];

              return (
                <button
                  key={debate.id}
                  onClick={() => handleTopicClick(debate.topic)}
                  className="group border-border/80 bg-card/60 hover:border-primary/50 hover:bg-card relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${badgeColors}`}
                      >
                        {debate.badge}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {debate.category}
                      </span>
                    </div>
                    <h4 className="text-foreground group-hover:text-primary line-clamp-2 text-xs font-semibold transition-colors">
                      {debate.topic}
                    </h4>
                  </div>

                  <div className="border-border/40 text-muted-foreground mt-3 flex items-center justify-between border-t pt-2 text-[10px]">
                    <span>
                      {debate.papersCount} papers · {debate.disputeCount} disputes
                    </span>
                    <ArrowRight className="text-primary size-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick query chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-muted-foreground mr-1 text-xs">
            More prompts:
          </span>
          {SUGGESTED_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleTopicClick(topic)}
              className="border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 rounded-full border px-3 py-1 text-xs transition-all"
            >
              {topic}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Compact empty state for inline usage (e.g., search results, filters)
 */
export function EmptyStateCompact({
  message = "No results found",
  suggestion,
}: {
  message?: string;
  suggestion?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted/50 mb-4 rounded-full p-4">
        <Search className="text-muted-foreground h-6 w-6" />
      </div>
      <p className="text-foreground text-sm font-medium">{message}</p>
      {suggestion && (
        <p className="text-muted-foreground mt-1 text-xs">{suggestion}</p>
      )}
    </div>
  );
}
