import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as React from "react";

const Theme = Schema.Literal("dark", "light", "system");
type Theme = typeof Theme.Type;

const ActualTheme = Schema.Literal("dark", "light");
type ActualTheme = typeof ActualTheme.Type;

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  actualTheme: ActualTheme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  actualTheme: "light",
  setTheme: () => null,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) => {
  const [theme, setTheme] = React.useState<Theme>(() =>
    Option.fromNullable(localStorage.getItem(storageKey)).pipe(
      Option.flatMap(Schema.decodeUnknownOption(Theme)),
      Option.getOrElse(() => defaultTheme),
    ),
  );

  const actualTheme = React.useMemo<ActualTheme>(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(actualTheme);
  }, [actualTheme]);

  const value = {
    theme,
    actualTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
