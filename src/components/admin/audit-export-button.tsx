"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOrganizationAuditLog } from "@/app/(app)/admin/actions";

export function AuditExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      disabled={isExporting}
      onClick={async () => {
        setIsExporting(true);
        try {
          const bundle = await exportOrganizationAuditLog();
          const blob = new Blob([JSON.stringify(bundle, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `ithaca-audit-export-${new Date().toISOString().slice(0, 10)}.json`;
          anchor.click();
          URL.revokeObjectURL(url);
        } finally {
          setIsExporting(false);
        }
      }}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export audit log
    </Button>
  );
}
