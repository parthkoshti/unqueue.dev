export function Brandmark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="7" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="20" y="7" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="4" y="14.5" width="24" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="22" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function BrandmarkIcon({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"
    >
      <Brandmark size={Math.round(size * 0.65)} />
    </div>
  );
}
