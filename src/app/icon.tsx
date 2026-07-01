import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <svg viewBox="0 0 100 100" width="72%" height="72%" fill="none">
          <path d="M 79.5 46.8 A 30 30 0 1 1 55.2 22.5" stroke="white" strokeWidth="12" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
