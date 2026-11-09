/**
 * Canvas Chat Panel - Split View Graph Exploration Assistant
 *
 * A modern, standard AI chatbot interaction for the citation graph canvas:
 * - Real-time SSE token streaming
 * - Stop / Abort generation support
 * - Markdown rendering (bold, italics, lists, headings, code)
 * - Interactive clickable paper citation chips that highlight & focus on the canvas
 * - Copy to clipboard with visual confirmation
 * - Typing cursor indicator (▍)
 * - Resizable side panel with persistent split-view layout
 */

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Send,
  Sparkles,
  X,
  Lightbulb,
  Network,
  TrendingUp,
  GripVertical,
  Trash2,
  Square,
  Copy,
  Check,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface PaperSummary {
  id?: string;
  title: string;
  authors: string;
  year: number;
  citations: number;
  supports?: number;
  refutes?: number;
}

export interface CanvasChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  graphContext: {
    nodeCount: number;
    edgeCount: number;
    selectedNode?: string | null;
    focusedCluster?: string | null;
    papers?: PaperSummary[];
  };
  onNavigateToPaper?: (paperId: string) => void;
  onSelectPaper?: (paperId: string) => void;
  onFocusNode?: (nodeId: string) => void;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

const QUICK_ACTIONS = [
  {
    icon: Lightbulb,
    label: "Most influential papers",
    query: "What are the most influential papers in this graph?",
  },
  {
    icon: Network,
    label: "Contradictions & debates",
    query: "What are the main scientific contradictions or debates visible in this graph?",
  },
  {
    icon: TrendingUp,
    label: "Exploration strategy",
    query: "What exploration path or landmark papers should I investigate next?",
  },
];

// =============================================================================
// MARKDOWN & CITATION FORMATTER
// =============================================================================

interface FormattedMessageContentProps {
  content: string;
  papers?: PaperSummary[];
  onPaperClick?: (paper: PaperSummary) => void;
  isStreaming?: boolean;
}

