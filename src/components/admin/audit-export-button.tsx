"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOrganizationAuditLog } from "@/app/(app)/admin/actions";
import { downloadBlob } from "@/lib/download";

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
          downloadBlob(
            JSON.stringify(bundle, null, 2),
            `ithaca-audit-export-${new Date().toISOString().slice(0, 10)}.json`,
            "application/json",
          );
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
