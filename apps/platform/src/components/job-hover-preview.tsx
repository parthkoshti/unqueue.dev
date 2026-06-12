import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";
import { CodeBlock } from "@/components/code-block";
import type { ParsedLog } from "@unqueue/bullmq";

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
  const jobQuery = useQuery({
    queryKey: ["job", redisInstanceId, queueName, jobId],
    queryFn: () => rpcClient.job.get({ redisInstanceId, queueName, jobId }),
    enabled: false,
  });

  return (
    <div
      className="group relative"
      onMouseEnter={() => {
        if (!jobQuery.isFetching) void jobQuery.refetch();
      }}
    >
      {children}
      <div className="pointer-events-none absolute left-0 top-full z-50 hidden w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-2 shadow-lg group-hover:block">
        <p className="mb-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
          Progress
        </p>
        <CodeBlock
          value={jobQuery.data?.progress ?? {}}
          maxHeight="5rem"
          className="mb-2"
        />
        <p className="mb-1 text-[10px] font-medium text-[var(--color-muted-foreground)]">
          Logs (tail)
        </p>
        <div className="max-h-20 overflow-hidden text-[10px] font-mono">
          {(jobQuery.data?.logs ?? []).slice(-5).map((log: ParsedLog, i: number) => (
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
