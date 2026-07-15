import Card from './Card';

const VALUE_COLOR_CLASSES = {
  primary: 'text-primary',
  danger: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  main: 'text-text-main'
};

const ICON_WRAP_CLASSES = {
  primary: 'bg-primary-light text-primary',
  danger: 'bg-danger-light text-danger',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  main: 'bg-bg-base text-text-main'
};

export default function StatTile({ label, value, accent = 'primary', valueColor, icon: Icon }) {
  return (
    <Card accent={accent}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-text-muted">{label}</div>
          <div className={`mt-2 text-3xl font-bold ${VALUE_COLOR_CLASSES[valueColor || accent]}`}>{value}</div>
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${ICON_WRAP_CLASSES[valueColor || accent]}`}>
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>
    </Card>
  );
}
