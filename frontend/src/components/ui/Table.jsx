export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead>
      <tr className="bg-bg-base text-left text-xs font-semibold uppercase tracking-wide text-text-muted">{children}</tr>
    </thead>
  );
}

export function Th({ children }) {
  return <th className="px-6 py-3.5">{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`px-6 py-4 align-top ${className}`}>{children}</td>;
}

export function Tr({ children, className = '', ...props }) {
  return (
    <tr className={`border-b border-border transition-colors last:border-0 ${className}`} {...props}>
      {children}
    </tr>
  );
}
