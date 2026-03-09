import {
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
  Outlet,
} from "@tanstack/react-router";
import { Layout } from "./layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { TraceList } from "./pages/TraceList";
import { TraceDetail } from "./pages/TraceDetail";
import { Alerts } from "./pages/Alerts";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Dashboard,
});

const tracesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/traces",
  component: TraceList,
});

export const traceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/traces/$traceId",
  component: TraceDetail,
});

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/alerts",
  component: Alerts,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: Analytics,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});


const routeTree = rootRoute.addChildren([
  dashboardRoute,
  tracesRoute,
  traceDetailRoute,
  alertsRoute,
  analyticsRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
