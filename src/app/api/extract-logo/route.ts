import { NextRequest, NextResponse } from "next/server";

interface LogoCandidate {
  url: string;
  type: string;
  source: string;
}

function resolveUrl(base: string, relative: string): string {
  try {
    // Handle protocol-relative URLs
    if (relative.startsWith("//")) {
      const baseUrl = new URL(base);
      return `${baseUrl.protocol}${relative}`;
    }
    // Handle data URIs — skip them
    if (relative.startsWith("data:")) {
      return relative;
    }
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function extractLogosFromHtml(html: string, baseUrl: string): LogoCandidate[] {
  const candidates: LogoCandidate[] = [];
  const seen = new Set<string>();

  const addCandidate = (url: string, type: string, source: string) => {
    if (!url || url.startsWith("data:")) return;
    const resolved = resolveUrl(baseUrl, url);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push({ url: resolved, type, source });
  };

  // 1. <link rel="icon"> / <link rel="shortcut icon"> / <link rel="apple-touch-icon">
  const linkIconRe =
    /<link[^>]*\brel\s*=\s*["'](?:shortcut\s+icon|icon|apple-touch-icon(?:-precomposed)?)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkIconRe.exec(html)) !== null) {
    const tag = m[0];
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) {
      const rel = tag.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1] || "icon";
      const sourceLabel = rel.toLowerCase().includes("apple")
        ? "Apple Touch Icon"
        : rel.toLowerCase().includes("shortcut")
          ? "Shortcut Icon"
          : "Favicon";
      addCandidate(hrefMatch[1], "favicon", sourceLabel);
    }
  }

  // 2. <meta property="og:image">
  const ogImageRe =
    /<meta[^>]*\bproperty\s*=\s*["']og:image["'][^>]*>/gi;
  while ((m = ogImageRe.exec(html)) !== null) {
    const tag = m[0];
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i);
    if (contentMatch) {
      addCandidate(contentMatch[1], "og:image", "Open Graph Image");
    }
  }
  // Also handle reversed attribute order
  const ogImageRe2 =
    /<meta[^>]*\bcontent\s*=\s*["']([^"']+)["'][^>]*\bproperty\s*=\s*["']og:image["'][^>]*>/gi;
  while ((m = ogImageRe2.exec(html)) !== null) {
    addCandidate(m[1], "og:image", "Open Graph Image");
  }

  // 3. <img> tags where src/alt/class/id contain "logo"
  const imgRe = /<img[^>]*>/gi;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch =
      tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) ||
      tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;

    const src = srcMatch[1];
    const alt = tag.match(/\balt\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    const cls = tag.match(/\bclass\s*=\s*["']([^"']+)["']/i)?.[1] || "";
    const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] || "";

    const haystack = `${src} ${alt} ${cls} ${id}`.toLowerCase();
    if (haystack.includes("logo")) {
      addCandidate(src, "img", `<img> Logo (${alt || cls || id || "src 含 logo"})`);
    }
  }

  // 4. <header> or <nav> region images — first image in each as fallback
  const regionRe = /<(header|nav)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  while ((m = regionRe.exec(html)) !== null) {
    const regionTag = m[1];
    const regionContent = m[2];

    // Look for <img> inside the region
    const regionImgRe = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/i;
    const imgMatch = regionContent.match(regionImgRe);
    if (imgMatch) {
      addCandidate(
        imgMatch[1],
        "header",
        `<${regionTag}> 区域首张图片`
      );
    }

    // Also look for background-image in inline styles
    const bgRe = /background(?:-image)?\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i;
    const bgMatch = regionContent.match(bgRe);
    if (bgMatch) {
      addCandidate(
        bgMatch[1],
        "header",
        `<${regionTag}> 区域背景图`
      );
    }
  }

  // 5. Default favicon fallback: /favicon.ico
  addCandidate("/favicon.ico", "favicon", "默认 /favicon.ico");

  return candidates;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [body.url];

    if (!urls.length || !urls[0]) {
      return NextResponse.json(
        { error: "请提供至少一个 URL" },
        { status: 400 }
      );
    }

    const results: { url: string; logos: LogoCandidate[]; error?: string }[] = [];

    for (const rawUrl of urls) {
      let targetUrl = rawUrl.trim();
      if (!targetUrl) continue;

      // Ensure protocol
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
          results.push({
            url: targetUrl,
            logos: [],
            error: `HTTP ${response.status}: ${response.statusText}`,
          });
          continue;
        }

        const html = await response.text();
        // Use the final URL after redirects as the base
        const finalUrl = response.url || targetUrl;
        const logos = extractLogosFromHtml(html, finalUrl);

        results.push({ url: targetUrl, logos });
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.name === "AbortError"
              ? "请求超时（10 秒）"
              : err.message
            : "未知错误";
        results.push({ url: targetUrl, logos: [], error: message });
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "请求解析失败" },
      { status: 400 }
    );
  }
}
