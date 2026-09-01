export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-xl bg-gradient-energy flex items-center justify-center shadow-glow"
        style={{ width: size + 8, height: size + 8 }}
      >
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 Z" fill="white" />
        </svg>
      </div>
      <span className="font-display font-bold text-xl tracking-tight">
        Fit<span className="text-primary">Power</span>
      </span>
    </div>
  );
}
