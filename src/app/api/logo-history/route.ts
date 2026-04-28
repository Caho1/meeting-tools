import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

interface HistoryEntry {
  filename: string;
  path: string;
  domain: string;
  sourceUrl: string;
  savedAt: string;
}

interface DomainGroup {
  domain: string;
  logos: HistoryEntry[];
}

const HISTORY_FILE = path.join(process.cwd(), "public", "logos", "history.json");

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const history = await readHistory();

    // Group by domain, preserving order (newest entry per domain first)
    const domainMap = new Map<string, HistoryEntry[]>();
    for (const entry of history) {
      const arr = domainMap.get(entry.domain) ?? [];
      arr.push(entry);
      domainMap.set(entry.domain, arr);
    }

    const groups: DomainGroup[] = Array.from(domainMap.entries()).map(
      ([domain, logos]) => ({ domain, logos })
    );

    return NextResponse.json(groups);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
