import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  DatabaseIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  UsersIcon,
} from "lucide-react";
import { rpcClient } from "@/lib/api";
import { useShellContext } from "@/hooks/use-shell-context";
import { Button } from "@/components/ui/button";
import { RevealableInput } from "@/components/ui/revealable-input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@unqueue/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  defaultFormValues,
  instanceToFormValues,
  type RedisInstance,
  RedisConnectionSheet,
} from "@/components/redis-connection-sheet";

export const Route = createFileRoute("/$workspaceId/connections")({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["workspaces"],
        queryFn: () => rpcClient.workspace.list(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["environments", params.workspaceId],
        queryFn: () =>
          rpcClient.environment.list({ workspaceId: params.workspaceId }),
      }),
    ]),
  component: ConnectionsPage,
});

type RedisInstanceWithEnv = RedisInstance & {
  environmentId: string;
  environmentName: string;
};

const STATUS_CHIP_CLASS: Record<string, string> = {
  connected:
    "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300",
  error:
    "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/25",
  disconnected:
    "bg-amber-500/15 text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300",
};

function statusLabel(status: string) {
  if (status === "connected") return "Online";
  if (status === "error") return "Error";
  return "Offline";
}

function ConnectionStatusChip({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        STATUS_CHIP_CLASS[status] ??
          "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "error" && "bg-destructive",
          status !== "connected" && status !== "error" && "bg-amber-500",
        )}
        aria-hidden
      />
      {statusLabel(status)}
    </span>
  );
}

