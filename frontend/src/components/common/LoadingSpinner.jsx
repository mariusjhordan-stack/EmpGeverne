export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className={`animate-spin ${sizes[size]} border-2 border-gold border-t-transparent rounded-full`} />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
