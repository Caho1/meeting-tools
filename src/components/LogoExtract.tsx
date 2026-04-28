"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Dropzone from "./Dropzone";
import LogoScraper from "./LogoScraper";
import {
  readFileAsDataURL,
  loadImage,
  removeBackground,
  downloadBlob,
} from "@/lib/imageUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, RefreshCw, Pipette, RotateCcw } from "lucide-react";

export default function LogoExtract() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [tolerance, setTolerance] = useState(50);
  const [targetColor, setTargetColor] = useState({ r: 255, g: 255, b: 255 });
  const [pickMode, setPickMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  const canvasOrigRef = useRef<HTMLCanvasElement>(null);
  const canvasResultRef = useRef<HTMLCanvasElement>(null);

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0];
    setFileName(file.name);
    const url = await readFileAsDataURL(file);
    setImageSrc(url);
    setPreviewUrl(null);
    setTargetColor({ r: 255, g: 255, b: 255 });
  }, []);

  useEffect(() => {
    if (!imageSrc) return;
    const canvas = canvasOrigRef.current;
    if (!canvas) return;

    loadImage(imageSrc).then((img) => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
    });
  }, [imageSrc]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!pickMode) return;
      const canvas = canvasOrigRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      const ctx = canvas.getContext("2d")!;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      setTargetColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
      setPickMode(false);
    },
    [pickMode]
  );

  const processImage = useCallback(() => {
    const canvas = canvasOrigRef.current;
    if (!canvas) return;

    setProcessing(true);
    requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = removeBackground(
        imageData,
        targetColor.r,
        targetColor.g,
        targetColor.b,
        tolerance
      );

      const resultCanvas = canvasResultRef.current!;
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const rctx = resultCanvas.getContext("2d")!;
      rctx.putImageData(result, 0, 0);

      setPreviewUrl(resultCanvas.toDataURL("image/png"));
      setProcessing(false);
    });
  }, [targetColor, tolerance]);

  const downloadResult = useCallback(() => {
    const resultCanvas = canvasResultRef.current;
    if (!resultCanvas) return;
    resultCanvas.toBlob((blob) => {
      if (blob) {
        const name = fileName.replace(/\.[^.]+$/, "");
        downloadBlob(blob, `${name}_transparent.png`);
      }
    }, "image/png");
  }, [fileName]);

  const handleSendToRemoveBg = useCallback(async (imageUrl: string) => {
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const res = await fetch(proxyUrl);
      const blob = await res.blob();
      const ext =
        blob.type.includes("svg")
          ? ".svg"
          : blob.type.includes("png")
            ? ".png"
            : ".png";
      const file = new File([blob], `logo${ext}`, { type: blob.type });
      const url = await readFileAsDataURL(file);
      setFileName(file.name);
      setImageSrc(url);
      setPreviewUrl(null);
      setTargetColor({ r: 255, g: 255, b: 255 });
    } catch {
      setFileName("logo.png");
      setImageSrc(imageUrl);
      setPreviewUrl(null);
      setTargetColor({ r: 255, g: 255, b: 255 });
    }
  }, []);

  const colorHex = `#${targetColor.r.toString(16).padStart(2, "0")}${targetColor.g.toString(16).padStart(2, "0")}${targetColor.b.toString(16).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6">
      {/* === Logo 网页抓取 === */}
      <LogoScraper onSendToRemoveBg={handleSendToRemoveBg} />

      {/* Divider */}
      <div className="relative flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-sm text-muted-foreground shrink-0">Logo 去背景</span>
        <Separator className="flex-1" />
      </div>

      {/* Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground flex flex-col gap-1 list-disc list-inside">
            <li>上传 Logo 图片，默认去除白色背景</li>
            <li>点击「选色模式」后在原图上点击选取要去除的背景色</li>
            <li>调整容差滑块控制去除范围，容差越大去除越多</li>
            <li>满意后下载透明背景的 PNG 文件</li>
          </ul>
        </CardContent>
      </Card>

      {!imageSrc && (
        <Dropzone
          onFiles={handleFiles}
          label="拖拽 Logo 图片到此处，或点击上传"
          sublabel="支持 JPG、PNG、WebP 格式"
        />
      )}

      {imageSrc && (
        <div className="flex flex-col gap-6">
          {/* Controls */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">去背景设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6 items-end">
                {/* Target color */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">目标背景色</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="size-8 rounded border border-border shrink-0"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                      {colorHex}
                    </span>
                    <Button
                      size="sm"
                      variant={pickMode ? "default" : "outline"}
                      className="h-8 text-xs gap-1"
                      onClick={() => setPickMode(!pickMode)}
                    >
                      <Pipette className="size-3.5" />
                      {pickMode ? "选色中..." : "选色模式"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => setTargetColor({ r: 255, g: 255, b: 255 })}
                    >
                      <RotateCcw className="size-3.5" />
                      重置白色
                    </Button>
                  </div>
                </div>

                {/* Tolerance */}
                <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">
                    容差: {tolerance}
                  </Label>
                  <Slider
                    min={0}
                    max={200}
                    step={1}
                    value={[tolerance]}
                    onValueChange={(value) => {
                      if (Array.isArray(value)) {
                        setTolerance(value[0] ?? 50);
                      }
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>精确</span>
                    <span>宽松</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={processImage}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4" />
                        去除背景
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImageSrc(null);
                      setPreviewUrl(null);
                      setFileName("");
                    }}
                  >
                    重新上传
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Original */}
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                原图{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  {imageSize.w} × {imageSize.h}
                  {pickMode && " · 点击图片选取颜色"}
                </span>
              </h3>
              <Card className="p-3 overflow-hidden">
                <canvas
                  ref={canvasOrigRef}
                  onClick={handleCanvasClick}
                  className={`max-w-full h-auto rounded ${
                    pickMode ? "cursor-crosshair" : "cursor-default"
                  }`}
                  style={{ imageRendering: "auto" }}
                />
              </Card>
            </div>

            {/* Result */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold">去背景结果</h3>
                {previewUrl && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs gap-1"
                    onClick={downloadResult}
                  >
                    <Download className="size-3.5" />
                    下载 PNG
                  </Button>
                )}
              </div>
              <Card className="p-3 overflow-hidden">
                {previewUrl ? (
                  <div className="checkerboard rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="去背景结果"
                      className="max-w-full h-auto rounded"
                    />
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                    点击「去除背景」查看效果
                  </div>
                )}
              </Card>
            </div>
          </div>

          <canvas ref={canvasResultRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
