import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";

export function JobHoverPreview({
  redisInstanceId,
  queueName,
  jobId,
  children,
}: {
  redisInstanceId: string;
  queueName: string;
  jobId: string;
  children: React.ReactNode;
}) {
  const logsQuery = useQuery({
    queryKey: ["job-logs-preview", redisInstanceId, queueName, jobId],
    queryFn: () => rpcClient.job.getLogs({ redisInstanceId, queueName, jobId }),
    enabled: false,
  });

  const progressQuery = useQuery({
    queryKey: ["job-progress-preview", redisInstanceId, queueName, jobId],
    queryFn: () =>
      rpcClient.job.getProgress({ redisInstanceId, queueName, jobId }),
    enabled: false,
  });

  return (
    <div
      className="group relative"
      onMouseEnter={() => {
        logsQuery.refetch();
        progressQuery.refetch();
      }}
    >
      {children}
      <div className="pointer-events-none absolute left-0 top-full z-50 hidden w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-2 shadow-lg group-hover:block">
        <p className="mb-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
          Progress
        </p>
        <pre className="mb-2 max-h-20 overflow-hidden text-[10px]">
          {JSON.stringify(progressQuery.data ?? {}, null, 2)}
        </pre>
        <p className="mb-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
          Logs (tail)
        </p>
        <div className="max-h-20 overflow-hidden text-[10px] font-mono">
          {(logsQuery.data ?? []).slice(-5).map((log, i) => (
            <div key={i}>
              {log.format === "json" && log.entry
                ? log.entry.message
                : log.raw}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
