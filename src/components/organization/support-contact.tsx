"use client";

import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { getOrganizationSupportContact } from "@/app/(app)/admin/actions";

export function SupportContact({ collapsed }: { collapsed: boolean }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void getOrganizationSupportContact().then(setEmail);
  }, []);

  if (!email) return null;

  if (collapsed) {
    return (
      <a
        href={`mailto:${email}`}
        title={`Pilot support: ${email}`}
        className="text-muted-foreground hover:text-foreground flex justify-center rounded-md p-2 transition-colors"
      >
        <LifeBuoy className="h-4 w-4" />
      </a>
    );
  }

  return (
    <a
      href={`mailto:${email}`}
      className="text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-2 py-2 text-xs transition-colors"
    >
      <span className="mb-0.5 flex items-center gap-1.5 font-medium">
        <LifeBuoy className="h-3.5 w-3.5" />
        Pilot support
      </span>
      <span className="block truncate">{email}</span>
    </a>
  );
}
