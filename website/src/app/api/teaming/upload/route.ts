import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function POST(request: NextRequest) {
  // Ensure the request is multipart form-data and contains a file
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: 'No file provided' },
      { status: 400 }
    );
  }

  // Check file type (must be CSV)
  if (!file.name.endsWith('.csv')) {
    return NextResponse.json(
      { error: 'File must be CSV format' },
      { status: 400 }
    );
  }

  try {
    // Read the file content
    const fileBuffer = await file.arrayBuffer();
    const fileText = new TextDecoder().decode(fileBuffer);

    // Parse CSV content
    const records = parse(fileText, {
      columns: true, // Use the first row as column names
      skip_empty_lines: true,
      trim: true,
    });

    // Validate the required columns exist (id, email)
    const headers = Object.keys(records[0] || {});
    if (!headers.includes('id') || !headers.includes('email')) {
      return NextResponse.json(
        { error: 'CSV must include "id" and "email" columns' },
        { status: 400 }
      );
    }

    // Return the headers and parsed records
    return NextResponse.json({
      headers,
      rows: records,
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV file' },
      { status: 500 }
    );
  }
}

// Set the maximum file size for upload requests (10MB)
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '10mb',
  },
}; 