import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { BookmarkIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { rpcClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@unqueue/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const folderNameSchema = z.string().trim().min(1, "Name is required").max(100);

export function BookmarkFolderPicker({
  open,
  onOpenChange,
  workspaceId,
  redisInstanceId,
  queueName,
  jobId,
  environmentId,
  canWrite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  redisInstanceId: string;
  queueName: string;
  jobId: string;
  environmentId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const [creatingFolder, setCreatingFolder] = useState(false);

  const foldersQuery = useQuery({
    queryKey: ["bookmark-folders", workspaceId],
    queryFn: () => rpcClient.bookmark.listFolders({ workspaceId }),
    enabled: open,
  });

  const createFolderForm = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      const parsed = folderNameSchema.safeParse(value.name);
      if (!parsed.success) return;
      await rpcClient.bookmark.createFolder({
        workspaceId,
        name: parsed.data,
      });
      createFolderForm.reset();
      setCreatingFolder(false);
      void queryClient.invalidateQueries({
        queryKey: ["bookmark-folders", workspaceId],
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (folderId: string) =>
      rpcClient.bookmark.createBookmark({
        workspaceId,
        folderId,
        redisInstanceId,
        queueName,
        jobId,
        environmentId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookmarks", workspaceId] });
      onOpenChange(false);
    },
  });

  const folders = foldersQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Bookmark job</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Save a snapshot of this job to a folder.
          </p>
        </DialogHeader>

        {!canWrite ? (
          <p className="text-sm text-muted-foreground">
            Viewers cannot create bookmarks.
          </p>
        ) : foldersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {folders.length === 0 && !creatingFolder ? (
              <p className="text-sm text-muted-foreground">
                No folders yet. Create one to save this job.
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {folders.map((folder) => (
                  <li key={folder.id}>
                    <button
                      type="button"
                      disabled={bookmarkMutation.isPending}
                      onClick={() => void bookmarkMutation.mutate(folder.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50",
                        bookmarkMutation.variables === folder.id &&
                          bookmarkMutation.isPending &&
                          "opacity-60",
                      )}
                    >
                      <BookmarkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                      {folder.isShared && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          Shared
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {creatingFolder ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void createFolderForm.handleSubmit();
                }}
                className="space-y-2 rounded-lg border p-3"
              >
                <createFolderForm.Field name="name">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label htmlFor="new-folder-name">Folder name</Label>
                      <Input
                        id="new-folder-name"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. Failed jobs"
                        autoFocus
                      />
                    </div>
                  )}
                </createFolderForm.Field>
                <div className="flex gap-1.5">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createFolderForm.state.isSubmitting}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCreatingFolder(false);
                      createFolderForm.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setCreatingFolder(true)}
              >
                <PlusIcon />
                New folder
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
