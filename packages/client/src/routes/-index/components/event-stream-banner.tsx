import { useAtomRefresh, useAtomValue } from "@effect-atom/atom-react";
import { LoaderIcon } from "lucide-react";
import React from "react";
import { eventStreamAtom } from "../atoms/event-stream-atoms";

export const EventStreamBanner: React.FC = () => {
  const result = useAtomValue(eventStreamAtom);
  const retry = useAtomRefresh(eventStreamAtom);

  // Show banner when:
  // 1. Initial (any waiting state): Stream hasn't connected yet
  // 2. Failure + waiting=true: Stream failed and is retrying
  // 3. Failure + waiting=false: Stream failed and not retrying (show retry button)
  // Don't show when Success (connection working, even if refreshing)
  const showBanner = result._tag === "Initial" || result._tag === "Failure";

  if (!showBanner) return null;

  // "Connecting..." when waiting (Initial or Failure + waiting)
  // "Offline" when Failure + not waiting
  const isConnecting = result.waiting;

  return (
    <div
      className={
        isConnecting
          ? "mb-6 w-full rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm"
          : "mb-6 w-full rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm"
      }
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <div className="inline-flex items-center gap-2 rounded-md bg-warning/20 px-2 py-1 text-xs font-medium text-warning-foreground">
              <LoaderIcon className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-md bg-destructive/20 px-2 py-1 text-xs font-medium text-destructive-foreground">
              <span>Live updates offline</span>
            </div>
          )}
          <span className="text-foreground/80">
            {isConnecting
              ? "Establishing connection to live updates..."
              : "Live updates are temporarily unavailable. You can keep working, but changes may not appear in real time."}
          </span>
        </div>
        {!isConnecting && (
          <button
            type="button"
            onClick={() => retry()}
            className="shrink-0 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Retry connection
          </button>
        )}
      </div>
    </div>
  );
};
