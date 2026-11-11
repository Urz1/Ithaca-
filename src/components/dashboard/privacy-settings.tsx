"use client";

import { useState } from "react";
import { AlertCircle, Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteAccount,
  exportAccountData,
} from "@/app/(app)/dashboard/privacy-actions";
import { signOut } from "@/lib/auth-client";
import { downloadBlob } from "@/lib/download";

export function PrivacySettings() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setMessage(null);
    try {
      const bundle = await exportAccountData();
      downloadBlob(
        JSON.stringify(bundle, null, 2),
        `ithaca-data-export-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json",
      );
      setMessage("Your data export download started.");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export account data",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete your account permanently? This cannot be undone.",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut();
      window.location.href = "/";
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete account",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy and data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Export a portable copy of your profile, projects, collections, saved
          graphs, and corrections. Account deletion removes your user record and
          personal organization data.
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg p-3 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2"
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export my data
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
