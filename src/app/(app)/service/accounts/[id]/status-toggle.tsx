"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateAccountStatus } from "@/app/(app)/service/accounts/actions";
import type { AccountStatus } from "@/lib/supabase/database.types";

export function StatusToggle({ accountId, status }: { accountId: string; status: AccountStatus }) {
  const [isPending, startTransition] = useTransition();
  const next: AccountStatus = status === "active" ? "churned" : "active";

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status === "active" ? "default" : "destructive"}>{status}</Badge>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              await updateAccountStatus(accountId, next);
              toast.success(next === "churned" ? "Marked as churned" : "Reactivated");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to update status");
            }
          })
        }
      >
        {status === "active" ? "Mark as churned" : "Reactivate"}
      </Button>
    </div>
  );
}
