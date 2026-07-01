// OlahAtur mark: a closed ring (completeness/control) with a checkmark —
// organizing, tracking, keeping things in order.
export function OlahAturMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="10" />
      <path d="M32 52 L44 64 L70 36" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
