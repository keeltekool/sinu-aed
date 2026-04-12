import { NextRequest, NextResponse } from "next/server";

// 1x1 transparent PNG — returned when chain CDN blocks the image (e.g. Bauhof 403)
// This prevents console errors; the client onError handler shows the eco fallback icon
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Image proxy — fetches product images server-side to bypass hotlink protection.
 * Usage: /api/img?url=https://www.bauhof.ee/media/catalog/product/...
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  // Only allow known chain domains
  const allowed = [
    "www.bauhof.ee",
    "www.decora.ee",
    "www.ehituseabc.ee",
    "espak.ee",
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (!allowed.some((d) => parsedUrl.hostname === d || parsedUrl.hostname.endsWith("." + d))) {
    return new NextResponse("Domain not allowed", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: parsedUrl.origin + "/",
        Accept: "image/*",
      },
      cache: "force-cache",
    });

    if (!res.ok) {
      // Return 1x1 transparent PNG instead of error — prevents console 403 noise
      return new NextResponse(TRANSPARENT_PNG, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return new NextResponse(TRANSPARENT_PNG, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
