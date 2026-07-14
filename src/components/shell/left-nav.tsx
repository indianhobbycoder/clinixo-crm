"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navForMode, type Mode } from "@/components/shell/nav-config";
import type { UserRole } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export function LeftNav({ mode, role }: { mode: Mode; role: UserRole }) {
  const pathname = usePathname();
  const items = navForMode(mode, role);

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-1 border-r bg-muted/20 p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
