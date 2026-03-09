export function Settings() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
      <div className="text-4xl">⚙️</div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        Database path, retention policy, sampling rules, and export targets. Coming soon.
      </p>
    </div>
  );
}
