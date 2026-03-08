import { useState, useEffect } from "react";
import { TraceList } from "./pages/TraceList";
import { TraceDetail } from "./pages/TraceDetail";
import "../../styles/globals.css";

type Route =
  | { name: "list" }
  | { name: "detail"; traceId: string };

function parseRoute(hash: string): Route {
  const m = hash.match(/^#\/traces\/([a-f0-9]+)$/);
  if (m?.[1]) return { name: "detail", traceId: m[1] };
  return { name: "list" };
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  function navigate(hash: string) {
    window.location.hash = hash;
    setRoute(parseRoute(hash));
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("#/")}
          className="font-bold text-lg tracking-tight hover:text-primary transition-colors"
        >
          LiteTrace
        </button>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">MVP</span>
      </header>

      <main className="px-6 py-6 max-w-7xl mx-auto">
        {route.name === "list" && (
          <TraceList onSelectTrace={id => navigate(`#/traces/${id}`)} />
        )}
        {route.name === "detail" && (
          <TraceDetail
            traceId={route.traceId}
            onBack={() => navigate("#/")}
          />
        )}
      </main>
    </div>
  );
}
