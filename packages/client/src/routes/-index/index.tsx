import { useAtomMount } from "@effect-atom/atom-react";
import React from "react";
import { eventStreamAtom } from "./atoms/event-stream-atoms";
import { syncAtom } from "./atoms/example-atoms";
import { AddItemForm } from "./components/add-item-form";
import { EventStreamBanner } from "./components/event-stream-banner";
import { ItemsList } from "./components/items-list";

export const Page: React.FC = () => {
  useAtomMount(eventStreamAtom);
  useAtomMount(syncAtom);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Tasks
          </h1>
          <p className="text-muted-foreground">
            Keep track of what matters
          </p>
        </div>

        <EventStreamBanner />
        <AddItemForm />
        <ItemsList />
      </div>
    </div>
  );
};
