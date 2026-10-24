import { authRecoveryHtml, isTransientAuthError } from "../authFailure";
import { safeNext } from "../navigation";
import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/listen",
  "/contact",
  "/partner",
  "/login",
  "/signup",
  "/forgot-password",
  "/set-password",
  "/auth/callback",
  "/auth/signout",
  "/api/session/status",
  "/api/listening",
  "/admin/login",
  "/admin/access-unavailable",
];

function isPublicRoute(
  pathname: string
) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    pathname === "/billboard" ||
    /^\/billboard\/[0-9a-f-]{36}$/i.test(pathname) ||
    /^\/api\/releases\/[0-9a-f-]{36}\/media$/i.test(pathname) ||
    pathname === "/creators" ||
    pathname.startsWith("/creators/")
  );
}

export async function updateSession(
  request: NextRequest
) {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const pathname =
    request.nextUrl.pathname;

  if (
    !supabaseUrl ||
    !supabaseKey
  ) {
    console.error(
      "FACKTS Music AUTH CONFIG ERROR:",
      {
        hasSupabaseUrl:
          Boolean(
            supabaseUrl
          ),
        hasPublishableKey:
          Boolean(
            supabaseKey
          ),
      }
    );

    if (
      isPublicRoute(
        pathname
      )
    ) {
      return NextResponse.next();
    }

    return new NextResponse(authRecoveryHtml, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-fackts-path", pathname + request.nextUrl.search);
  let response =
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  function finish(result = response) {
    response.cookies.getAll().forEach(cookie => result.cookies.set(cookie));
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  }
  function unavailable() {
    return finish(new NextResponse(authRecoveryHtml, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Retry-After": "5" } }));
  }

  try {
    const supabase =
      createServerClient(
        supabaseUrl,
        supabaseKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },

            setAll(
              cookiesToSet,
              cacheHeaders
            ) {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                }) => {
                  request.cookies.set(
                    name,
                    value
                  );
                }
              );

              const previousCookies = response.cookies.getAll();
              requestHeaders.set("cookie", request.cookies.toString());
              response =
                NextResponse.next(
                  {
                    request: { headers: requestHeaders },
                  }
                );

              previousCookies.forEach(cookie => response.cookies.set(cookie));
              Object.entries(cacheHeaders || {}).forEach(([name, value]) => response.headers.set(name, value));
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
    } =
      await supabase.auth
        .getClaims();

    if (isTransientAuthError(error)) {
      return isPublicRoute(pathname) ? finish() : unavailable();
    }
    if (error) {
      console.error(
        "FACKTS Music AUTH CLAIM ERROR:",
        error.message
      );
    }

    let loggedIn =
      Boolean(
        data?.claims
      );

    // A locally valid access token may have had its session revoked remotely.
    // Verify before redirecting away from an authentication screen to avoid loops.
    if (loggedIn && (pathname === "/login" || pathname === "/signup")) {
      const verification = await supabase.auth.getUser();
      if (isTransientAuthError(verification.error)) return unavailable();
      loggedIn = Boolean(verification.data.user);
    }

    /*
     * Public homepage always stays public.
     */
    if (isPublicRoute(pathname) && pathname !== "/login" && pathname !== "/signup") {
      return finish();
    }

    /*
     * Already authenticated users don't
     * need login/signup screens.
     */
    if (
      loggedIn &&
      (
        pathname ===
          "/login" ||
        pathname ===
          "/signup"
      )
    ) {
      const url = new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url);

      const redirected = NextResponse.redirect(url);
      return finish(redirected);
    }

    /*
     * Login and signup stay public
     * for visitors.
     */
    if (isPublicRoute(pathname)) {
      return finish();
    }

    /*
     * Everything else belongs to
     * authenticated FACKTS Music.
     */
    if (!loggedIn) {
      const url =
        request.nextUrl.clone();

      url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
      url.search = "";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);

      return finish(NextResponse.redirect(url));
    }

    return finish();
  } catch (error) {
    console.error(
      "FACKTS Music PROXY ERROR:",
      error
    );

    if (isPublicRoute(pathname)) return finish();
    return unavailable();
  }
}
