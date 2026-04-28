"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import Dropzone from "./Dropzone";
import {
  readFileAsDataURL,
  loadImage,
  cropImage,
  autoCenterCrop,
  downloadBlob,
} from "@/lib/imageUtils";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Loader2, PackageOpen, Download, Square, Circle, Trash2 } from "lucide-react";

interface ImageItem {
  id: string;
  file: File;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

type SizePreset = "120x150" | "116x160" | "custom";
type ShapePreset = "square" | "circle";

const SIZE_OPTIONS: { key: SizePreset; label: string; w: number; h: number }[] = [
  { key: "120x150", label: "120 × 150", w: 120, h: 150 },
  { key: "116x160", label: "116 × 160", w: 116, h: 160 },
  { key: "custom", label: "自定义", w: 120, h: 150 },
];

export default function AvatarCrop() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [sizePreset, setSizePreset] = useState<SizePreset>("120x150");
  const [customW, setCustomW] = useState(120);
  const [customH, setCustomH] = useState(150);
  const [shape, setShape] = useState<ShapePreset>("square");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const outputW =
    sizePreset === "custom"
      ? customW
      : SIZE_OPTIONS.find((s) => s.key === sizePreset)!.w;
  const outputH =
    sizePreset === "custom"
      ? customH
      : SIZE_OPTIONS.find((s) => s.key === sizePreset)!.h;
  const aspect = outputW / outputH;

  const isBatch = images.length > 1;
  const selectedImage = selectedIndex >= 0 ? images[selectedIndex] : null;

  const handleFiles = useCallback(
    async (files: File[]) => {
      const items: ImageItem[] = [];
      for (const file of files) {
        const url = await readFileAsDataURL(file);
        const img = await loadImage(url);
        items.push({
          id: Math.random().toString(36).slice(2),
          file,
          url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
        });
      }
      setImages((prev) => {
        const next = [...prev, ...items];
        if (prev.length === 0 && items.length >= 1) {
          setSelectedIndex(0);
        }
        return next;
      });
    },
    []
  );

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      setSelectedIndex(-1);
    } else if (selectedIndex > index) {
      setSelectedIndex((prev) => prev - 1);
    }
  };

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  const downloadSingle = async () => {
    if (!selectedImage || !croppedArea) return;
    setProcessing(true);
    try {
      const blob = await cropImage(
        selectedImage.url,
        croppedArea,
        outputW,
        outputH,
        shape === "circle"
      );
      const name = selectedImage.file.name.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${name}_cropped.png`);
    } finally {
      setProcessing(false);
    }
  };

  const downloadBatch = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    try {
      const zip = new JSZip();
      for (const item of images) {
        const area = autoCenterCrop(
          item.naturalWidth,
          item.naturalHeight,
          outputW,
          outputH
        );
        const blob = await cropImage(
          item.url,
          area,
          outputW,
          outputH,
          shape === "circle"
        );
        const name = item.file.name.replace(/\.[^.]+$/, "");
        zip.file(`${name}_cropped.png`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "头像批量裁切.zip");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground flex flex-col gap-1 list-disc list-inside">
            <li>上传单张图片：手动拖动调整裁切区域，点击下载</li>
            <li>上传多张图片：自动居中裁切，一键批量下载 ZIP</li>
            <li>支持选择输出尺寸和裁切形状（方形 / 圆形）</li>
          </ul>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">裁切设置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            {/* Size preset */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">输出尺寸</Label>
              <ToggleGroup
                value={[sizePreset]}
                onValueChange={(v) => v.length > 0 && setSizePreset(v[v.length - 1] as SizePreset)}
              >
                {SIZE_OPTIONS.map((opt) => (
                  <ToggleGroupItem key={opt.key} value={opt.key} className="text-xs">
                    {opt.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div
                aria-hidden={sizePreset !== "custom"}
                className={`mt-1 flex h-8 items-center gap-2 transition-opacity ${
                  sizePreset === "custom"
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                <Input
                  type="number"
                  value={customW}
                  onChange={(e) => setCustomW(Math.max(1, +e.target.value))}
                  className="h-8 w-20 text-xs"
                  min={1}
                  disabled={sizePreset !== "custom"}
                />
                <span className="text-xs text-muted-foreground">×</span>
                <Input
                  type="number"
                  value={customH}
                  onChange={(e) => setCustomH(Math.max(1, +e.target.value))}
                  className="h-8 w-20 text-xs"
                  min={1}
                  disabled={sizePreset !== "custom"}
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            {/* Shape */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">裁切形状</Label>
              <ToggleGroup
                value={[shape]}
                onValueChange={(v) => v.length > 0 && setShape(v[v.length - 1] as ShapePreset)}
              >
                <ToggleGroupItem value="square" className="text-xs gap-1.5">
                  <Square className="size-3.5" />
                  方形
                </ToggleGroupItem>
                <ToggleGroupItem value="circle" className="text-xs gap-1.5">
                  <Circle className="size-3.5" />
                  圆形
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Dropzone
        onFiles={handleFiles}
        multiple
        label="拖拽图片到此处，或点击上传"
        sublabel="支持多选批量上传 · JPG、PNG、WebP"
      />

      {/* Image List + Crop Preview */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thumbnails */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                已上传{" "}
                <Badge variant="secondary">{images.length} 张</Badge>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImages([]);
                  setSelectedIndex(-1);
                }}
                className="text-destructive hover:text-destructive text-xs h-7"
              >
                清空
              </Button>
            </div>

            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
              {images.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                    selectedIndex === i
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt=""
                    className="size-12 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.naturalWidth} × {item.naturalHeight}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {isBatch && (
              <Button
                onClick={downloadBatch}
                disabled={processing}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <PackageOpen className="size-4" />
                    批量下载 ZIP ({images.length} 张)
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Crop Area */}
          <div className="lg:col-span-2">
            {selectedImage ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">裁切预览</h3>
                  <span className="text-xs text-muted-foreground">
                    输出: {outputW} × {outputH}px ·{" "}
                    {shape === "circle" ? "圆形" : "方形"}
                  </span>
                </div>
                <div className="relative w-full h-[400px] bg-muted rounded-xl overflow-hidden border border-border">
                  <Cropper
                    image={selectedImage.url}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    cropShape={shape === "circle" ? "round" : "rect"}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={handleCropComplete}
                    showGrid
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    缩放
                  </Label>
                  <Slider
                    min={1}
                    max={3}
                    step={0.01}
                    value={[zoom]}
                    onValueChange={(v) => typeof v === 'number' ? setZoom(v) : Array.isArray(v) && v.length > 0 && setZoom((v as number[])[0])}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {zoom.toFixed(1)}×
                  </span>
                </div>
                <Button
                  onClick={downloadSingle}
                  disabled={processing || !croppedArea}
                  variant="secondary"
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      下载裁切图片
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center bg-muted/30 border border-border rounded-xl text-muted-foreground text-sm">
                点击左侧图片进行裁切预览
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
