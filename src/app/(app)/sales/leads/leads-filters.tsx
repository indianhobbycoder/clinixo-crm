"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadPriority, LeadStage, Profile } from "@/lib/supabase/database.types";

const STAGES: LeadStage[] = ["new", "contacted", "demo_scheduled", "demo_done", "negotiation", "won", "lost"];
const PRIORITIES: LeadPriority[] = ["urgent", "high", "normal", "low"];
const ALL = "all";

export function LeadsFilters({
  states,
  specialities,
  reps,
}: {
  states: string[];
  specialities: string[];
  reps: Profile[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === ALL) params.delete(key);
      else params.set(key, value);
      startTransition(() => router.push(`/sales/leads?${params.toString()}`));
    },
    [router, searchParams],
  );

  function submitSearch() {
    setParam("q", q);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitSearch()}
        placeholder="Search clinic name..."
        className="w-52"
      />

      <Select value={searchParams.get("stage") ?? ALL} onValueChange={(v) => setParam("stage", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All stages</SelectItem>
          {STAGES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("priority") ?? ALL} onValueChange={(v) => setParam("priority", v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("state") ?? ALL} onValueChange={(v) => setParam("state", v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All states</SelectItem>
          {states.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("speciality") ?? ALL} onValueChange={(v) => setParam("speciality", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Speciality" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All specialities</SelectItem>
          {specialities.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("owner") ?? ALL} onValueChange={(v) => setParam("owner", v)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All owners</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {reps.map((rep) => (
            <SelectItem key={rep.id} value={rep.id}>
              {rep.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {searchParams.toString() ? (
        <Button variant="ghost" size="sm" onClick={() => router.push("/sales/leads")}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
