"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ArrowRightCircle,
  ExternalLink,
  Quote,
  ChevronRight,
  AlertTriangle,
  FileText,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";

import type { SignalSource } from "@/lib/api/graph-api";

export interface EdgeEvidence {
  id: string;
  edgeType: "supports" | "contradicts" | "extends" | "cites" | "unknown";
  confidence: number;
  sourcePaper: {
    id: string;
    title: string;
    authors: string;
    year: number;
    openAccessUrl?: string;
  };
  targetPaper: {
    id: string;
    title: string;
    authors: string;
    year: number;
    openAccessUrl?: string;
  };
  snippets: {
    text: string;
    source: string;
    context?:
      | "Introduction"
      | "Methodology"
      | "Results"
      | "Discussion"
      | "Background"
      | "ResultComparison";
  }[];
  /** What data the classifier had when making this judgment */
  signalSource?: SignalSource;
}

interface EdgeCommentItem {
  id: string;
  body: string;
  edgeType: string | null;
  createdAt: string;
  actor: { id: string; name: string };
}

interface EdgeEvidencePopoverProps {
  evidence: EdgeEvidence | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onViewPaper: (paperId: string) => void;
  onDispute: (edgeId: string) => void;
  onCorrect?: (edgeId: string, type: string, comment: string) => void;
}

const EDGE_CONFIG = {
  supports: {
    icon: CheckCircle,
    label: "Supports",
    color: "text-supports",
    bgColor: "bg-supports/10",
    borderColor: "border-supports/30",
  },
  contradicts: {
    icon: XCircle,
    label: "Contradicts",
    color: "text-contradicts",
    bgColor: "bg-contradicts/10",
    borderColor: "border-contradicts/30",
  },
  extends: {
    icon: ArrowRightCircle,
    label: "Extends",
    color: "text-extends",
    bgColor: "bg-extends/10",
    borderColor: "border-extends/30",
  },
  unknown: {
    icon: AlertTriangle,
    label: "Uncertain",
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-muted-foreground/30",
  },
  cites: {
    icon: ArrowRightCircle,
    label: "Cites",
    color: "text-muted-foreground",
    bgColor: "bg-muted/10",
    borderColor: "border-muted-foreground/20",
  },
};

