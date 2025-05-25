import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const manifestPath = path.join(
      process.cwd(),
      "src/data/events",
      eventId,
      "files",
      "manifest.json"
    );

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json(
        { error: "Manifest not found" },
        { status: 404 }
      );
    }

    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);

    return NextResponse.json(manifest);
  } catch (error) {
    console.error("Error serving manifest:", error);
    return NextResponse.json(
      { error: "Failed to load manifest" },
      { status: 500 }
    );
  }
} 