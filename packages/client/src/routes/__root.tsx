import { createRootRoute } from "@tanstack/react-router";
import { RootPage } from "../features/root/root.page";

export const Route = createRootRoute({
  component: RootPage,
});
