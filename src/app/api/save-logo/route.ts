import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

interface SaveLogoBody {
  domain: string;
  filename: string;
  mimeType: string;
  base64: string;
  sourceUrl: string;
}

interface HistoryEntry {
  filename: string;
  path: string;
  domain: string;
  sourceUrl: string;
  savedAt: string;
}

const LOGOS_DIR = path.join(process.cwd(), "public", "logos");
const HISTORY_FILE = path.join(LOGOS_DIR, "history.json");

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

async function writeHistory(entries: HistoryEntry[]) {
  await fs.mkdir(LOGOS_DIR, { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveLogoBody = await request.json();
    const { domain, filename, base64, sourceUrl } = body;

    if (!domain || !filename || !base64) {
      return NextResponse.json(
        { error: "Missing required fields: domain, filename, base64" },
        { status: 400 }
      );
    }

    // Sanitize domain for directory name
    const safeDomain = domain.replace(/[^a-zA-Z0-9._-]/g, "_");

    // Ensure domain directory exists
    const domainDir = path.join(LOGOS_DIR, safeDomain);
    await fs.mkdir(domainDir, { recursive: true });

    // Write the file
    const buffer = Buffer.from(base64, "base64");
    const filePath = path.join(domainDir, filename);
    await fs.writeFile(filePath, buffer);

    // Public path for serving
    const publicPath = `/logos/${safeDomain}/${filename}`;

    // Update history.json
    const history = await readHistory();
    // Remove any duplicate entry with the same path
    const filtered = history.filter((e) => e.path !== publicPath);
    const newEntry: HistoryEntry = {
      filename,
      path: publicPath,
      domain: safeDomain,
      sourceUrl: sourceUrl || "",
      savedAt: new Date().toISOString(),
    };
    filtered.unshift(newEntry); // newest first
    await writeHistory(filtered);

    return NextResponse.json({ ok: true, path: publicPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
