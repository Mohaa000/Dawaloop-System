const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-soft hover:bg-primary-dark',
  outline: 'border border-border bg-surface text-text-main hover:bg-bg-base',
  danger: 'border border-danger-light bg-transparent text-danger hover:bg-danger-light',
  ghost: 'bg-transparent text-text-muted hover:bg-bg-base'
};

export default function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-control px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
