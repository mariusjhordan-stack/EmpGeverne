export default function LoadingSpinner({ text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {text && <p className="eyebrow">{text}</p>}
    </div>
  );
}
