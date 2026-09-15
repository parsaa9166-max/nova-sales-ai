import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOSTS = new Set([
  'fal.media',
  'storage.googleapis.com',
  'v3.fal.media',
  'v2.fal.media'
]);

const allowedHost = (host) =>
  ALLOWED_HOSTS.has(host) || host.endsWith('.fal.media');

export async function GET(req) {
  try {
    const raw = new URL(req.url).searchParams.get('url');

    if (!raw) {
      return new NextResponse('bad url', { status: 400 });
    }

    const url = new URL(raw);

    if (
      !['https:'].includes(url.protocol) ||
      !allowedHost(url.hostname)
    ) {
      return new NextResponse('url not allowed', { status: 403 });
    }

    const response = await fetch(url, {
      redirect: 'error'
    });

    if (!response.ok) {
      return new NextResponse('download failed', { status: 502 });
    }

    const type =
      response.headers.get('content-type') || 'image/jpeg';

    if (!type.startsWith('image/')) {
      return new NextResponse('not an image', { status: 415 });
    }

    const data = await response.arrayBuffer();

    return new NextResponse(data, {
      headers: {
        'Content-Type': type,
        'Content-Disposition':
          'attachment; filename="nova-product.jpg"',
        'Cache-Control': 'private, no-store'
      }
    });

  } catch {
    return new NextResponse('download failed', {
      status: 500
    });
  }
}
