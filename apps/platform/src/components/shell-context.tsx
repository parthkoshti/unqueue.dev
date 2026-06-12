import { createContext, useContext, useState, useCallback } from "react";

type ShellContextValue = {
  openCommandPalette: () => void;
};

type StatusBarContextValue = {
  slotContent: React.ReactNode;
  setSlotContent: (content: React.ReactNode) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);
const ShellLayoutContext = createContext(false);
const StatusBarContext = createContext<StatusBarContextValue | null>(null);

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
  const [slotContent, setSlotContentState] = useState<React.ReactNode>(null);
  const setSlotContent = useCallback((content: React.ReactNode) => {
    setSlotContentState(content);
  }, []);

  return (
    <ShellLayoutContext.Provider value={true}>
      <StatusBarContext.Provider value={{ slotContent, setSlotContent }}>
        {children}
      </StatusBarContext.Provider>
    </ShellLayoutContext.Provider>
  );
}

export function useIsInShellLayout() {
  return useContext(ShellLayoutContext);
}

export function useStatusBar() {
  const context = useContext(StatusBarContext);
  if (!context) throw new Error("useStatusBar must be used within ShellLayoutProvider");
  return context;
}
