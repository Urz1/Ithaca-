"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LabQuickstartProps {
  collapsed?: boolean;
}

export function LabQuickstart({ collapsed }: LabQuickstartProps) {
  const [dismissed, setDismissed] = useState(true);
  const [completedSteps, setCompletedSteps] = useState({
    workspace: true,
    explored: false,
    battlefield: false,
    collection: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDismissed = localStorage.getItem("ithaca_lab_quickstart_dismissed");
    if (!isDismissed) {
      setDismissed(false);
    }

    // Check progress
    const hasExplored = Boolean(localStorage.getItem("ithaca_has_explored"));
    const hasBattlefield = Boolean(localStorage.getItem("ithaca_has_battlefield"));
    const hasCollection = Boolean(localStorage.getItem("ithaca_has_collection"));

    setCompletedSteps({
      workspace: true,
      explored: hasExplored,
      battlefield: hasBattlefield,
      collection: hasCollection,
    });
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("ithaca_lab_quickstart_dismissed", "true");
  };

  if (dismissed || collapsed) {
    return null;
  }

  const stepsList = [
    {
      id: "workspace",
      label: "Lab workspace allocated",
      done: true,
      href: "/dashboard",
    },
    {
      id: "explored",
      label: "Explore your first debate map",
      done: completedSteps.explored,
      href: "/explore",
    },
    {
      id: "battlefield",
      label: "Activate Battlefield Mode",
      done: completedSteps.battlefield,
      href: "/explore",
    },
    {
      id: "collection",
      label: "Create a watched collection",
      done: completedSteps.collection,
      href: "/projects",
    },
  ];

  const completedCount = stepsList.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / stepsList.length) * 100);

  return (
    <div className="mx-2 my-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all">
      <div className="flex items-center justify-between pb-2 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary animate-pulse" />
          <span className="text-xs font-semibold tracking-tight text-foreground">
            Lab Quickstart
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-muted-foreground">
            {completedCount}/{stepsList.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-5 w-5 text-muted-foreground hover:text-foreground rounded-md"
            title="Dismiss quickstart"
          >
            <X className="size-3" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-zinc-800/60 p-0.5">
        <div
          className="h-full bg-primary transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(var(--primary),0.3)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="mt-2.5 space-y-1">
        {stepsList.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-2 truncate">
              {step.done ? (
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Circle className="size-3.5 text-muted-foreground/50 shrink-0" />
              )}
              <span
                className={`truncate ${
                  step.done
                    ? "line-through text-muted-foreground/70"
                    : "text-foreground font-medium group-hover:text-primary"
                }`}
              >
                {step.label}
              </span>
            </div>
            {!step.done && (
              <ChevronRight className="size-3 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary shrink-0" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
