import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type QueueAction = "pause" | "resume" | "drain" | "clean" | "obliterate";

const ACTION_CONFIG: Record<
  QueueAction,
  {
    title: string;
    description: (queueName: string) => string;
    confirmLabel: string;
    destructive: boolean;
    requiresInput: boolean;
  }
> = {
  pause: {
    title: "Pause queue",
    description: (q) => `Pause "${q}". No new jobs will be processed until resumed.`,
    confirmLabel: "Pause",
    destructive: false,
    requiresInput: false,
  },
  resume: {
    title: "Resume queue",
    description: (q) => `Resume processing jobs in "${q}".`,
    confirmLabel: "Resume",
    destructive: false,
    requiresInput: false,
  },
  drain: {
    title: "Drain queue",
    description: (q) =>
      `Remove all waiting jobs from "${q}". Active jobs will finish. This cannot be undone.`,
    confirmLabel: "Drain",
    destructive: true,
    requiresInput: true,
  },
  clean: {
    title: "Clean queue",
    description: (q) =>
      `Remove all completed and failed jobs from "${q}". This cannot be undone.`,
    confirmLabel: "Clean",
    destructive: true,
    requiresInput: true,
  },
  obliterate: {
    title: "Obliterate queue",
    description: (q) =>
      `Permanently delete the queue "${q}" and every job it contains. This cannot be undone.`,
    confirmLabel: "Obliterate",
    destructive: true,
    requiresInput: true,
  },
};

export function QueueActionDialog({
  open,
  action,
  queueName,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  action: QueueAction | null;
  queueName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [inputValue, setInputValue] = useState("");

  if (!action) return null;

  const config = ACTION_CONFIG[action];
  const inputMatches = inputValue === queueName;
  const canConfirm = !config.requiresInput || inputMatches;

  const handleConfirm = () => {
    if (!canConfirm) return;
    setInputValue("");
    onConfirm();
  };

  const handleCancel = () => {
    setInputValue("");
    onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description(queueName)}</AlertDialogDescription>
        </AlertDialogHeader>

        {config.requiresInput && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-medium text-foreground">{queueName}</span> to confirm.
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              placeholder={queueName}
              autoFocus
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <Button
            variant={config.destructive ? "destructive" : "default"}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {config.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type { QueueAction };
