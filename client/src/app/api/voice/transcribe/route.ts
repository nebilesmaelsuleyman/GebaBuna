import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.SERVER_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let res: Response;
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      res = await fetch(`${SERVER_URL}/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });
    } else {
      const body = await req.json();
      res = await fetch(`${SERVER_URL}/voice/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Next.js voice proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Voice transcription proxy error',
      },
      { status: 500 }
    );
  }
}
