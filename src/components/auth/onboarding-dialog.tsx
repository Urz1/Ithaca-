"use client";

import * as React from "react";
import {
  Network,
  ArrowRight,
  CheckCircle2,
  XCircle,
  GitFork,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function OnboardingDialog({
  open,
  onOpenChange,
  onComplete,
}: OnboardingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[500px] border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl p-6"
        data-testid="onboarding-dialog"
      >
        {/* Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-[10px] font-bold tracking-widest text-primary uppercase shadow-md backdrop-blur-md">
          Dialectic Visual Grammar
        </div>

        <DialogHeader className="pt-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-xl ring-1 ring-primary/30">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                How to read the Dialectic Graph
              </DialogTitle>
              <p className="text-muted-foreground text-xs">
                Ithaca organizes literature through an epistemic lens—revealing consensus, dispute, and lineage.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Micro-constellation Preview */}
        <div className="relative mt-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="text-muted-foreground/80 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
            <span>Epistemic Triad Preview</span>
            <span className="text-primary font-mono">Live Topology</span>
          </div>

          <div className="relative flex h-28 items-center justify-between px-3">
            {/* Seed Node */}
            <div className="flex flex-col items-center z-10">
              <div className="relative flex size-11 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary shadow-lg shadow-primary/20">
                <span className="text-[10px] font-mono font-bold text-primary">SEED</span>
              </div>
              <span className="text-[10px] font-medium text-foreground mt-1 max-w-[70px] truncate text-center">
                Vaswani &apos;17
              </span>
            </div>

            {/* Connecting lines container */}
            <div className="flex-1 px-2 flex flex-col justify-around h-full py-1">
              {/* Supports Edge */}
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 flex-1 bg-supports/70 rounded-full" />
                <span className="text-[9px] font-bold text-supports uppercase tracking-wider bg-supports/10 px-1.5 py-0.5 rounded">
                  Supports
                </span>
                <div className="h-0.5 w-3 bg-supports/70 rounded-full" />
              </div>

              {/* Extends Edge */}
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 flex-1 bg-extends/70 rounded-full" />
                <span className="text-[9px] font-bold text-extends uppercase tracking-wider bg-extends/10 px-1.5 py-0.5 rounded">
                  Extends
                </span>
                <div className="h-0.5 w-3 bg-extends/70 rounded-full" />
              </div>

              {/* Contradicts Edge */}
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 flex-1 bg-contradicts/70 rounded-full" />
                <span className="text-[9px] font-bold text-contradicts uppercase tracking-wider bg-contradicts/10 px-1.5 py-0.5 rounded">
                  Refutes
                </span>
                <div className="h-0.5 w-3 bg-contradicts/70 rounded-full" />
              </div>
            </div>

            {/* Target Nodes Column */}
            <div className="flex flex-col justify-between h-full py-0.5 z-10">
              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-supports/20 border border-supports/60 flex items-center justify-center">
                  <div className="size-2 rounded-full bg-supports" />
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[65px]">Brown &apos;20</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-extends/20 border border-extends/60 flex items-center justify-center">
                  <div className="size-2 rounded-full bg-extends" />
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[65px]">Dao &apos;22</span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="size-5 rounded-full bg-contradicts/20 border border-contradicts/60 flex items-center justify-center">
                  <div className="size-2 rounded-full bg-contradicts" />
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[65px]">Tay &apos;20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend Grid */}
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Supports */}
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <CheckCircle2 className="size-4 text-supports shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Supports</span>
                <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
                  Replicates findings or provides confirming evidence.
                </p>
              </div>
            </div>

            {/* Refutes */}
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <XCircle className="size-4 text-contradicts shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Refutes / Disagree</span>
                <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
                  Directly challenges assumptions or methods.
                </p>
              </div>
            </div>

            {/* Extends */}
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <GitFork className="size-4 text-extends shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Extends</span>
                <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
                  Builds new architecture or broadens scope.
                </p>
              </div>
            </div>

            {/* Cites */}
            <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
              <Link2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-foreground">Cites / Mentions</span>
                <p className="text-muted-foreground text-[11px] leading-tight mt-0.5">
                  Background citations and literature context.
                </p>
              </div>
            </div>
          </div>

          {/* Node Size & Color Note */}
          <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">Node Size:</span> Citation authority
            </div>
            <div className="text-border">|</div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium text-foreground">Cluster:</span> School of thought
            </div>
          </div>
        </div>

        <Button
          data-testid="onboarding-complete-button"
          onClick={onComplete}
          className="mt-4 h-10 w-full font-bold tracking-wide shadow-md"
        >
          Enter Dialectic Canvas
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
