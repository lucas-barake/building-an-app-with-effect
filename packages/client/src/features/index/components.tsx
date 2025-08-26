import { cn } from "@/lib/utils/cn";
import { CheckCircle2, Loader2, Search, Sparkles, X } from "lucide-react";
import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
    <div className="w-full max-w-3xl space-y-8">{children}</div>
  </div>
);

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => (
  <div className="text-center space-y-3">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 mb-4">
      <Sparkles className="w-8 h-8 text-blue-400" />
    </div>
    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
      {title}
    </h1>
    <p className="text-slate-400 text-lg">{subtitle}</p>
  </div>
);

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Ask anything you want to know...",
  disabled = false,
}) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="flex-1 px-6 py-4 bg-transparent text-white placeholder:text-slate-500 focus:outline-none text-lg"
    disabled={disabled}
  />
);

interface SearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const SearchButton: React.FC<SearchButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
}) => (
  <button
    type="submit"
    onClick={onClick}
    disabled={disabled}
    className="relative px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:shadow-none"
  >
    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
  </button>
);

interface CancelButtonProps {
  onClick: () => void;
}

export const CancelButton: React.FC<CancelButtonProps> = ({ onClick }) => (
  <div className="flex justify-center">
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white border border-slate-600/50 hover:border-slate-500/50 rounded-xl transition-all duration-300 backdrop-blur-sm"
    >
      <X className="w-4 h-4" />
      Cancel
    </button>
  </div>
);

interface SearchFormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export const SearchForm: React.FC<SearchFormProps> = ({ onSubmit, children }) => (
  <div className="relative">
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
        <div className="relative flex gap-3 p-1 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl">
          {children}
        </div>
      </div>
    </form>
  </div>
);

interface ProgressStepProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
}

export const ProgressStep: React.FC<ProgressStepProps> = ({
  label,
  icon,
  isActive,
  isCompleted,
  isCancelled,
}) => (
  <div className="flex flex-col items-center gap-3">
    <div
      className={cn(
        "relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
        isCancelled
          ? "bg-slate-600/30 border border-slate-500/30"
          : isActive
            ? "bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25"
            : isCompleted
              ? "bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25"
              : "bg-slate-700/50 border border-slate-600/50",
      )}
    >
      <div
        className={cn(
          "transition-all duration-300",
          isCancelled
            ? "text-slate-500"
            : isActive
              ? "text-white"
              : isCompleted
                ? "text-white"
                : "text-slate-400",
        )}
      >
        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      {isActive && !isCancelled && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 animate-ping opacity-20" />
      )}
    </div>
    <span
      className={cn(
        "text-sm font-medium transition-colors duration-300",
        isCancelled
          ? "text-slate-500"
          : isActive
            ? "text-white"
            : isCompleted
              ? "text-green-400"
              : "text-slate-500",
      )}
    >
      {label}
    </span>
  </div>
);

interface ProgressConnectorProps {
  isLast?: boolean;
}

export const ProgressConnector: React.FC<ProgressConnectorProps> = ({ isLast = false }) =>
  !isLast ? (
    <div className="w-16 h-0.5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full" />
  ) : null;

interface ProgressIndicatorProps {
  children: React.ReactNode;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ children }) => (
  <div className="relative">
    <div className="flex items-center justify-center gap-8">{children}</div>
  </div>
);

interface ResultsCardProps {
  children: React.ReactNode;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({ children }) => (
  <div className="relative group">
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative p-8 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-2xl">
      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-slate-300 prose-strong:text-white prose-a:text-blue-400 prose-code:bg-slate-700/50 prose-pre:bg-slate-800/50">
        {children}
      </div>
    </div>
  </div>
);

interface ErrorCardProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  icon = <X className="w-5 h-5" />,
  children,
}) => (
  <div className="relative p-6 bg-slate-800/30 backdrop-blur-sm border border-red-500/20 rounded-2xl">
    <div className="flex items-center gap-3 text-red-400">
      {icon}
      <span>{children}</span>
    </div>
  </div>
);

interface ContentSectionProps {
  children: React.ReactNode;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ children }) => (
  <div className="space-y-6">{children}</div>
);
