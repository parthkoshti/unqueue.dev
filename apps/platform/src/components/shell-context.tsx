import { createContext, useContext } from "react";

type ShellContextValue = {
  openCommandPalette: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);
const ShellLayoutContext = createContext(false);

export function ShellProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ShellContextValue;
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return context;
}

export function ShellLayoutProvider({ children }: { children: React.ReactNode }) {
  return (
    <ShellLayoutContext.Provider value={true}>{children}</ShellLayoutContext.Provider>
  );
}

export function useIsInShellLayout() {
  return useContext(ShellLayoutContext);
}
