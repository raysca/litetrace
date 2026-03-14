import {
  createRootRoute,
  createRoute,
  createRouter,
  createHashHistory,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { Layout } from "./layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { TraceList } from "./pages/TraceList";
import { TraceDetail } from "./pages/TraceDetail";
import { Alerts } from "./pages/Alerts";
import { Analytics } from "./pages/Analytics";
import { Settings } from "./pages/Settings";
import { WelcomePage } from "./pages/WelcomePage";

const rootRoute = createRootRoute({
  beforeLoad: ({ location }) => {
    if (
      !localStorage.getItem("litetrace_welcomed") &&
      location.pathname !== "/welcome"
    ) {
      throw redirect({ to: "/welcome" });
    }
  },
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


const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/welcome",
  component: WelcomePage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  tracesRoute,
  traceDetailRoute,
  alertsRoute,
  analyticsRoute,
  settingsRoute,
  welcomeRoute,
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
