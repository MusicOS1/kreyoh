import {
  createServerClient,
} from "@supabase/ssr";

import {
  NextResponse,
  type NextRequest,
} from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
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
      "KREYOH AUTH CONFIG ERROR:",
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

    url.pathname =
      "/login";

    url.searchParams.set(
      "error",
      "KREYOH authentication is not configured on this deployment."
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
        "KREYOH AUTH CLAIM ERROR:",
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
    if (
      pathname === "/"
    ) {
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
    if (
      pathname ===
        "/login" ||
      pathname ===
        "/signup"
    ) {
      return response;
    }

    /*
     * Everything else belongs to
     * authenticated KREYOH.
     */
    if (!loggedIn) {
      const url =
        request.nextUrl.clone();

      url.pathname =
        "/login";

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

    if (
      isPublicRoute(
        pathname
      )
    ) {
      return NextResponse.next();
    }

    const url =
      request.nextUrl.clone();

    url.pathname =
      "/login";

    url.searchParams.set(
      "error",
      "Authentication service temporarily unavailable."
    );

    return NextResponse.redirect(
      url
    );
  }
}