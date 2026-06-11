import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { PlusIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import { z } from "zod";
import { DEFAULT_ENVIRONMENT_NAMES } from "@unqueue/shared";
import { rpcClient } from "@/lib/api";
import { getPreferredEnvironmentId } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@unqueue/ui/components/label";
import { Badge } from "@unqueue/ui/components/badge";
import {
  Card,
  CardContent,
} from "@unqueue/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/$workspaceId/settings/environments")({
  component: EnvironmentsSettings,
});

const thClass =
  "px-4 py-2.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const tdClass = "px-4 py-3 align-middle";

function formatCreated(at: Date | string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(at),
  );
}

function CreateEnvironmentForm({
  workspaceId,
  onSuccess,
  onCancel,
}: {
  workspaceId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      const parsed = z
        .object({
          name: z.string().trim().min(1, "Name is required").max(100),
        })
        .safeParse(value);

      if (!parsed.success) {
        setFormError(parsed.error.errors[0]?.message ?? "Invalid form values");
        return;
      }

      setFormError(null);

      try {
        await rpcClient.environment.create({
          workspaceId,
          name: parsed.data.name,
        });
        onSuccess();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to create environment",
        );
      }
    },
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value.trim() ? "Name is required" : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="environment-name">Environment name</Label>
              <Input
                id="environment-name"
                placeholder="qa"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={!!field.state.meta.errors.length}
              />
              {field.state.meta.errors[0] && (
                <p className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Use a short, descriptive name like qa or preview.
              </p>
            </div>
          )}
        </form.Field>

        {formError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}
      </div>

      <SheetFooter className="border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={form.state.isSubmitting} loadingText="Creating...">
          Create environment
        </Button>
      </SheetFooter>
    </form>
  );
}

function EnvironmentsSettings() {
  const { workspaceId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
  });

  const environmentsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const workspace = workspacesQuery.data?.find((item) => item.id === workspaceId);
  const canManage = workspace?.role === "owner" || workspace?.role === "admin";
  const environments = environmentsQuery.data ?? [];
  const preferredEnvironmentId = getPreferredEnvironmentId(workspaceId);
  const isLoading = environmentsQuery.isLoading || workspacesQuery.isLoading;
  const isFetching = environmentsQuery.isFetching;

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["environments", workspaceId],
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-medium">Environments</h1>
          <p className="text-xs text-muted-foreground">
            Separate Redis connections and queue data by environment. New
            workspaces start with{" "}
            {DEFAULT_ENVIRONMENT_NAMES.join(", ")}.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={isFetching}
          >
            <RefreshCwIcon className={isFetching ? "animate-spin" : undefined} />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <PlusIcon />
              Add environment
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!canManage && (
          <p className="mb-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Only workspace admins can create environments.
          </p>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : environments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <ServerIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No environments yet</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Create an environment to connect Redis and monitor queues.
                </p>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setSheetOpen(true)}>
                  <PlusIcon />
                  Create your first environment
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/80">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="border-b border-border text-left">
                  <th className={thClass}>Environment</th>
                  <th className={thClass}>Created</th>
                </tr>
              </thead>
              <tbody>
                {environments.map((environment) => {
                  const isPreferred = environment.id === preferredEnvironmentId;

                  return (
                    <tr
                      key={environment.id}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <div className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                            <ServerIcon className="size-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium capitalize">
                                {environment.name}
                              </p>
                              {isPreferred && (
                                <Badge
                                  variant="secondary"
                                  className="normal-case tracking-normal"
                                >
                                  Preferred
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-muted-foreground",
                        )}
                      >
                        {formatCreated(environment.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && environments.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            {environments.length}{" "}
            {environments.length === 1 ? "environment" : "environments"}
            {preferredEnvironmentId
              ? " · your preferred environment is remembered on this device"
              : " · switch environments from the sidebar to set your preference"}
          </p>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Add environment</SheetTitle>
            <SheetDescription>
              Create another environment for this workspace.
            </SheetDescription>
          </SheetHeader>

          <CreateEnvironmentForm
            workspaceId={workspaceId}
            onSuccess={async () => {
              setSheetOpen(false);
              await refresh();
            }}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
