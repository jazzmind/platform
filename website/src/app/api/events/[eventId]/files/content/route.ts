import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Make sure there's no directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const filePath = path.join(
      process.cwd(),
      "src/data/events",
      eventId,
      "files",
      filename
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Read file content
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Infer content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    
    if (ext === ".md") {
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "text/markdown",
        },
      });
    } else if (ext === ".json") {
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else {
      return new NextResponse(fileContent, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  } catch (error) {
    console.error("Error serving file content:", error);
    return NextResponse.json(
      { error: "Failed to load file content" },
      { status: 500 }
    );
  }
} 