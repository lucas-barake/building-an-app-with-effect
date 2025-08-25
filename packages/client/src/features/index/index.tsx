import { cn } from "@/lib/utils/cn";
import { Result, useAtom } from "@effect-atom/atom-react";
import * as Cause from "effect/Cause";
import { CheckCircle2, Loader2, Search, Sparkles, X } from "lucide-react";
import React from "react";
import { OutputEvent, searchAtom } from "./atoms";

const progressSteps: Record<
  OutputEvent["_tag"],
  { label: string; order: number; icon: React.ReactNode }
> = {
  SearchingWeb: { label: "Searching Web", order: 0, icon: <Search className="w-4 h-4" /> },
  EvaluatingCandidates: { label: "Evaluating", order: 1, icon: <Sparkles className="w-4 h-4" /> },
  Summarizing: {
    label: "Summarizing",
    order: 2,
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  ChunkAccumulated: {
    label: "Summarizing",
    order: 2,
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
  },
  Completed: { label: "Completed", order: 3, icon: <CheckCircle2 className="w-4 h-4" /> },
};

export const IndexPage = () => {
  const [result, search] = useAtom(searchAtom);
  const [query, setQuery] = React.useState("");
  const isQueryValid = query.trim().length > 0;

  const handleSearch = () => {
    search({ query });
  };

  const handleCancel = () => {
    search({ query, abort: true });
  };

  const isSearching = result._tag === "Success" && result.waiting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            AI Search Assistant
          </h1>
          <p className="text-slate-400 text-lg">Get intelligent summaries from across the web</p>
        </div>

        {/* Search Form */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="space-y-6"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
              <div className="relative flex gap-3 p-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask anything you want to know..."
                  className="flex-1 px-6 py-4 bg-transparent text-white placeholder:text-slate-500 focus:outline-none text-lg"
                  disabled={isSearching}
                />
                <button
                  type="submit"
                  disabled={!isQueryValid || isSearching}
                  className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:shadow-none"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {isSearching && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        {Result.builder(result)
          .onSuccess((event) => {
            const currentOrder = progressSteps[event._tag].order;
            const visibleSteps = Object.entries(progressSteps).filter(
              ([_tag]) =>
                _tag === "SearchingWeb" ||
                _tag === "EvaluatingCandidates" ||
                _tag === "Summarizing",
            );

            return (
              <div className="space-y-6">
                {/* Progress Indicator */}
                <div className="relative">
                  <div className="flex items-center justify-center gap-8">
                    {visibleSteps.map(([_tag, step], index) => {
                      const isActive = step.order === currentOrder;
                      const isCompleted = currentOrder > step.order;

                      return (
                        <React.Fragment key={_tag}>
                          <div className="flex flex-col items-center gap-3">
                            <div
                              className={cn(
                                "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
                                isActive
                                  ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25"
                                  : isCompleted
                                    ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25"
                                    : "bg-slate-700/50 border border-slate-600/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "transition-all duration-300",
                                  isActive
                                    ? "text-white"
                                    : isCompleted
                                      ? "text-white"
                                      : "text-slate-400",
                                )}
                              >
                                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                              </div>
                              {isActive && (
                                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 animate-ping opacity-20" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-sm font-medium transition-colors duration-300",
                                isActive
                                  ? "text-white"
                                  : isCompleted
                                    ? "text-green-400"
                                    : "text-slate-500",
                              )}
                            >
                              {step.label}
                            </span>
                          </div>
                          {index < visibleSteps.length - 1 && (
                            <div className="w-16 h-0.5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full" />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Results Display */}
                {(event._tag === "Completed" || event._tag === "ChunkAccumulated") && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl">
                      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-a:text-blue-400 prose-code:bg-slate-700/50 prose-pre:bg-slate-800/50">
                        {event._tag === "ChunkAccumulated" ? event.accumulatedText : event.text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
          .onErrorTag("NoSearchResultsFound", () => (
            <div className="relative p-6 bg-slate-800/30 backdrop-blur-sm border border-red-500/20 rounded-2xl">
              <div className="flex items-center gap-3 text-red-400">
                <X className="w-5 h-5" />
                <span>No search results found. Please try a different query.</span>
              </div>
            </div>
          ))
          .onFailure((cause) =>
            Cause.isInterrupted(cause) ? null : (
              <div className="relative p-6 bg-slate-800/30 backdrop-blur-sm border border-red-500/20 rounded-2xl">
                <div className="flex items-center gap-3 text-red-400">
                  <X className="w-5 h-5" />
                  <span>Whoops. An unexpected error occurred. Try again.</span>
                </div>
              </div>
            ),
          )
          .orNull()}
      </div>
    </div>
  );
};