function formatLastConnected(at: Date | string | null | undefined) {
  if (!at) return null;

  const date = new Date(at);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function RedisInstanceCard({
  instance,
  canManage,
  onEdit,
  onClients,
}: {
  instance: RedisInstanceWithEnv;
  canManage: boolean;
  onEdit: () => void;
  onClients: () => void;
}) {
  const endpoint =
    instance.host != null
      ? `${instance.host}:${instance.port}${instance.tls ? " · TLS" : ""}`
      : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="truncate text-sm">
            {instance.nickname}
          </CardTitle>
          <ConnectionStatusChip status={instance.status} />
          <div className="ml-auto flex shrink-0 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={onClients}
            >
              <UsersIcon />
              Clients
            </Button>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={onEdit}
              >
                <PencilIcon />
                Edit
              </Button>
            )}
          </div>
        </div>
        <p className="font-mono text-xs text-muted-foreground">Redis</p>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 text-xs text-muted-foreground">
        {endpoint ? (
          <RevealableInput
            value={endpoint}
            readOnly
            className="font-mono text-xs"
          />
        ) : (
          <p className="px-0.5 text-muted-foreground">
            Host hidden for your role
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Prefix{" "}
            <span className="font-mono text-foreground">
              {instance.bullmqPrefix}
            </span>
          </span>
          {formatLastConnected(instance.lastConnectedAt) && (
            <span>
              Last seen{" "}
              <span className="text-foreground">
                {formatLastConnected(instance.lastConnectedAt)}
              </span>
            </span>
          )}
        </div>

        {instance.lastError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-destructive">
            {instance.lastError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ClientsDialog({
  instance,
  open,
  onOpenChange,
}: {
  instance: RedisInstanceWithEnv | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const clientsQuery = useQuery({
    queryKey: ["redis-clients", instance?.id],
    queryFn: () =>
      rpcClient.redis.getClients({ redisInstanceId: instance!.id }),
    enabled: open && !!instance,
    refetchInterval: open ? 5000 : false,
  });

  const clients = clientsQuery.data ?? [];

  const uniqueIps = Array.from(
    clients.reduce((map, client) => {
      const ip = client.addr.split(":")[0] ?? client.addr;
      map.set(ip, (map.get(ip) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-[90vw] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:max-w-7xl overscroll-none">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Connected clients</DialogTitle>
          <DialogDescription>
            {instance?.nickname} · {clients.length} client
            {clients.length !== 1 ? "s" : ""} · refreshes every 5s
          </DialogDescription>
        </DialogHeader>

        {clientsQuery.isLoading ? (
          <div className="grid grid-cols-[1fr_auto] divide-x">
            <div className="space-y-px p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
            <div className="w-56 space-y-px p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded" />
              ))}
            </div>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <UsersIcon className="size-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No clients connected
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto] divide-x overflow-hidden">
            <div className="overflow-y-auto overscroll-none">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-24" />
                  <col className="w-56" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col className="w-16" />
                  <col className="w-16" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 border-b bg-muted/60 backdrop-blur">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Address
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Command
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      ID
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Age
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Idle
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      DB
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/30">
                      <td className="truncate px-4 py-2 font-mono">
                        {client.addr}
                      </td>
                      <td className="truncate px-4 py-2 font-mono text-muted-foreground">
                        {client.name || "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[10px]",
                            client.cmd === "subscribe" ||
                              client.cmd === "psubscribe"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {client.cmd || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                        {client.id}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {client.age}s
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {client.idle}s
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {client.db}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-56 overflow-y-auto overscroll-none">
              <table className="w-full text-xs">
                <thead>
                  <tr className="sticky top-0 border-b bg-muted/60 backdrop-blur">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      IP
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Conns
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {uniqueIps.map(([ip, count]) => (
                    <tr key={ip} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono">{ip}</td>
                      <td className="px-4 py-2 text-right font-mono text-muted-foreground">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConnectionsPage() {
  const { workspaceId } = Route.useParams();
  const { environmentId, isResolvingContext } = useShellContext();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingInstance, setEditingInstance] =
    useState<RedisInstanceWithEnv | null>(null);
  const [clientsSheetOpen, setClientsSheetOpen] = useState(false);
  const [clientsInstance, setClientsInstance] =
    useState<RedisInstanceWithEnv | null>(null);

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
  });

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const activeEnvironment = envsQuery.data?.find((e) => e.id === environmentId);
  const workspace = workspacesQuery.data?.find((w) => w.id === workspaceId);
  const canManage = workspace?.role === "owner" || workspace?.role === "admin";

  const redisQuery = useQuery({
    queryKey: ["redis", environmentId],
    queryFn: () => rpcClient.redis.list({ environmentId: environmentId! }),
    enabled: !!environmentId,
    refetchInterval: 15_000,
  });

  const instances: RedisInstanceWithEnv[] = (redisQuery.data ?? [])
    .map((instance) => ({
      ...instance,
      environmentId: environmentId!,
      environmentName: activeEnvironment?.name ?? "",
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  const connectedCount = instances.filter(
    (i) => i.status === "connected",
  ).length;
  const isRedisLoading = envsQuery.isLoading || redisQuery.isLoading;
  const isRedisFetching = redisQuery.isFetching;

  const openCreateSheet = () => {
    setSheetMode("create");
    setEditingInstance(null);
    setSheetOpen(true);
  };

  const openEditSheet = (instance: RedisInstanceWithEnv) => {
    setSheetMode("edit");
    setEditingInstance(instance);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingInstance(null);
  };

  const openClientsSheet = (instance: RedisInstanceWithEnv) => {
    setClientsInstance(instance);
    setClientsSheetOpen(true);
  };

  const handleFormSuccess = async () => {
    closeSheet();
    await queryClient.invalidateQueries({ queryKey: ["redis"] });
  };

  const refreshInstances = () => {
    void queryClient.invalidateQueries({ queryKey: ["redis"] });
  };

  const handleDeleteInstance = async () => {
    if (!editingInstance) return;

    await rpcClient.redis.delete({ id: editingInstance.id });
    closeSheet();
    await queryClient.invalidateQueries({ queryKey: ["redis"] });
  };

  if (isResolvingContext || envsQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!environmentId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No environment found. Create an environment to add queue connections.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-medium">Connections</h1>
          <p className="text-xs text-muted-foreground">
            Redis queue backends for{" "}
            <span className="font-medium text-foreground">
              {activeEnvironment?.name ?? "this environment"}
            </span>
            . Switch environments in the sidebar to manage other connections.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInstances}
            disabled={isRedisFetching}
          >
            <RefreshCwIcon
              className={isRedisFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreateSheet}>
              <PlusIcon />
              Add connection
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {!isRedisLoading && instances.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {connectedCount} of {instances.length}{" "}
              {instances.length === 1 ? "instance" : "instances"} online
            </p>
          )}

          {!canManage && (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Only workspace admins can add or edit connections.
            </p>
          )}

          {isRedisLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <DatabaseIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No connections</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Connect the Redis instance your BullMQ workers use. Unqueue
                    will discover queues and stream job metrics in real time.
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" onClick={openCreateSheet}>
                    <PlusIcon />
                    Add your first connection
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {instances.map((instance) => (
                <li key={instance.id} className="min-h-0">
                  <RedisInstanceCard
                    instance={instance}
                    canManage={canManage}
                    onEdit={() => openEditSheet(instance)}
                    onClients={() => openClientsSheet(instance)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <RedisConnectionSheet
        open={sheetOpen}
        onOpenChange={(open) => !open && closeSheet()}
        mode={sheetMode}
        environmentId={environmentId}
        canManage={canManage}
        editingId={editingInstance?.id}
        instanceNickname={editingInstance?.nickname}
        initialValues={
          sheetMode === "edit" && editingInstance
            ? instanceToFormValues(editingInstance)
            : defaultFormValues
        }
        onSuccess={() => void handleFormSuccess()}
        onDelete={
          sheetMode === "edit" && editingInstance
            ? handleDeleteInstance
            : undefined
        }
      />

      <ClientsDialog
        instance={clientsInstance}
        open={clientsSheetOpen}
        onOpenChange={setClientsSheetOpen}
      />
    </div>
  );
}