function FormattedMessageContent({
  content,
  papers = [],
  onPaperClick,
  isStreaming = false,
}: FormattedMessageContentProps) {
  // Build lookup index of papers by author surname and year
  const paperLookup = useMemo(() => {
    const map = new Map<string, PaperSummary>();
    for (const paper of papers) {
      if (!paper.authors) continue;
      const firstAuthor = paper.authors.split(",")[0]?.trim() || "";
      const surname = firstAuthor.split(/\s+/).pop()?.toLowerCase() || "";
      if (surname && paper.year) {
        // e.g. "chen_2015", "hoffmann_2001", "koopman_1994"
        map.set(`${surname}_${paper.year}`, paper);
      }
    }
    return map;
  }, [papers]);

  // Helper to render inline elements (bold, italic, code, citation chips)
  const renderInline = (text: string) => {
    // Regex matches:
    // 1. Bold: `**text**`
    // 2. Inline code: `` `code` ``
    // 3. Citation pattern: `Author (Year)` or `Author et al. (Year)` or `Author et al., Year` or `[Author (Year)]`
    const regex =
      /(\*\*.*?\*\*|`.*?`|\[?[A-Z][a-zA-Z\u00C0-\u024F'-]+(?:\s+et\s+al\.?)?,?\s*\(?(?:19|20)\d{2}\)?\]?)/g;

    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Bold: **text**
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-semibold text-foreground">
            {renderInline(part.slice(2, -2))}
          </strong>
        );
      }

      // Inline code: `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={index}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/50"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // Check if it matches an academic citation format
      const citeMatch = part.match(
        /^\[?([A-Z][a-zA-Z\u00C0-\u024F'-]+)(?:\s+et\s+al\.?)?,?\s*\(?((?:19|20)\d{2})\)?\]?$/,
      );
      if (citeMatch) {
        const surname = citeMatch[1].toLowerCase();
        const year = citeMatch[2];
        const matchedPaper = paperLookup.get(`${surname}_${year}`);

        if (matchedPaper && onPaperClick) {
          const displayLabel = part.replace(/^\[/, "").replace(/\]$/, "");
          return (
            <button
              key={index}
              onClick={() => onPaperClick(matchedPaper)}
              className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-medium text-xs transition-colors border border-violet-500/20 align-baseline cursor-pointer group"
              title={`Focus "${matchedPaper.title}" (${matchedPaper.citations} cites)`}
            >
              <BookOpen className="h-3 w-3 text-violet-500 group-hover:scale-110 transition-transform" />
              <span>{displayLabel}</span>
              <ArrowUpRight className="h-2.5 w-2.5 opacity-60" />
            </button>
          );
        }
      }

      return <span key={index}>{part}</span>;
    });
  };

  // Split lines into structured blocks
  const blocks = useMemo(() => {
    const rawLines = content.split("\n");
    const result: Array<{
      type: "header" | "bullet" | "number" | "quote" | "paragraph" | "codeblock";
      level?: number;
      text?: string;
      items?: string[];
    }> = [];

    let currentList: { type: "bullet" | "number"; items: string[] } | null =
      null;

    const flushList = () => {
      if (currentList) {
        result.push(currentList);
        currentList = null;
      }
    };

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        continue;
      }

      // Heading (###, ##, #)
      if (trimmed.startsWith("#")) {
        flushList();
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        result.push({
          type: "header",
          level,
          text: trimmed.replace(/^#+\s*/, ""),
        });
        continue;
      }

      // Blockquote (> text)
      if (trimmed.startsWith(">")) {
        flushList();
        result.push({
          type: "quote",
          text: trimmed.replace(/^>\s*/, ""),
        });
        continue;
      }

      // Bullet List item (* or -)
      if (/^[-*]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[-*]\s+/, "");
        if (currentList && currentList.type === "bullet") {
          currentList.items.push(itemText);
        } else {
          flushList();
          currentList = { type: "bullet", items: [itemText] };
        }
        continue;
      }

      // Numbered List item (1. 2.)
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, "");
        if (currentList && currentList.type === "number") {
          currentList.items.push(itemText);
        } else {
          flushList();
          currentList = { type: "number", items: [itemText] };
        }
        continue;
      }

      // Regular paragraph
      flushList();
      result.push({
        type: "paragraph",
        text: trimmed,
      });
    }

    flushList();
    return result;
  }, [content]);

  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-foreground">
      {blocks.map((block, idx) => {
        if (block.type === "header") {
          const Tag =
            block.level === 1
              ? "h3"
              : block.level === 2
                ? "h4"
                : "h5";
          return (
            <Tag
              key={idx}
              className="font-semibold text-foreground tracking-tight pt-1 first:pt-0"
            >
              {renderInline(block.text || "")}
            </Tag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-violet-500/50 pl-3 italic text-muted-foreground my-1.5"
            >
              {renderInline(block.text || "")}
            </blockquote>
          );
        }

        if (block.type === "bullet" && block.items) {
          return (
            <ul key={idx} className="space-y-1 my-1 pl-4 list-disc marker:text-violet-500">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "number" && block.items) {
          return (
            <ol key={idx} className="space-y-1 my-1 pl-4 list-decimal marker:text-violet-500 font-medium">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="leading-relaxed font-normal">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderInline(block.text || "")}
          </p>
        );
      })}

      {/* Live typing cursor indicator */}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-violet-500 animate-pulse rounded-xs translate-y-0.5" />
      )}
    </div>
  );
}

// =============================================================================
// RESIZE HANDLE COMPONENT
// =============================================================================

interface ResizeHandleProps {
  onResize: (delta: number) => void;
}

function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      startXRef.current = e.clientX;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "group absolute top-0 bottom-0 left-0 w-1 cursor-col-resize z-20",
        "hover:bg-primary/50 transition-colors",
        isDragging && "bg-primary",
      )}
    >
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "opacity-0 transition-opacity group-hover:opacity-100",
          isDragging && "opacity-100",
        )}
      >
        <GripVertical className="text-muted-foreground h-6 w-6" />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN CHAT PANEL COMPONENT
// =============================================================================

