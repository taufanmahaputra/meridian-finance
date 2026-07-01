import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const fontData = await readFile(
    join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf')
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f4690 0%, #14304f 55%, #2e8b8b 100%)',
          fontFamily: 'Geist',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 120, height: 120, borderRadius: 28,
              background: 'rgba(255,255,255,0.14)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 100 100" width="72" height="72" fill="none">
              <path d="M 79.5 46.8 A 30 30 0 1 1 55.2 22.5" stroke="white" strokeWidth="12" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 84, fontWeight: 600, color: 'white', letterSpacing: '-0.02em', display: 'flex' }}>
              OlahDana
            </div>
          </div>
        </div>
        <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.75)', marginTop: 28, display: 'flex' }}>
          All-In-One Financial Platform for Indonesia
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Geist', data: fontData, weight: 600, style: 'normal' }],
    }
  );
}
