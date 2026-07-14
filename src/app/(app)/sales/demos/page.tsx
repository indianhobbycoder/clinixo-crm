import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarNav } from "./calendar-nav";
import type { Demo } from "@/lib/supabase/database.types";

type DemoWithLead = Demo & { lead: { id: string; clinic_name: string; phone: string; owner: { name: string } | null } | null };
type View = "month" | "week" | "day" | "list";

const RESULT_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  won: "default",
  lost: "destructive",
  pending: "outline",
  no_show: "secondary",
  rescheduled: "secondary",
};

function DemoChip({ demo }: { demo: DemoWithLead }) {
  return (
    <Link
      href={demo.lead ? `/sales/leads/${demo.lead.id}` : "#"}
      className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs hover:bg-muted/70"
      title={demo.lead?.clinic_name}
    >
      {format(parseISO(demo.scheduled_at), "HH:mm")} {demo.lead?.clinic_name ?? "Unknown"}
    </Link>
  );
}

function DemoRow({ demo }: { demo: DemoWithLead }) {
  return (
    <Link
      href={demo.lead ? `/sales/leads/${demo.lead.id}` : "#"}
      className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
    >
      <div>
        <p className="font-medium">{demo.lead?.clinic_name ?? "Unknown lead"}</p>
        <p className="text-muted-foreground">
          {demo.lead?.phone} · Owner: {demo.lead?.owner?.name ?? "Unassigned"}
        </p>
      </div>
      <div className="text-right">
        <p>{format(parseISO(demo.scheduled_at), "d MMM yyyy, HH:mm")}</p>
        <Badge variant={RESULT_VARIANT[demo.result] ?? "outline"}>{demo.result}</Badge>
      </div>
    </Link>
  );
}

export default async function DemosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = (["month", "week", "day", "list"].includes(params.view ?? "") ? params.view : "month") as View;
  const refDate = params.date ? startOfDay(parseISO(params.date)) : startOfDay(new Date());

  const supabase = await createClient();

  let rangeStart: Date;
  let rangeEnd: Date;
  let label: string;

  if (view === "month") {
    rangeStart = startOfWeek(startOfMonth(refDate));
    rangeEnd = endOfWeek(endOfMonth(refDate));
    label = format(refDate, "MMMM yyyy");
  } else if (view === "week") {
    rangeStart = startOfWeek(refDate);
    rangeEnd = endOfWeek(refDate);
    label = `${format(rangeStart, "d MMM")} - ${format(rangeEnd, "d MMM yyyy")}`;
  } else if (view === "day") {
    rangeStart = refDate;
    rangeEnd = refDate;
    label = format(refDate, "EEEE, d MMMM yyyy");
  } else {
    rangeStart = refDate;
    rangeEnd = refDate;
    label = "All demos";
  }

  let demos: DemoWithLead[] = [];
  let pastDemos: DemoWithLead[] = [];

  if (view === "list") {
    const now = new Date().toISOString();
    const [{ data: upcoming }, { data: past }] = await Promise.all([
      supabase
        .from("demos")
        .select("*, lead:leads(id, clinic_name, phone, owner:profiles(name))")
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("demos")
        .select("*, lead:leads(id, clinic_name, phone, owner:profiles(name))")
        .lt("scheduled_at", now)
        .order("scheduled_at", { ascending: false })
        .limit(50),
    ]);
    demos = (upcoming as unknown as DemoWithLead[]) ?? [];
    pastDemos = (past as unknown as DemoWithLead[]) ?? [];
  } else {
    const rangeEndExclusive = new Date(rangeEnd.getTime() + 24 * 60 * 60 * 1000);
    const { data } = await supabase
      .from("demos")
      .select("*, lead:leads(id, clinic_name, phone, owner:profiles(name))")
      .gte("scheduled_at", rangeStart.toISOString())
      .lt("scheduled_at", rangeEndExclusive.toISOString())
      .order("scheduled_at", { ascending: true });
    demos = (data as unknown as DemoWithLead[]) ?? [];
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Demos</h1>
        <p className="text-sm text-muted-foreground">Scheduled product demos across the pipeline</p>
      </div>

      <CalendarNav view={view} date={refDate} label={label} />

      {view === "month" ? (
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="p-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((day) => {
              const dayDemos = demos.filter((d) => isSameDay(parseISO(d.scheduled_at), day));
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 border-b border-r p-1 ${!isSameMonth(day, refDate) ? "bg-muted/20 text-muted-foreground" : ""}`}
                >
                  <p className={`mb-1 text-xs ${isToday(day) ? "font-bold text-primary" : ""}`}>{format(day, "d")}</p>
                  <div className="space-y-0.5">
                    {dayDemos.slice(0, 3).map((demo) => (
                      <DemoChip key={demo.id} demo={demo} />
                    ))}
                    {dayDemos.length > 3 ? <p className="text-xs text-muted-foreground">+{dayDemos.length - 3} more</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map((day) => {
            const dayDemos = demos.filter((d) => isSameDay(parseISO(d.scheduled_at), day));
            return (
              <Card key={day.toISOString()} className={isToday(day) ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{format(day, "EEE d")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {dayDemos.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No demos</p>
                  ) : (
                    dayDemos.map((demo) => <DemoChip key={demo.id} demo={demo} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {view === "day" ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            {demos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No demos scheduled for this day.</p>
            ) : (
              demos.map((demo) => <DemoRow key={demo.id} demo={demo} />)
            )}
          </CardContent>
        </Card>
      ) : null}

      {view === "list" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming ({demos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {demos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming demos scheduled.</p>
              ) : (
                demos.map((demo) => <DemoRow key={demo.id} demo={demo} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Past ({pastDemos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pastDemos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past demos.</p>
              ) : (
                pastDemos.map((demo) => <DemoRow key={demo.id} demo={demo} />)
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
