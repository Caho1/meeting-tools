"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export default function Dropzone({
  onFiles,
  multiple = false,
  accept = "image/*",
  label = "拖拽图片到此处，或点击上传",
  sublabel = "支持 JPG、PNG、WebP 格式",
  className,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onFiles(multiple ? files : [files[0]]);
    },
    [onFiles, multiple]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onFiles(multiple ? files : [files[0]]);
      e.target.value = "";
    },
    [onFiles, multiple]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
        dragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <Upload className="size-8 text-muted-foreground" />
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}
