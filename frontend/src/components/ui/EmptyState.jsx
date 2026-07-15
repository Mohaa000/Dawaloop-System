export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-base text-text-muted">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      <div className="text-sm font-semibold text-text-main">{title}</div>
      {description && <div className="max-w-xs text-sm text-text-muted">{description}</div>}
    </div>
  );
}