export const SIGNAL_SOURCE_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  "llm+contexts": {
    label: "AI + citation sentences",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  "llm+abstracts": {
    label: "AI + abstracts only",
    color: "text-blue-600 dark:text-blue-400",
  },
  "llm+titles": {
    label: "AI + titles only",
    color: "text-amber-600 dark:text-amber-400",
  },
  heuristic: {
    label: "Keyword heuristic",
    color: "text-orange-600 dark:text-orange-400",
  },
  "user-correction": {
    label: "👨‍🔬 Verified Community Calibration",
    color: "text-purple-600 dark:text-purple-400 font-semibold",
  },
  "ithaca-local-moat": {
    label: "⚡ Sovereign AI Moat (Local Engine, 0 FX)",
    color: "text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  default: { label: "Unclassified", color: "text-muted-foreground" },
};

export function EdgeEvidencePopover({
  evidence,
  position,
  onClose,
  onViewPaper,
  onDispute,
  onCorrect,
}: EdgeEvidencePopoverProps) {
  const [activeSnippet, setActiveSnippet] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [teamComments, setTeamComments] = useState<EdgeCommentItem[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  // Reset local state when evidence changes (new edge clicked)
  const evidenceId = evidence?.id ?? null;
  const citingId = evidence?.sourcePaper.id;
  const citedId = evidence?.targetPaper.id;

  useEffect(() => {
    setActiveSnippet(0);
    setIsEditing(false);
    setSelectedType(evidence?.edgeType ?? null);
    setComment("");
    setNoteDraft("");
    setTeamComments([]);
  }, [evidenceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!citingId || !citedId) return;
    let cancelled = false;
    setCommentsLoading(true);
    void fetch(
      `/api/edges/comments?citingId=${encodeURIComponent(citingId)}&citedId=${encodeURIComponent(citedId)}`,
    )
      .then(async (response) => {
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled) {
          setTeamComments(payload?.comments ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [citingId, citedId]);

  const pdfUrl =
    evidence?.sourcePaper.openAccessUrl || evidence?.targetPaper.openAccessUrl;

  const handleAddNote = async () => {
    if (!evidence || !noteDraft.trim()) return;
    setNoteSaving(true);
    try {
      const response = await fetch("/api/edges/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citingId: evidence.sourcePaper.id,
          citedId: evidence.targetPaper.id,
          body: noteDraft.trim(),
          edgeType: evidence.edgeType,
        }),
      });
      if (!response.ok) throw new Error("Failed to save note");
      const payload = await response.json();
      const created = payload?.comment as EdgeCommentItem | undefined;
      if (created) {
        setTeamComments((prev) => [...prev, created]);
        setNoteDraft("");
      }
    } catch {
      // Keep draft so the user can retry.
    } finally {
      setNoteSaving(false);
    }
  };

  useEffect(() => {
    if (!evidence) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [evidence, onClose]);

  // Helper to highlight keywords
  const highlightText = (text: string, type: EdgeEvidence["edgeType"]) => {
    const config = EDGE_CONFIG[type];

    const keywords =
      type === "contradicts"
        ? ["however", "contrary", "unlike", "conflict", "disagree", "refutes"]
        : type === "supports"
          ? ["supports", "validates", "confirms", "agreement", "consistent"]
          : ["extends", "builds on", "following", "based on"];

    const parts = text.split(new RegExp(`(${keywords.join("|")})`, "gi"));
    return parts.map((part, i) =>
      keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
        <span
          key={i}
          className={`font-bold ${config.color} bg-muted/50 rounded px-1`}
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  if (!evidence || !position) return null;

  const config = EDGE_CONFIG[evidence.edgeType];
  const Icon = config.icon;

  const handleSubmitCorrection = () => {
    if (onCorrect && selectedType) {
      onCorrect(evidence.id, selectedType, comment);
      onClose(); // Close after submit
    } else {
      // Fallback if no specific correct handler
      onDispute(evidence.id);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        data-testid="edge-evidence-backdrop"
        onClick={onClose}
      />

      {/* Popover */}
      <div
        data-testid="edge-evidence-popover"
        className={`bg-card/95 fixed z-50 w-96 border backdrop-blur ${config.borderColor} animate-in zoom-in-95 fade-in flex max-h-[85vh] flex-col overflow-hidden rounded-xl shadow-2xl duration-200`}
        style={{
          left: Math.max(16, Math.min(position.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 420)),
          top: Math.max(16, Math.min(position.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 620)),
        }}
      >
        <div className="flex justify-end p-2 pb-0">
          <button
            type="button"
            aria-label="Close evidence"
            data-testid="edge-evidence-close"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {isEditing ? (
          // ================= EDIT MODE =================
          <div className="p-0">
            <div className="bg-muted/40 border-border border-b p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Correct Relationship
              </h3>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Relationship Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    Object.keys(EDGE_CONFIG) as Array<keyof typeof EDGE_CONFIG>
                  ).map((type) => {
                    const TypeIcon = EDGE_CONFIG[type].icon;
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className={`flex items-center gap-3 rounded-lg border p-2 transition-all ${
                          isSelected
                            ? `bg-primary/5 border-primary ring-primary ring-1`
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <TypeIcon
                          className={`h-4 w-4 ${EDGE_CONFIG[type].color}`}
                        />
                        <span className="text-sm font-medium">
                          {EDGE_CONFIG[type].label}
                        </span>
                        {isSelected && (
                          <CheckCircle className="text-primary ml-auto h-3.5 w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Reasoning (Optional)
                </label>
                <textarea
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                  placeholder="Why is the current relationship incorrect?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <p className="text-muted-foreground bg-muted/50 flex items-center gap-1.5 rounded p-2 text-[10px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  This correction applies only to your private workspace.
                </p>
              </div>
            </div>
            <div className="bg-muted/20 flex justify-end gap-2 border-t p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitCorrection}
                disabled={!selectedType}
              >
                Submit Correction
              </Button>
            </div>
          </div>
        ) : (
          // ================= VIEW MODE (evidence first) =================
          <>
            <div className="border-border space-y-3 border-b p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5 w-10 shrink-0 text-xs font-medium">
                    From
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onViewPaper(evidence.sourcePaper.id)}
                      className="hover:text-primary block text-left transition-colors"
                    >
                      <span className="text-sm font-semibold">
                        {evidence.sourcePaper.authors.split(",")[0]?.trim()} (
                        {evidence.sourcePaper.year})
                      </span>
                    </button>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {evidence.sourcePaper.title}
                    </p>
                  </div>
                </div>
                <div className="flex items-center pl-10">
                  <ChevronRight className={`h-3.5 w-3.5 ${config.color}`} />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5 w-10 shrink-0 text-xs font-medium">
                    To
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onViewPaper(evidence.targetPaper.id)}
                      className="hover:text-primary block text-left transition-colors"
                    >
                      <span className="text-sm font-semibold">
                        {evidence.targetPaper.authors.split(",")[0]?.trim()} (
                        {evidence.targetPaper.year})
                      </span>
                    </button>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {evidence.targetPaper.title}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-muted-foreground mb-3 flex items-center gap-1 text-xs font-bold tracking-wider uppercase">
                <Quote className="h-3 w-3" />
                Evidence ({evidence.snippets.length})
              </h4>

              {evidence.snippets.length > 0 ? (
                <>
                  {evidence.snippets.length > 1 && (
                    <div className="mb-3 flex gap-1">
                      {evidence.snippets.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSnippet(idx)}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            idx === activeSnippet
                              ? config.bgColor.replace("/10", "")
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <div
                    className={`relative rounded-sm border p-4 ${config.borderColor} bg-card font-serif shadow-sm`}
                  >
                    {evidence.snippets[activeSnippet].context && (
                      <span className="bg-background border-border text-muted-foreground absolute -top-2.5 right-4 rounded-full border px-2 py-0.5 font-sans text-[10px] tracking-wider uppercase">
                        {evidence.snippets[activeSnippet].context}
                      </span>
                    )}

                    <p className="text-foreground/90 text-sm leading-relaxed">
                      "...
                      {highlightText(
                        evidence.snippets[activeSnippet].text,
                        evidence.edgeType,
                      )}
                      ..."
                    </p>

                    <div className="mt-3 flex items-center justify-end font-sans">
                      <span className="text-foreground/70 text-xs font-medium">
                        {evidence.snippets[activeSnippet].source}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  No citation sentence available yet. Correct the relationship
                  below if you know how these papers relate.
                </div>
              )}

              <div
                className={`${config.bgColor} mt-4 rounded-lg border p-3 ${config.borderColor}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className={`text-sm font-semibold ${config.color}`}>
                    {evidence.signalSource === "user-correction"
                      ? `👨‍🔬 Verified: ${config.label}`
                      : evidence.signalSource === "ithaca-local-moat"
                        ? `⚡ Sovereign AI: ${config.label}`
                        : `AI judgment: ${config.label}`}
                  </span>
                  <span
                    className={`ml-auto font-mono text-xs font-bold ${config.color}`}
                  >
                    {evidence.confidence}%
                  </span>
                </div>
                <div className="bg-background/30 mb-2 h-1 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${config.bgColor.replace("/10", "")}`}
                    style={{ width: `${evidence.confidence}%` }}
                  />
                </div>
                {evidence.signalSource && (
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-[10px] font-medium ${SIGNAL_SOURCE_LABELS[evidence.signalSource]?.color ?? "text-muted-foreground"}`}
                    >
                      {SIGNAL_SOURCE_LABELS[evidence.signalSource]?.label ??
                        "Unknown source"}
                    </p>
                    {evidence.signalSource === "user-correction" && (
                      <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 dark:text-purple-300">
                        Peer Reviewed
                      </span>
                    )}
                  </div>
                )}
              </div>

              {onCorrect && (
                <div className="mt-3 space-y-2">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    One-tap correct
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["supports", "contradicts", "extends"] as const).map(
                      (type) => (
                        <Button
                          key={type}
                          variant={
                            evidence.edgeType === type ? "default" : "outline"
                          }
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            onCorrect(evidence.id, type, "");
                            onClose();
                          }}
                        >
                          {EDGE_CONFIG[type].label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase">
                  <MessageSquare className="h-3 w-3" />
                  Team notes
                </p>
                {commentsLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading notes…
                  </div>
                ) : teamComments.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    No notes yet. Leave a short note for your lab.
                  </p>
                ) : (
                  <div className="max-h-28 space-y-2 overflow-y-auto">
                    {teamComments.map((item) => (
                      <div
                        key={item.id}
                        className="bg-muted/40 rounded-md px-2 py-1.5 text-xs"
                      >
                        <p className="font-medium">{item.actor.name}</p>
                        <p className="text-muted-foreground">{item.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring h-16 w-full rounded-md border bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:ring-1 focus-visible:outline-none"
                  placeholder="Add a note for collaborators…"
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs"
                  disabled={!noteDraft.trim() || noteSaving}
                  onClick={() => void handleAddNote()}
                >
                  {noteSaving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : null}
                  Post note
                </Button>
              </div>
            </div>

            <div className="border-border bg-muted/30 flex gap-2 border-t p-3">
              {pdfUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => window.open(pdfUrl, "_blank", "noopener")}
                >
                  <FileText className="mr-1 h-3 w-3" />
                  Open PDF
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onViewPaper(evidence.sourcePaper.id)}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  View Source
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive flex-1 text-xs"
                onClick={() => {
                  setIsEditing(true);
                  setSelectedType(evidence.edgeType);
                }}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Correct
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
