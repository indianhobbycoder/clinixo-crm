import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";
import type { ReactNode } from "react";

export default async function ServiceLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentProfile();
  if (!session) redirect("/login");

  return (
    <AppShell profile={session.profile} mode="service">
      {children}
    </AppShell>
  );
}
