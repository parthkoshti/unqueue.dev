import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";
import { Badge } from "@unstall/ui/components/badge";
import { Button } from "@unstall/ui/components/button";
import { ScrollArea } from "@unstall/ui/components/scroll-area";
import { Separator } from "@unstall/ui/components/separator";

export function JobDetailPanel({
  redisInstanceId,
  queueName,
  jobId,
}: {
  redisInstanceId: string;
  queueName: string;
  jobId: string;
}) {
  const jobQuery = useQuery({
    queryKey: ["job", redisInstanceId, queueName, jobId],
    queryFn: () => rpcClient.job.get({ redisInstanceId, queueName, jobId }),
  });

  const payloadQuery = useQuery({
    queryKey: ["job-payload", redisInstanceId, queueName, jobId],
    queryFn: () =>
      rpcClient.job.getPayload({ redisInstanceId, queueName, jobId }),
    enabled: !!jobQuery.data,
  });

  const progressQuery = useQuery({
    queryKey: ["job-progress", redisInstanceId, queueName, jobId],
    queryFn: () =>
      rpcClient.job.getProgress({ redisInstanceId, queueName, jobId }),
    refetchInterval: 2000,
  });

  const logsQuery = useQuery({
    queryKey: ["job-logs", redisInstanceId, queueName, jobId],
    queryFn: () => rpcClient.job.getLogs({ redisInstanceId, queueName, jobId }),
    refetchInterval: 2000,
  });

  const job = jobQuery.data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <span className="text-sm font-medium">Job {jobId}</span>
        {job && <Badge variant="outline">{job.state}</Badge>}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              rpcClient.jobActions.retry({ redisInstanceId, queueName, jobId })
            }
          >
            Retry
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              rpcClient.jobActions.promote({ redisInstanceId, queueName, jobId })
            }
          >
            Promote
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              rpcClient.jobActions.remove({ redisInstanceId, queueName, jobId })
            }
          >
            Remove
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 text-xs">
          <section>
            <h3 className="mb-2 font-medium text-[var(--color-muted-foreground)]">
              Progress
            </h3>
            {progressQuery.data &&
            typeof progressQuery.data === "object" &&
            progressQuery.data !== null ? (
              <div className="space-y-1">
                {"currentStep" in progressQuery.data && (
                  <p>Step: {String((progressQuery.data as { currentStep?: string }).currentStep)}</p>
                )}
                {"percent" in progressQuery.data && (
                  <p>Progress: {(progressQuery.data as { percent?: number }).percent}%</p>
                )}
                {"steps" in progressQuery.data &&
                  Array.isArray((progressQuery.data as { steps?: unknown[] }).steps) &&
                  (progressQuery.data as { steps: Array<{ name: string; status: string }> }).steps.map(
                    (step) => (
                      <div key={step.name} className="flex gap-2">
                        <Badge variant="outline">{step.status}</Badge>
                        <span>{step.name}</span>
                      </div>
                    ),
                  )}
              </div>
            ) : (
              <p className="text-[var(--color-muted-foreground)]">No progress</p>
            )}
          </section>
          <Separator />
          <section>
            <h3 className="mb-2 font-medium text-[var(--color-muted-foreground)]">
              Payload
            </h3>
            <pre className="overflow-auto rounded-md bg-[var(--color-muted)] p-2 text-[11px]">
              {JSON.stringify(payloadQuery.data, null, 2)}
            </pre>
          </section>
          <Separator />
          <section>
            <h3 className="mb-2 font-medium text-[var(--color-muted-foreground)]">
              Logs
            </h3>
            <div className="space-y-1">
              {(logsQuery.data ?? []).slice(-20).map((log, i) => (
                <div key={i} className="font-mono text-[11px]">
                  {log.format === "json" && log.entry ? (
                    <span>
                      [{log.entry.level}] {log.entry.message}
                    </span>
                  ) : (
                    <span className="text-[var(--color-warning)]">{log.raw}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
