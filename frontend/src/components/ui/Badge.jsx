const TONE_CLASSES = {
  primary: 'bg-primary-light text-primary-dark',
  danger: 'bg-danger text-white',
  dangerLight: 'bg-danger-light text-danger',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  neutral: 'bg-bg-base text-text-muted'
};

export default function Badge({ children, tone = 'neutral', icon: Icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}
