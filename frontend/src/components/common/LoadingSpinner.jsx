export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4" role="status" aria-live="polite">
      <div className="loading-orbit" aria-hidden="true"><span className={`animate-spin ${sizes[size]} border border-gold border-t-transparent rounded-full`} /></div>
      {text && <p className="editorial-kicker">{text}</p>}
    </div>
  );
}
