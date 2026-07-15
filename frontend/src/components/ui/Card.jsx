// Tailwind's build-time scanner only picks up literal class strings, so accent
// classes must be spelled out here rather than interpolated (`border-l-${accent}`
// would never be generated).
const ACCENT_CLASSES = {
  primary: 'border-l-4 border-l-primary',
  danger: 'border-l-4 border-l-danger',
  success: 'border-l-4 border-l-success',
  warning: 'border-l-4 border-l-warning'
};

export default function Card({ children, className = '', accent, padded = true }) {
  const accentClass = accent ? ACCENT_CLASSES[accent] : '';
  return (
    <div
      className={`rounded-card border border-border bg-surface shadow-soft ${padded ? 'p-6' : ''} ${accentClass} ${className}`}
    >
      {children}
    </div>
  );
}
