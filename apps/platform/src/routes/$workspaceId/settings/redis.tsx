import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { rpcClient } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@unstall/ui/components/button";
import { Input } from "@unstall/ui/components/input";
import { Label } from "@unstall/ui/components/label";
import { Badge } from "@unstall/ui/components/badge";

export const Route = createFileRoute("/$workspaceId/settings/redis")({
  component: RedisSettings,
});

function RedisSettings() {
  const { workspaceId } = Route.useParams();

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });
  const environmentId = envsQuery.data?.[0]?.id ?? "";

  const redisQuery = useQuery({
    queryKey: ["redis", environmentId],
    queryFn: () => rpcClient.redis.list({ environmentId }),
    enabled: !!environmentId,
  });

  const form = useForm({
    defaultValues: {
      nickname: "",
      host: "localhost",
      port: 6379,
      password: "",
      tls: false,
      bullmqPrefix: "bull",
    },
    onSubmit: async ({ value }) => {
      await rpcClient.redis.create({
        environmentId,
        ...value,
      });
      redisQuery.refetch();
    },
  });

  if (!environmentId) return null;

  return (
    <AppShell workspaceId={workspaceId} environmentId={environmentId}>
      <div className="p-4">
        <h1 className="mb-4 text-sm font-medium">Redis Instances</h1>
        <ul className="mb-6 space-y-2 text-xs">
          {(redisQuery.data ?? []).map((instance) => (
            <li
              key={instance.id}
              className="flex items-center gap-2 rounded-md border border-[var(--color-border)] p-3"
            >
              <span className="font-medium">{instance.nickname}</span>
              {instance.host && (
                <span className="text-[var(--color-muted-foreground)]">
                  {instance.host}:{instance.port}
                </span>
              )}
              <Badge
                variant={
                  instance.status === "connected" ? "success" : "destructive"
                }
              >
                {instance.status}
              </Badge>
            </li>
          ))}
        </ul>
        <form
          className="grid max-w-md gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="nickname">
            {(field) => (
              <div className="space-y-1">
                <Label>Nickname</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="host">
            {(field) => (
              <div className="space-y-1">
                <Label>Host</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="port">
            {(field) => (
              <div className="space-y-1">
                <Label>Port</Label>
                <Input
                  type="number"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-1">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="bullmqPrefix">
            {(field) => (
              <div className="space-y-1">
                <Label>BullMQ Prefix</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <Button type="submit">Add Redis Instance</Button>
        </form>
      </div>
    </AppShell>
  );
}
