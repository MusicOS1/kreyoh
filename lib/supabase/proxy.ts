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
  "/contact",
  "/partner",
  "/login",
  "/signup",
  "/forgot-password",
  "/set-password",
  "/admin/login",
  "/admin/access-unavailable",
];

function isPublicRoute(
  pathname: string
) {
  return PUBLIC_ROUTES.includes(
    pathname
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

    const url =
      request.nextUrl.clone();

    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";

    url.searchParams.set(
      "error",
      "FACKTS Music authentication is not configured on this deployment."
    );

    return NextResponse.redirect(
      url
    );
  }

  let response =
    NextResponse.next({
      request,
    });

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
              cookiesToSet
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

              response =
                NextResponse.next(
                  {
                    request,
                  }
                );

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

    if (error) {
      console.error(
        "FACKTS Music AUTH CLAIM ERROR:",
        error.message
      );
    }

    const loggedIn =
      Boolean(
        data?.claims
      );

    /*
     * Public homepage always stays public.
     */
    if (isPublicRoute(pathname) && pathname !== "/login" && pathname !== "/signup") {
      return response;
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
      const url =
        request.nextUrl.clone();

      url.pathname =
        "/workspace";

      return NextResponse.redirect(
        url
      );
    }

    /*
     * Login and signup stay public
     * for visitors.
     */
    if (isPublicRoute(pathname)) {
      return response;
    }

    /*
     * Everything else belongs to
     * authenticated FACKTS Music.
     */
    if (!loggedIn) {
      const url =
        request.nextUrl.clone();

      url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";

      return NextResponse.redirect(
        url
      );
    }

    return response;
  } catch (error) {
    console.error(
      "FACKTS Music PROXY ERROR:",
      error
    );

    if (
      isPublicRoute(
        pathname
      )
    ) {
      return NextResponse.next();
    }

    const url =
      request.nextUrl.clone();

    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";

    url.searchParams.set(
      "error",
      "Authentication service temporarily unavailable."
    );

    return NextResponse.redirect(
      url
    );
  }
}
