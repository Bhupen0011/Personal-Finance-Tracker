export default function EmptyState({ title, description, action }) {
  return (
    <div className="panel-card flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <p className="max-w-md text-sm text-muted">{description}</p>
      {action}
    </div>
  );
}
