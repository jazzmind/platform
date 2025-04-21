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
    const fileContent = fs.readFileSync(filePath);

    // Infer content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = "application/octet-stream"; // Default binary
    
    if (ext === ".pdf") {
      contentType = "application/pdf";
    } else if (ext === ".md") {
      contentType = "text/markdown";
    } else if (ext === ".json") {
      contentType = "application/json";
    } else if (ext === ".txt") {
      contentType = "text/plain";
    }

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
} 