"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard, X } from "lucide-react";
import { KEYBOARD_SHORTCUTS } from "@/hooks/useCanvasKeyboard";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal showing all available keyboard shortcuts
 */
export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Navigate and control the graph canvas with your keyboard
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.key}
              className="hover:bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5 transition-colors"
            >
              <span className="text-muted-foreground text-sm">
                {shortcut.description}
              </span>
              <kbd className="bg-muted border-border inline-flex min-w-[2rem] items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-semibold shadow-sm">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground border-t pt-2 text-xs">
          <p>
            Press{" "}
            <kbd className="bg-muted rounded px-1.5 py-0.5 text-[10px]">?</kbd>{" "}
            anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating button to show keyboard shortcuts
 * Appears in bottom-left of canvas
 */
export function KeyboardShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-card/90 border-border hover:bg-muted flex h-8 w-8 items-center justify-center rounded-lg border shadow-lg backdrop-blur-sm transition-colors"
      title="Keyboard shortcuts (?)"
      aria-label="Show keyboard shortcuts"
    >
      <Keyboard className="text-muted-foreground h-4 w-4" />
    </button>
  );
}
