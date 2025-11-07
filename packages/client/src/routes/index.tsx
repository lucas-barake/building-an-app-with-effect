import { createFileRoute } from "@tanstack/react-router";
import { Page } from "./-index/index";

export const Route = createFileRoute("/")({
  component: Page,
});
