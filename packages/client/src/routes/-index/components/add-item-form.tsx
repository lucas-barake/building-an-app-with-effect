import { Result, useAtom } from "@effect-atom/atom-react";
import { LoaderIcon } from "lucide-react";
import React from "react";
import { addAtom } from "../atoms/example-atoms";

export const AddItemForm: React.FC = () => {
  const [addResult, add] = useAtom(addAtom);
  const [inputValue, setInputValue] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    add(inputValue.trim());
    setInputValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          disabled={addResult.waiting}
          className="flex-1 px-4 py-3 bg-card rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-muted-foreground disabled:bg-muted disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={addResult.waiting || !inputValue.trim()}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-muted disabled:cursor-not-allowed transition-all"
        >
          {addResult.waiting ? (
            <LoaderIcon className="h-5 w-5 animate-spin" />
          ) : (
            "Add"
          )}
        </button>
      </div>
    </form>
  );
};
