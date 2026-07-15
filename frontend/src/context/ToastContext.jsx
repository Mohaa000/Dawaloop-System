import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

const TONE_ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONE_CLASSES = {
  success: 'border-success-light bg-success-light text-success',
  error: 'border-danger-light bg-danger-light text-danger',
  info: 'border-primary-light bg-primary-light text-primary-dark'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = TONE_ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className={`scale-in flex items-center gap-2.5 rounded-control border px-4 py-3 text-sm font-medium shadow-soft-lg ${TONE_CLASSES[toast.type]}`}
            >
              <Icon size={18} />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is tightly coupled to ToastProvider, splitting into a separate file adds indirection for no benefit
export const useToast = () => useContext(ToastContext);
