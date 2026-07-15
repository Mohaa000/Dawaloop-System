import Spinner from './ui/Spinner';

export default function LoadingScreen({ message = 'Loading Secure Portal...' }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-bg-base font-sans">
      <Spinner size={32} />
      <h2 className="text-sm font-semibold text-text-muted">{message}</h2>
    </div>
  );
}
