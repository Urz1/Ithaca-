"use client";

import { useState } from "react";
import { AlertCircle, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  importPapersToCollection,
  type ImportPapersToCollectionResult,
} from "@/app/(app)/dashboard/actions";
import type { PaperImportFormat } from "@/modules/papers";

const FORMAT_LABELS: Record<PaperImportFormat, string> = {
  zotero: "Zotero (BibTeX export)",
  doi: "DOI list",
  bibtex: "BibTeX",
  ris: "RIS",
  csv: "CSV",
};

const FORMAT_HELP: Record<PaperImportFormat, string> = {
  zotero:
    "In Zotero: select a collection → File → Export Library → BibTeX, then paste the file here.",
  doi: "One DOI per line (bare or https://doi.org/…).",
  bibtex: "Paste a .bib file exported from your reference manager.",
  ris: "Paste a RIS export.",
  csv: "CSV with doi, title, authors, year columns.",
};

interface ImportPapersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  collectionTitle: string;
  onImported?: (result: ImportPapersToCollectionResult) => void;
}

export function ImportPapersDialog({
  open,
  onOpenChange,
  collectionId,
  collectionTitle,
  onImported,
}: ImportPapersDialogProps) {
  const [format, setFormat] = useState<PaperImportFormat>("zotero");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPapersToCollectionResult | null>(
    null,
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const importResult = await importPapersToCollection({
        collectionId,
        format,
        content,
        source: format === "zotero" ? "zotero" : "projects-import-dialog",
      });
      setResult(importResult);
      onImported?.(importResult);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import papers",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setContent("");
      setError(null);
      setResult(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import papers</DialogTitle>
            <DialogDescription>
              Add papers to <strong>{collectionTitle}</strong>. Prefer Zotero
              BibTeX export for the fastest path from your library.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Import format</label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as PaperImportFormat)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-muted-foreground text-xs">
              {FORMAT_HELP[format]}
            </p>

            <div className="grid gap-2">
              <label className="text-sm font-medium">
                Paste or type records
              </label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={
                  format === "doi"
                    ? "10.1000/example.1\nhttps://doi.org/10.1000/example.2"
                    : format === "zotero"
                      ? "@article{…,\n  title = {…},\n  doi = {10.…},\n}"
                      : "Paste your import data here"
                }
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[220px] w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border-destructive/20 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="bg-muted space-y-3 rounded-lg p-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {result.import.papers.length} parsed
                  </Badge>
                  <Badge variant="secondary">
                    {result.createdCount} created
                  </Badge>
                  <Badge variant="secondary">
                    {result.updatedCount} updated
                  </Badge>
                  <Badge variant="secondary">{result.linkedCount} linked</Badge>
                  <Badge>{result.collectionPaperCount} in collection</Badge>
                </div>

                {result.import.errors.length > 0 && (
                  <div>
                    <p className="mb-2 font-medium">
                      {result.import.errors.length} row issues
                    </p>
                    <ul className="text-muted-foreground max-h-32 space-y-1 overflow-y-auto text-xs">
                      {result.import.errors
                        .slice(0, 8)
                        .map((rowError, index) => (
                          <li key={`${rowError.row}-${index}`}>
                            Row {rowError.row}: {rowError.message}
                          </li>
                        ))}
                      {result.import.errors.length > 8 && (
                        <li>…and {result.import.errors.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Close
            </Button>
            <Button type="submit" disabled={loading || !content.trim()}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              {loading ? "Importing..." : "Import papers"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
