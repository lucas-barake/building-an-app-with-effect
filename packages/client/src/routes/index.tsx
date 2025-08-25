import { createFileRoute } from "@tanstack/react-router";
import { IndexPage } from "../features/index";

export const Route = createFileRoute("/")({
  component: IndexPage,
});
