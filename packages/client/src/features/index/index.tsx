import { Atom, Result, useAtom, useAtomValue } from "@effect-atom/atom-react";
import * as Cause from "effect/Cause";
import { CheckCircle2, FileText, Search, Sparkles } from "lucide-react";
import React from "react";
import { OutputEvent, searchAtom } from "./atoms";
import {
  CancelButton,
  ContentSection,
  ErrorCard,
  Header,
  PageContainer,
  ProgressConnector,
  ProgressIndicator,
  ProgressStep,
  ResultsCard,
  SearchButton,
  SearchForm,
  SearchInput,
} from "./components";

const progressSteps: Record<
  OutputEvent["_tag"],
  { label: string; order: number; icon: React.ReactNode }
> = {
  SearchingWeb: { label: "Searching Web", order: 0, icon: <Search className="w-4 h-4" /> },
  EvaluatingCandidates: { label: "Evaluating", order: 1, icon: <Sparkles className="w-4 h-4" /> },
  Summarizing: {
    label: "Summarizing",
    order: 2,
    icon: <FileText className="w-4 h-4" />,
  },
  ChunkAccumulated: {
    label: "Summarizing",
    order: 2,
    icon: <FileText className="w-4 h-4" />,
  },
  Completed: { label: "Completed", order: 3, icon: <CheckCircle2 className="w-4 h-4" /> },
};

const Success: React.FC = () => {
  const result = useAtomValue(searchAtom);
  const event = Result.getOrThrow(result);
  const isCancelled = result._tag === "Failure" && Cause.isInterrupted(result.cause);

  const currentOrder = progressSteps[event._tag].order;
  const visibleSteps = Object.entries(progressSteps).filter(
    ([_tag]) =>
      _tag === "SearchingWeb" || _tag === "EvaluatingCandidates" || _tag === "Summarizing",
  );

  return (
    <ContentSection>
      <ProgressIndicator>
        {visibleSteps.map(([_tag, step], index) => {
          const isActive = step.order === currentOrder;
          const isCompleted = currentOrder > step.order;

          return (
            <React.Fragment key={_tag}>
              <ProgressStep
                label={step.label}
                icon={step.icon}
                isActive={isActive}
                isCompleted={isCompleted}
                isCancelled={isCancelled}
              />
              <ProgressConnector isLast={index === visibleSteps.length - 1} />
            </React.Fragment>
          );
        })}
      </ProgressIndicator>

      {(event._tag === "Completed" || event._tag === "ChunkAccumulated") && (
        <ResultsCard>
          {event._tag === "ChunkAccumulated" ? event.accumulatedText : event.text}
        </ResultsCard>
      )}
    </ContentSection>
  );
};

export const IndexPage = () => {
  const [result, search] = useAtom(searchAtom);
  const [query, setQuery] = React.useState("");
  const isQueryValid = query.trim().length > 0;

  const handleSearch = () => {
    search({ query });
  };

  const handleCancel = () => {
    search(Atom.Interrupt);
  };

  const isSearching = result._tag === "Success" && result.waiting;

  return (
    <PageContainer>
      <Header
        title="AI Search Assistant"
        subtitle="Get intelligent summaries from across the web"
      />

      <SearchForm
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <SearchInput value={query} onChange={setQuery} disabled={isSearching} />
        <SearchButton
          onClick={handleSearch}
          disabled={!isQueryValid || isSearching}
          loading={isSearching}
        />
      </SearchForm>

      {isSearching && <CancelButton onClick={handleCancel} />}

      {Result.builder(result)
        .onErrorTag("NoSearchResultsFound", () => (
          <ErrorCard>No search results found. Please try a different query.</ErrorCard>
        ))
        .onFailure((cause) =>
          Cause.isInterrupted(cause) ? null : (
            <ErrorCard>Whoops. An unexpected error occurred. Try again.</ErrorCard>
          ),
        )
        .orNull()}

      {((result._tag === "Failure" && result.previousSuccess._tag === "Some") ||
        result._tag === "Success") && <Success />}
    </PageContainer>
  );
};
