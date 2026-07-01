// Master brand mark: the "O" of Olah as a closed ring, with a bold diagonal
// arrow piercing through toward the upper right — motion/growth breaking
// past the ring. Uses a full circle (no dasharray/arc tricks) so it renders
// identically in-browser and in the OG-image/favicon generator.
export function OlahDanaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M 79.5 46.8 A 30 30 0 1 1 55.2 22.5"
        stroke="currentColor" strokeWidth="12" strokeLinecap="round"
      />
    </svg>
  );
}
