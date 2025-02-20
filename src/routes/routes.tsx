import { createRoute } from "@tanstack/react-router";
import { RootRoute } from "./__root";
import HomePage from "../pages/HomePage";
import EditingPage from "../pages/EditingPage";

export const HomeRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: HomePage,
});

export const EditingRoute = createRoute({
  getParentRoute: () => RootRoute,
  path: "/editing/$videoSrc/$timer", // Use a dynamic segment
  component: EditingPage,
});

export const rootTree = RootRoute.addChildren([HomeRoute, EditingRoute]);
