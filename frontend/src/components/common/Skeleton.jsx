export default function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function WatchCardSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden="true">
      <Skeleton style={{ aspectRatio: '4 / 5', borderRadius: 'var(--radius)' }} />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}
