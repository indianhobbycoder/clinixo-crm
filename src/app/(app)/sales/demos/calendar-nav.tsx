"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, addWeeks, format, subDays, subMonths, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "day" | "list";
const VIEWS: { key: View; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "list", label: "List" },
];

export function CalendarNav({ view, date, label }: { view: View; date: Date; label: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function push(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    router.push(`/sales/demos?${next.toString()}`);
  }

  function step(direction: 1 | -1) {
    let nextDate: Date;
    if (view === "month") nextDate = direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
    else if (view === "week") nextDate = direction === 1 ? addWeeks(date, 1) : subWeeks(date, 1);
    else nextDate = direction === 1 ? addDays(date, 1) : subDays(date, 1);
    push({ date: format(nextDate, "yyyy-MM-dd") });
  }

  const canNavigate = view !== "list";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {canNavigate ? (
          <>
            <Button variant="outline" size="sm" onClick={() => step(-1)}>
              ←
            </Button>
            <Button variant="outline" size="sm" onClick={() => push({ date: undefined })}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => step(1)}>
              →
            </Button>
          </>
        ) : null}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex rounded-md border p-0.5 text-sm">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => push({ view: v.key })}
            className={cn(
              "rounded-sm px-3 py-1 transition-colors",
              view === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