export function CanvasChatPanel({
  isOpen,
  onClose,
  graphContext,
  onNavigateToPaper,
  onSelectPaper,
  onFocusNode,
  defaultWidth = 400,
  minWidth = 320,
  maxWidth = 640,
}: CanvasChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [width, setWidth] = useState(defaultWidth);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const accumulatedRef = useRef<string>("");

  // Auto-scroll to bottom as tokens arrive or new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle panel resize
  const handleResize = useCallback(
    (delta: number) => {
      setWidth((prev) => Math.min(maxWidth, Math.max(minWidth, prev + delta)));
    },
    [minWidth, maxWidth],
  );

  // Click handler for interactive citation chips
  const handlePaperClick = useCallback(
    (paper: PaperSummary) => {
      if (paper.id) {
        onFocusNode?.(paper.id);
        onSelectPaper?.(paper.id);
      } else if (onNavigateToPaper) {
        onNavigateToPaper(paper.title);
      }
    },
    [onFocusNode, onSelectPaper, onNavigateToPaper],
  );

  // Copy assistant response
  const handleCopy = useCallback(async (id: string, text: string) => {
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }

    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Stop / Abort generation
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    const content = accumulatedRef.current.trim() || streamedText.trim();
    if (content) {
      const partialMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, partialMessage]);
    }
    accumulatedRef.current = "";
    setStreamedText("");
    setIsStreaming(false);
  }, [streamedText]);

  // Send message with real-time SSE token streaming
  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text || input.trim();
      if (!messageText || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamedText("");

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const history = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText,
            graphContext: {
              nodeCount: graphContext.nodeCount,
              edgeCount: graphContext.edgeCount,
              selectedNode: graphContext.selectedNode,
              focusedCluster: graphContext.focusedCluster,
              papers: graphContext.papers,
            },
            history,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let errData: any = null;
          try {
            errData = await res.json();
          } catch {
            // non-json
          }
          if (res.status === 429) {
            throw new Error(errData?.error || "RATE_LIMIT_EXCEEDED");
          }
          throw new Error(errData?.error || `Stream request failed (${res.status})`);
        }

        if (!res.body) {
          throw new Error("No response body received from server");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";
        accumulatedRef.current = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            try {
              const payload = JSON.parse(trimmed.slice(6));
              if (payload.type === "token" && payload.token) {
                accumulated += payload.token;
                accumulatedRef.current = accumulated;
                setStreamedText(accumulated);
              } else if (payload.type === "done" && payload.fullContent) {
                accumulated = payload.fullContent;
                accumulatedRef.current = accumulated;
                setStreamedText(accumulated);
              } else if (payload.type === "error") {
                throw new Error(payload.error || "Streaming error");
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }

        // Finalize message
        if (accumulated.trim()) {
          const assistantMessage: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: "assistant",
            content: accumulated,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[Chat Stream] Error:", error);
        const errMsg = error instanceof Error ? error.message : "";
        let fallbackContent = "";

        if (errMsg.includes("RATE_LIMIT") || errMsg.includes("budget")) {
          fallbackContent =
            "AI usage rate limit reached. Please wait a few moments before submitting another query.";
        } else {
          // Sovereign fallback summary using available graph metadata
          const papers = graphContext.papers || [];
          if (papers.length > 0) {
            const mostCited = [...papers]
              .sort((a, b) => b.citations - a.citations)
              .slice(0, 3);
            const contradicted = papers.filter((p) => (p.refutes ?? 0) > 0);

            fallbackContent = `Here is what the citation landscape reveals:\n\n`;
            fallbackContent += `**Graph Scope:** ${graphContext.nodeCount} papers connected by ${graphContext.edgeCount} citation links.\n\n`;
            fallbackContent += `**Landmark Works:**\n`;
            mostCited.forEach((p) => {
              fallbackContent += `- **${p.title}** (${p.year}) — ${p.citations} citations\n`;
            });
            if (contradicted.length > 0) {
              fallbackContent += `\n**Papers with Active Disputes:** ${contradicted.length} papers have opposing or contradictory evidence.`;
            }
          } else {
            fallbackContent =
              "The AI graph assistant is ready. Ask questions about key papers, citation paths, or contradictions in this network.";
          }
        }

        const errorMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: "assistant",
          content: fallbackContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsStreaming(false);
        setStreamedText("");
        abortControllerRef.current = null;
      }
    },
    [input, isStreaming, graphContext, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (isStreaming) {
      handleStop();
    }
    setMessages([]);
    setStreamedText("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="border-border bg-background relative flex h-full flex-col border-l shadow-xl select-text"
      style={{ width }}
    >
      {/* Drag Resize Handle */}
      <ResizeHandle onResize={handleResize} />

      {/* Header */}
      <div className="border-border flex shrink-0 items-center justify-between border-b bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Graph Assistant</h3>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-muted-foreground text-[11px]">
                {graphContext.nodeCount} papers · {graphContext.edgeCount} citation links
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7 rounded-lg"
              onClick={handleClearChat}
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex h-full flex-col justify-center py-6">
            {/* Welcome banner */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/30">
                <MessageSquare className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Explore Scientific Debates</h4>
              <p className="text-muted-foreground text-xs max-w-[260px] mx-auto leading-relaxed">
                Ask about landmark studies, identify points of contradiction, or discover new paths.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">
                Suggested questions
              </p>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action.query)}
                  className="bg-muted/40 hover:bg-muted hover:border-violet-500/30 group flex w-full items-center gap-3 rounded-xl border border-border/40 p-2.5 text-left transition-all"
                >
                  <div className="bg-background border border-border group-hover:border-violet-500/40 flex h-7 w-7 items-center justify-center rounded-lg transition-colors shrink-0">
                    <action.icon className="text-muted-foreground group-hover:text-violet-500 h-3.5 w-3.5 transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-foreground/90 group-hover:text-foreground">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2.5 group",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-xs text-white mt-1">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-xs transition-all relative",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/70 dark:bg-muted/50 border border-border/50 rounded-tl-xs",
                  )}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div>
                      <FormattedMessageContent
                        content={message.content}
                        papers={graphContext.papers}
                        onPaperClick={handlePaperClick}
                      />
                      {/* Copy action footer */}
                      <div className="mt-2 pt-1.5 border-t border-border/30 flex items-center justify-end">
                        <button
                          onClick={() => handleCopy(message.id, message.content)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Live Streaming Message */}
            {isStreaming && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-xs text-white mt-1">
                  <Sparkles className="h-3 w-3" />
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-tl-xs px-3.5 py-2.5 bg-muted/70 dark:bg-muted/50 border border-violet-500/30 shadow-xs">
                  {streamedText ? (
                    <FormattedMessageContent
                      content={streamedText}
                      papers={graphContext.papers}
                      onPaperClick={handlePaperClick}
                      isStreaming={true}
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="bg-violet-500/60 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.3s]" />
                      <span className="bg-violet-500/60 h-2 w-2 animate-bounce rounded-full [animation-delay:-0.15s]" />
                      <span className="bg-violet-500/60 h-2 w-2 animate-bounce rounded-full" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-border bg-background/80 backdrop-blur-xs shrink-0 border-t p-3">
        <div className="bg-muted/40 border-border focus-within:border-violet-500/50 focus-within:ring-violet-500/20 flex items-end gap-2 rounded-xl border transition-all focus-within:ring-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Generating response..."
                : "Ask about papers, debates, or stances..."
            }
            rows={1}
            disabled={isStreaming}
            className="placeholder:text-muted-foreground/60 max-h-[120px] min-h-[44px] flex-1 resize-none bg-transparent px-3.5 py-3 text-xs leading-relaxed focus:outline-none disabled:opacity-50"
          />

          <div className="mr-1.5 mb-1.5 flex items-center gap-1">
            {isStreaming ? (
              <Button
                onClick={handleStop}
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-lg shadow-xs"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                size="icon"
                className="h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-xs"
                title="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
          <span>Enter to send · Shift+Enter for new line</span>
          {isStreaming && (
            <span className="text-violet-500 font-medium animate-pulse">
              Streaming response...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CHAT TOGGLE BUTTON (Toolbar)
// =============================================================================

export interface ChatToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ isOpen, onClick }: ChatToggleButtonProps) {
  return (
    <Button
      variant={isOpen ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7.5 px-2.5 rounded-full gap-1.5 transition-all text-xs shadow-2xs border-black/[0.06] dark:border-white/[0.08]",
        isOpen
          ? "bg-violet-600 hover:bg-violet-700 text-white border-violet-600 font-semibold"
          : "bg-muted/40 dark:bg-zinc-900/40 text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
      )}
      title="Toggle Dialectic AI Synthesis Copilot"
    >
      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
      <span className="hidden xl:inline font-medium">Chat</span>
    </Button>
  );
}
