// OlahSaham mark: a closed ring with ascending bars — market growth,
// tracked and contained.
export function OlahSahamMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="10" />
      <rect x="34" y="50" width="9" height="16" rx="4" fill="currentColor" />
      <rect x="46" y="40" width="9" height="26" rx="4" fill="currentColor" />
      <rect x="58" y="30" width="9" height="36" rx="4" fill="currentColor" />
    </svg>
  );
}
