import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/lib/supabase/database.types";

const DEFAULT_LANDING: Record<UserRole, string> = {
  admin: "/sales/dashboard",
  sales_manager: "/sales/dashboard",
  sales_rep: "/sales/dashboard",
  support_agent: "/service/dashboard",
  support_lead: "/service/dashboard",
};

const SERVICE_ONLY_ROLES: UserRole[] = ["support_agent"];
const SALES_ONLY_ROLES: UserRole[] = ["sales_rep"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === "/login" || pathname.startsWith("/auth");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    if (isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as UserRole | undefined;

    if (role) {
      if (pathname.startsWith("/service") && SALES_ONLY_ROLES.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_LANDING[role];
        return NextResponse.redirect(url);
      }
      if (pathname.startsWith("/sales") && SERVICE_ONLY_ROLES.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_LANDING[role];
        return NextResponse.redirect(url);
      }
      if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_LANDING[role];
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
