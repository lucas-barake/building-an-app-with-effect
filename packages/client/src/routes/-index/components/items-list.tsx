import {
  Result,
  useAtomValue,
} from "@effect-atom/atom-react";
import * as Cause from "effect/Cause";
import {
  AlertCircleIcon,
  CircleIcon,
  ClipboardIcon,
  LoaderIcon,
} from "lucide-react";
import React from "react";
import { getAtom } from "../atoms/example-atoms";

export const ItemsList: React.FC = () => {
  const itemsResult = useAtomValue(getAtom);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {Result.builder(itemsResult)
        .onInitialOrWaiting(() => (
          <div className="p-12 text-center">
            <LoaderIcon className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-muted-foreground">
              Loading tasks...
            </p>
          </div>
        ))
        .onFailure((cause) => (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-3">
              <AlertCircleIcon className="w-6 h-6 text-destructive-text" />
            </div>
            <p className="text-destructive-text font-medium mb-1">
              Failed to load tasks
            </p>
            <p className="text-muted-foreground text-sm">
              {Cause.pretty(cause)}
            </p>
          </div>
        ))
        .onSuccess((items) => {
          if (items.length === 0) {
            return (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <ClipboardIcon className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No tasks yet
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  Add your first task above to get started
                </p>
              </div>
            );
          }

          return (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CircleIcon className="flex-shrink-0 w-3 h-3 text-primary fill-primary" />
                    <span className="text-foreground flex-1">
                      {item.value}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          );
        })
        .orNull()}
    </div>
  );
};
