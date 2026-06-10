import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { rpcClient } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@unstall/ui/components/button";
import { Input } from "@unstall/ui/components/input";
import { Label } from "@unstall/ui/components/label";

export const Route = createFileRoute("/$workspaceId/settings/alerts")({
  component: AlertsSettings,
});

function AlertsSettings() {
  const { workspaceId } = Route.useParams();

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });
  const environmentId = envsQuery.data?.[0]?.id ?? "";

  const alertsQuery = useQuery({
    queryKey: ["alerts", environmentId],
    queryFn: () => rpcClient.alert.list({ environmentId }),
    enabled: !!environmentId,
  });

  const redisQuery = useQuery({
    queryKey: ["redis", environmentId],
    queryFn: () => rpcClient.redis.list({ environmentId }),
    enabled: !!environmentId,
  });

  const form = useForm({
    defaultValues: {
      name: "",
      queueName: "",
      webhookUrl: "",
      redisInstanceId: "",
      threshold: 0.1,
    },
    onSubmit: async ({ value }) => {
      await rpcClient.alert.create({
        environmentId,
        redisInstanceId: value.redisInstanceId || redisQuery.data?.[0]?.id || "",
        name: value.name,
        queueName: value.queueName,
        webhookUrl: value.webhookUrl,
        condition: {
          type: "failure_rate",
          threshold: value.threshold,
          windowMinutes: 5,
        },
      });
      alertsQuery.refetch();
    },
  });

  if (!environmentId) return null;

  return (
    <AppShell workspaceId={workspaceId} environmentId={environmentId}>
      <div className="p-4">
        <h1 className="mb-4 text-sm font-medium">Alerts</h1>
        <ul className="mb-6 space-y-2 text-xs">
          {(alertsQuery.data ?? []).map((alert) => (
            <li
              key={alert.id}
              className="rounded-md border border-[var(--color-border)] p-3"
            >
              <span className="font-medium">{alert.name}</span>
              <span className="ml-2 text-[var(--color-muted-foreground)]">
                {alert.queueName}
              </span>
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
          <form.Field name="name">
            {(field) => (
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="queueName">
            {(field) => (
              <div className="space-y-1">
                <Label>Queue Name</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="webhookUrl">
            {(field) => (
              <div className="space-y-1">
                <Label>Discord Webhook URL</Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="threshold">
            {(field) => (
              <div className="space-y-1">
                <Label>Failure Rate Threshold (0-1)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
          <Button type="submit">Create Alert</Button>
        </form>
      </div>
    </AppShell>
  );
}
