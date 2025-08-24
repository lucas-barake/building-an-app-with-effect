import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => <h1>Hello World</h1>,
});
