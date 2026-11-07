export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="grid min-h-screen place-items-center px-6 text-center"
    >
      <p className="text-sm font-medium text-muted">Loading Relay...</p>
    </main>
  );
}
