import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Prevent Vercel middleware from crashing if env vars are missing.
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "KREYOH AUTH CONFIG ERROR:",
      {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasPublishableKey: Boolean(supabaseKey),
      }
    );

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set(
      "error",
      "KREYOH authentication is not configured on this deployment."
    );

    // Avoid redirect loop if we're already on login.
    if (request.nextUrl.pathname === "/login") {
      return NextResponse.next();
    }

    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value }) => {
                request.cookies.set(
                  name,
                  value
                );
              }
            );

            response = NextResponse.next({
              request,
            });

            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

    const {
      data,
      error,
    } = await supabase.auth.getClaims();

    if (error) {
      console.error(
        "KREYOH AUTH CLAIM ERROR:",
        error.message
      );
    }

    const loggedIn =
      Boolean(data?.claims);

    const pathname =
      request.nextUrl.pathname;

    const isLoginPage =
      pathname === "/login";

    if (!loggedIn && !isLoginPage) {
      const url =
        request.nextUrl.clone();

      url.pathname = "/login";

      return NextResponse.redirect(
        url
      );
    }

    if (loggedIn && isLoginPage) {
      const url =
        request.nextUrl.clone();

      url.pathname = "/";

      return NextResponse.redirect(
        url
      );
    }

    return response;
  } catch (error) {
    console.error(
      "KREYOH PROXY ERROR:",
      error
    );

    // Never allow middleware to kill the whole site.
    if (
      request.nextUrl.pathname ===
      "/login"
    ) {
      return NextResponse.next();
    }

    const url =
      request.nextUrl.clone();

    url.pathname = "/login";
    url.searchParams.set(
      "error",
      "Authentication service temporarily unavailable."
    );

    return NextResponse.redirect(url);
  }
}