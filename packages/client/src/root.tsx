import { RegistryProvider } from "@effect-atom/atom-react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { ThemeProvider } from "./components/providers/theme-provider.tsx";
import "./index.css";
import { KaServices } from "./ka-services.tsx";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RegistryProvider>
      <Toaster />
      <ThemeProvider>
        <KaServices />
        <RouterProvider router={router} />
      </ThemeProvider>
    </RegistryProvider>
  </React.StrictMode>,
);
