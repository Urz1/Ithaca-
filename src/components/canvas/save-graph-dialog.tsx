"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bookmark, Check } from "lucide-react";
import {
  saveGraph,
  getProjects,
  type ProjectData,
} from "@/app/(app)/dashboard/actions";

interface SaveGraphDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
  searchQuery?: string;
  nodeCount: number;
  edgeCount: number;
}

export function SaveGraphDialog({
  open,
  onOpenChange,
  defaultTitle,
  searchQuery,
  nodeCount,
  edgeCount,
}: SaveGraphDialogProps) {
  const [title, setTitle] = useState(defaultTitle || "");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(defaultTitle || searchQuery || "");
      setSaved(false);
      setError(null);
      getProjects()
        .then(setProjects)
        .catch(() => {});
    }
  }, [open, defaultTitle, searchQuery]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await saveGraph({
        title: title.trim(),
        query: searchQuery || title.trim(),
        nodeCount,
        edgeCount,
        projectId: projectId && projectId !== "none" ? projectId : undefined,
      });
      setSaved(true);
      setTimeout(() => onOpenChange(false), 1200);
    } catch (e) {
      setError("Failed to save graph. Please try again.");
      console.error("Save graph error:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Save Graph
          </DialogTitle>
          <DialogDescription>
            Save this graph to your dashboard ({nodeCount} nodes, {edgeCount}{" "}
            edges).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label htmlFor="graph-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="graph-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Transformer Architecture Papers"
              disabled={saving || saved}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) handleSave();
              }}
            />
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <label htmlFor="project-select" className="text-sm font-medium">
                Project (optional)
              </label>
              <Select
                value={projectId}
                onValueChange={setProjectId}
                disabled={saving || saved}
              >
                <SelectTrigger id="project-select">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || saving || saved}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved!
                </>
              ) : (
                "Save Graph"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
