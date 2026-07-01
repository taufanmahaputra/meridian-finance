import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1f4690 0%, #2e8b8b 100%)',
        }}
      >
        <svg viewBox="0 0 100 100" width="68%" height="68%" fill="none">
          <path d="M 79.5 46.8 A 30 30 0 1 1 55.2 22.5" stroke="white" strokeWidth="12" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
