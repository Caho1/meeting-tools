"use client";

import AvatarCrop from "@/components/AvatarCrop";
import LogoExtract from "@/components/LogoExtract";
import LogoHistory from "@/components/LogoHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, Image as ImageIcon, History } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="size-11 rounded-lg border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.ico"
              alt="会议信息处理中心 Logo"
              className="size-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              会议信息处理中心
            </h1>
            <p className="text-xs text-muted-foreground">
              专家头像裁切 · Logo 网页抓取与去背景
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Tabs defaultValue="avatar">
          <TabsList className="mb-8 h-12 items-stretch overflow-hidden rounded-xl p-1">
            <TabsTrigger value="avatar" className="h-full gap-2 rounded-lg px-4 text-[15px]">
              <Scissors className="size-5" />
              头像裁切
            </TabsTrigger>
            <TabsTrigger value="logo" className="h-full gap-2 rounded-lg px-4 text-[15px]">
              <ImageIcon className="size-5" />
              Logo 提取
            </TabsTrigger>
            <TabsTrigger value="history" className="h-full gap-2 rounded-lg px-4 text-[15px]">
              <History className="size-5" />
              历史记录
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatar">
            <AvatarCrop />
          </TabsContent>

          <TabsContent value="logo">
            <LogoExtract />
          </TabsContent>

          <TabsContent value="history">
            <LogoHistory />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        会议信息处理中心 · 所有图片处理均在浏览器本地完成，不会上传任何图片
      </footer>
    </div>
  );
}
