"use client";

import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLES_WITH_SALES, ROLES_WITH_SERVICE, type Mode } from "@/components/shell/nav-config";
import type { Profile } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TopNav({ profile, mode }: { profile: Profile; mode: Mode }) {
  const hasSales = ROLES_WITH_SALES.includes(profile.role);
  const hasService = ROLES_WITH_SERVICE.includes(profile.role);
  const showToggle = hasSales && hasService;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold tracking-tight">Clinixo CRM</span>

        {showToggle ? (
          <div className="flex rounded-md border p-0.5 text-sm">
            <Link
              href="/sales/dashboard"
              className={cn(
                "rounded-sm px-3 py-1 transition-colors",
                mode === "sales" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sales CRM
            </Link>
            <Link
              href="/service/dashboard"
              className={cn(
                "rounded-sm px-3 py-1 transition-colors",
                mode === "service" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Service CRM
            </Link>
          </div>
        ) : (
          <Badge variant="secondary" className="text-xs">
            {mode === "sales" ? "Sales CRM" : "Service CRM"}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Notifications" />}>
            <Bell className="size-4" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <p className="text-sm font-medium">Notifications</p>
            <p className="mt-2 text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initials(profile.name)}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">{profile.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{profile.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{profile.email}</span>
                <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                  {profile.role.replace("_", " ")}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
