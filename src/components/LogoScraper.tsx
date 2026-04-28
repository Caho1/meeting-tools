"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Download,
  Loader2,
  RotateCcw,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface LogoCandidate {
  url: string;
  type: string;
  source: string;
}

interface ScrapeResult {
  url: string;
  logos: LogoCandidate[];
  error?: string;
}

interface LogoScraperProps {
  onSendToRemoveBg?: (imageUrl: string) => void;
}

export default function LogoScraper({ onSendToRemoveBg }: LogoScraperProps) {
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [previewScale, setPreviewScale] = useState(1);
  // Map of logoUrl -> "downloading" | "saved"
  const [statusMap, setStatusMap] = useState<Map<string, "downloading" | "saved">>(new Map());

  const handleScrape = useCallback(async () => {
    const lines = urlInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setLoading(true);
    setResults([]);
    setStatusMap(new Map());

    try {
      const res = await fetch("/api/extract-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: lines }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      } else if (data.error) {
        setResults(lines.map((url) => ({ url, logos: [], error: data.error })));
      }
    } catch (err) {
      setResults(
        lines.map((url) => ({
          url,
          logos: [],
          error: err instanceof Error ? err.message : "网络请求失败",
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [urlInput]);

  const handleDownload = useCallback(
    async (logoUrl: string, sourcePageUrl: string) => {
      setStatusMap((prev) => new Map(prev).set(logoUrl, "downloading"));
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(logoUrl)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        const ext =
          blob.type.includes("svg")
            ? ".svg"
            : blob.type.includes("png")
              ? ".png"
              : blob.type.includes("gif")
                ? ".gif"
                : blob.type.includes("webp")
                  ? ".webp"
                  : blob.type.includes("ico") || blob.type.includes("x-icon")
                    ? ".ico"
                    : ".png";

        // 从来源页面提取域名，用于本地保存目录和下载文件名。
        let domain = "unknown";
        try {
          domain = new URL(sourcePageUrl).hostname.replace(/^www\./, "");
        } catch {
          // ignore
        }

        const filename = `${domain}_logo${ext}`;

        // 通过本地 API 保存一份到 public/logos，历史记录页面可以直接读取。
        const arrayBuf = await blob.arrayBuffer();
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(arrayBuf))
        );
        await fetch("/api/save-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            filename,
            mimeType: blob.type || "image/png",
            base64,
            sourceUrl: logoUrl,
          }),
        });

        // 同时触发浏览器下载，让文件进入用户本机下载目录。
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);

        setStatusMap((prev) => new Map(prev).set(logoUrl, "saved"));
      } catch {
        // Fallback
        window.open(logoUrl, "_blank");
        setStatusMap((prev) => {
          const next = new Map(prev);
          next.delete(logoUrl);
          return next;
        });
      }
    },
    []
  );

  const handleSendToRemoveBg = useCallback(
    (logoUrl: string) => {
      onSendToRemoveBg?.(logoUrl);
    },
    [onSendToRemoveBg]
  );

  const zoomOut = useCallback(() => {
    setPreviewScale((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))));
  }, []);

  const zoomIn = useCallback(() => {
    setPreviewScale((value) => Math.min(4, Number((value + 0.25).toFixed(2))));
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-stretch">
      <Card className="min-h-[430px] lg:sticky lg:top-28">
        <CardContent className="flex h-full flex-col gap-6 pt-1">
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">输入网址抓取 Logo</h3>
            <div className="flex flex-col gap-1">
              <Textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={"输入学校或单位官网 URL，每行一个\n例如：https://www.tsinghua.edu.cn"}
                rows={5}
                className="resize-none text-sm"
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !urlInput.includes("\n")
                  ) {
                    e.preventDefault();
                    handleScrape();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                多个网址请每行输入一个。
              </p>
            </div>
            <Button
              onClick={handleScrape}
              disabled={loading || !urlInput.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  抓取中...
                </>
              ) : (
                "抓取 Logo"
              )}
            </Button>
          </section>

          <section className="mt-auto flex flex-col gap-3 border-t pt-5">
            <h3 className="text-sm font-semibold">使用说明</h3>
            <ul className="flex list-disc list-inside flex-col gap-1 text-sm text-muted-foreground">
              <li>输入官网地址后点击抓取 Logo</li>
              <li>右侧会展示 favicon、页面图片和候选 Logo</li>
              <li>可直接下载，或发送到下方去背景工具</li>
            </ul>
          </section>
        </CardContent>
      </Card>

      <Card className="min-h-[430px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">抓取结果</h3>
            {results.length > 0 && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {results.length} 个网址
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="flex min-h-[330px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              结果会展示在这里
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {results.map((result, ri) => (
                <section
                  key={ri}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                      {result.url}
                    </span>
                    {result.error ? (
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {result.error}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        找到 {result.logos.length} 个候选
                      </Badge>
                    )}
                  </div>

                  {result.logos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                      {result.logos.map((logo, li) => {
                        const status = statusMap.get(logo.url);
                        return (
                          <Dialog
                            key={li}
                            onOpenChange={(open) => {
                              if (open) {
                                setPreviewScale(1);
                              }
                            }}
                          >
                            <div className="flex flex-col gap-2 rounded-lg border border-border p-2 transition-colors hover:border-muted-foreground/50">
                              <DialogTrigger className="checkerboard group flex h-24 items-center justify-center overflow-hidden rounded-md border border-transparent outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={logo.url}
                                  alt={logo.source}
                                  className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                                  onError={(e) => {
                                    const t = e.target as HTMLImageElement;
                                    t.style.display = "none";
                                  }}
                                />
                                <span className="sr-only">点击预览 Logo</span>
                              </DialogTrigger>

                              <div className="text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {logo.source}
                                </Badge>
                              </div>

                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={status === "saved" ? "secondary" : "outline"}
                                  className="h-7 flex-1 px-1 text-[11px]"
                                  disabled={status === "downloading"}
                                  onClick={() =>
                                    handleDownload(logo.url, result.url)
                                  }
                                >
                                  {status === "downloading" ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : status === "saved" ? (
                                    <>
                                      <CheckCircle2 className="size-3" />
                                      已保存
                                    </>
                                  ) : (
                                    <>
                                      <Download className="size-3" />
                                      下载
                                    </>
                                  )}
                                </Button>
                                {onSendToRemoveBg && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 flex-1 px-1 text-[11px]"
                                    onClick={() => handleSendToRemoveBg(logo.url)}
                                  >
                                    <Wand2 className="size-3" />
                                    去背景
                                  </Button>
                                )}
                              </div>
                            </div>

                            <DialogContent className="sm:max-w-[860px]">
                              <DialogHeader>
                                <DialogTitle>Logo 预览</DialogTitle>
                                <DialogDescription className="truncate">
                                  {logo.source} · {logo.url}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="outline"
                                    onClick={zoomOut}
                                    disabled={previewScale <= 0.5}
                                  >
                                    <ZoomOut className="size-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPreviewScale(1)}
                                    className="min-w-16"
                                  >
                                    <RotateCcw className="size-3.5" />
                                    {Math.round(previewScale * 100)}%
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="outline"
                                    onClick={zoomIn}
                                    disabled={previewScale >= 4}
                                  >
                                    <ZoomIn className="size-3.5" />
                                  </Button>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  预览使用在线地址，下载会保存到本地
                                </span>
                              </div>
                              <div className="checkerboard flex max-h-[65vh] min-h-[320px] items-center justify-center overflow-auto rounded-lg border border-border p-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={logo.url}
                                  alt={`${logo.source} 预览`}
                                  className="max-h-[58vh] max-w-full origin-center object-contain transition-transform"
                                  style={{ transform: `scale(${previewScale})` }}
                                  onError={(e) => {
                                    const t = e.target as HTMLImageElement;
                                    t.style.display = "none";
                                  }}
                                />
                              </div>
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant={status === "saved" ? "secondary" : "default"}
                                  disabled={status === "downloading"}
                                  onClick={() => handleDownload(logo.url, result.url)}
                                >
                                  {status === "downloading" ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : status === "saved" ? (
                                    <CheckCircle2 className="size-4" />
                                  ) : (
                                    <Download className="size-4" />
                                  )}
                                  {status === "saved" ? "已保存到本地" : "下载到本地"}
                                </Button>
                                {onSendToRemoveBg && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSendToRemoveBg(logo.url)}
                                  >
                                    <Wand2 className="size-4" />
                                    去背景
                                  </Button>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        );
                      })}
                    </div>
                  )}

                  {!result.error && result.logos.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      未在该页面中找到 Logo
                    </p>
                  )}
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
