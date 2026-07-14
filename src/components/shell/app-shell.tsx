import type { ReactNode } from "react";
import { TopNav } from "@/components/shell/top-nav";
import { LeftNav } from "@/components/shell/left-nav";
import type { Mode } from "@/components/shell/nav-config";
import type { Profile } from "@/lib/supabase/database.types";
import { getReminders } from "@/lib/reminders";

export async function AppShell({ profile, mode, children }: { profile: Profile; mode: Mode; children: ReactNode }) {
  const reminders = await getReminders(profile);
  return (
    <div className="flex h-screen flex-col">
      <TopNav profile={profile} mode={mode} reminders={reminders} />
      <div className="flex flex-1 overflow-hidden">
        <LeftNav mode={mode} role={profile.role} />
        <main className="flex-1 overflow-y-auto bg-muted/10 p-6">{children}</main>
      </div>
    </div>
  );
}
