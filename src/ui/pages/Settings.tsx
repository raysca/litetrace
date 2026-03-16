import { ApiKeys } from "../components/ApiKeys";

export function Settings() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your LiteTrace configuration.</p>
      </div>
      <ApiKeys />
    </div>
  );
}
