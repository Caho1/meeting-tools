import { Area } from "react-easy-crop";

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Crop an image to the specified area and output size.
 * If circular is true, clip to an ellipse.
 */
export async function cropImage(
  imageSrc: string,
  cropArea: Area,
  outputWidth: number,
  outputHeight: number,
  circular: boolean
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  if (circular) {
    ctx.beginPath();
    ctx.ellipse(
      outputWidth / 2,
      outputHeight / 2,
      outputWidth / 2,
      outputHeight / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.clip();
  }

  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

/**
 * Auto-center crop: for a given image, calculate the largest centered
 * crop area with the target aspect ratio.
 */
export function autoCenterCrop(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): Area {
  const targetRatio = targetWidth / targetHeight;
  const imgRatio = imgWidth / imgHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (imgRatio > targetRatio) {
    // Image is wider than target ratio — constrain by height
    cropHeight = imgHeight;
    cropWidth = imgHeight * targetRatio;
  } else {
    // Image is taller — constrain by width
    cropWidth = imgWidth;
    cropHeight = imgWidth / targetRatio;
  }

  return {
    x: Math.round((imgWidth - cropWidth) / 2),
    y: Math.round((imgHeight - cropHeight) / 2),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Remove background by target color with tolerance.
 * Returns a new canvas with transparency.
 */
export function removeBackground(
  imageData: ImageData,
  targetR: number,
  targetG: number,
  targetB: number,
  tolerance: number
): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const toleranceSq = tolerance * tolerance;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq <= toleranceSq) {
      // Fully transparent
      data[i + 3] = 0;
    } else if (distSq <= toleranceSq * 4) {
      // Partial transparency for smooth edges
      const ratio = Math.sqrt(distSq) / (tolerance * 2);
      data[i + 3] = Math.round(Math.min(255, ratio * 255));
    }
  }

  return new ImageData(data, imageData.width, imageData.height);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
