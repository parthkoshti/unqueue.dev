import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { rpcClient } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { Button } from "@unstall/ui/components/button";
import { Input } from "@unstall/ui/components/input";
import { Label } from "@unstall/ui/components/label";

export const Route = createFileRoute("/$workspaceId/settings/members")({
  component: MembersSettings,
});

function MembersSettings() {
  const { workspaceId } = Route.useParams();

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });
  const environmentId = envsQuery.data?.[0]?.id ?? "";

  const membersQuery = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => rpcClient.members.list({ workspaceId }),
  });

  const form = useForm({
    defaultValues: { email: "", role: "member" as const },
    onSubmit: async ({ value }) => {
      await rpcClient.members.invite({
        workspaceId,
        email: value.email,
        role: value.role,
      });
      membersQuery.refetch();
    },
  });

  if (!environmentId) return null;

  return (
    <AppShell workspaceId={workspaceId} environmentId={environmentId}>
      <div className="p-4">
        <h1 className="mb-4 text-sm font-medium">Members</h1>
        <table className="mb-6 w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {(membersQuery.data ?? []).map((member) => (
              <tr key={member.id} className="border-b border-[var(--color-border)]">
                <td className="py-2">{member.name}</td>
                <td className="py-2">{member.email}</td>
                <td className="py-2">{member.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="flex-1 space-y-1">
                <Label>Invite email</Label>
                <Input
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
          <Button type="submit" className="self-end">
            Invite
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
