"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, ExternalLink, ImageOff } from "lucide-react";

interface LogoEntry {
  filename: string;
  path: string;      // public-relative path, e.g. /logos/example.com/logo.png
  domain: string;
  sourceUrl: string;
  savedAt: string;   // ISO string
}

interface DomainGroup {
  domain: string;
  logos: LogoEntry[];
}

// 统一读取历史记录，调用方只负责决定拿到数据后如何更新界面。
async function requestHistory(): Promise<DomainGroup[] | null> {
  const res = await fetch("/api/logo-history");
  if (!res.ok) {
    return null;
  }

  return (await res.json()) as DomainGroup[];
}

export default function LogoHistory() {
  const [groups, setGroups] = useState<DomainGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const applyHistory = useCallback((data: DomainGroup[]) => {
    setGroups(data);
    setLastFetched(new Date());
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestHistory();
      if (data) applyHistory(data);
    } catch {
      // 刷新失败时保留当前列表，避免页面突然清空。
    } finally {
      setLoading(false);
    }
  }, [applyHistory]);

  useEffect(() => {
    let isCurrent = true;

    async function loadInitialHistory() {
      try {
        const data = await requestHistory();
        if (isCurrent && data) applyHistory(data);
      } catch {
        // 首次加载失败时保持空列表，用户可以手动刷新。
      }
    }

    void loadInitialHistory();

    return () => {
      isCurrent = false;
    };
  }, [applyHistory]);

  const totalCount = groups.reduce((sum, g) => sum + g.logos.length, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">已保存的 Logo</h2>
          {totalCount > 0 && (
            <Badge variant="secondary">{totalCount} 个</Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          刷新
        </Button>
      </div>

      {lastFetched && (
        <p className="text-xs text-muted-foreground">
          上次刷新：{lastFetched.toLocaleTimeString()}
        </p>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <ImageOff className="size-10 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              还没有保存过 Logo
            </p>
            <p className="text-xs text-muted-foreground">
              在「Logo 提取」标签页中点击下载，即可自动保存到本地
            </p>
          </CardContent>
        </Card>
      )}

      {/* Domain groups */}
      {groups.length > 0 && (
        <ScrollArea className="h-[600px] pr-3">
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <Card key={group.domain}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{group.domain}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.logos.length} 个
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {group.logos.map((logo, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-2 flex flex-col gap-2 hover:border-muted-foreground/40 transition-colors"
                      >
                        {/* Preview */}
                        <div className="checkerboard rounded-md overflow-hidden flex items-center justify-center h-20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logo.path}
                            alt={logo.filename}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                            }}
                          />
                        </div>

                        {/* Filename */}
                        <p
                          className="text-[11px] text-foreground truncate"
                          title={logo.filename}
                        >
                          {logo.filename}
                        </p>

                        {/* Save time */}
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(logo.savedAt).toLocaleDateString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Source link */}
                        {logo.sourceUrl && (
                          <a
                            href={logo.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ExternalLink className="size-2.5" />
                            查看原图
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
