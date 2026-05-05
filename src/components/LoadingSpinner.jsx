export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[28px] bg-white/70 p-8 text-center shadow-panel">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
