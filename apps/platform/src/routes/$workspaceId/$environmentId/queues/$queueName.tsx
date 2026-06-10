import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { z } from "zod";
import { rpcClient } from "@/lib/api";
import { onResync, onSocketEvent, subscribeRooms, unsubscribeRooms } from "@/lib/socket";
import { Badge } from "@unstall/ui/components/badge";
import { Button } from "@unstall/ui/components/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@unstall/ui/components/tabs";
import { ScrollArea } from "@unstall/ui/components/scroll-area";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { JobHoverPreview } from "@/components/job-hover-preview";

const searchSchema = z.object({
  redisInstanceId: z.string(),
  state: z
    .enum(["waiting", "active", "delayed", "completed", "failed", "paused"])
    .default("waiting"),
  jobId: z.string().optional(),
});

export const Route = createFileRoute(
  "/$workspaceId/$environmentId/queues/$queueName",
)({
  validateSearch: searchSchema,
  component: QueuePage,
});

const JOB_STATES = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
  "paused",
] as const;

function QueuePage() {
  const { workspaceId, environmentId, queueName } = Route.useParams();
  const { redisInstanceId, state, jobId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const parentRef = useRef<HTMLDivElement>(null);

  const jobsQuery = useQuery({
    queryKey: ["jobs", redisInstanceId, queueName, state],
    queryFn: () =>
      rpcClient.job.list({
        redisInstanceId,
        queueName,
        state,
        start: 0,
        end: 999,
      }),
  });

  useEffect(() => {
    const room = `queue:${redisInstanceId}:${queueName}`;
    subscribeRooms([room]);

    const offEvent = onSocketEvent((data) => {
      if (data.room !== room) return;
      if (data.type === "job:update") {
        queryClient.invalidateQueries({
          queryKey: ["jobs", redisInstanceId, queueName],
        });
      }
      if (data.type === "queue:counts") {
        queryClient.invalidateQueries({ queryKey: ["queues"] });
      }
    });

    const offResync = onResync((data) => {
      if (data.room === room) {
        queryClient.invalidateQueries({
          queryKey: ["jobs", redisInstanceId, queueName],
        });
      }
    });

    return () => {
      offEvent();
      offResync();
      unsubscribeRooms([room]);
    };
  }, [redisInstanceId, queueName, queryClient]);

  const jobs = jobsQuery.data ?? [];
  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 20,
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkRetry = async () => {
    await rpcClient.jobActions.bulkRetry({
      redisInstanceId,
      queueName,
      jobIds: [...selected],
    });
    setSelected(new Set());
    jobsQuery.refetch();
  };

  const bulkRemove = async () => {
    await rpcClient.jobActions.bulkRemove({
      redisInstanceId,
      queueName,
      jobIds: [...selected],
    });
    setSelected(new Set());
    jobsQuery.refetch();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-2">
        <h1 className="text-sm font-medium">{queueName}</h1>
        {selected.size > 0 && (
          <>
            <Button size="sm" variant="outline" onClick={() => void bulkRetry()}>
              Retry ({selected.size})
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void bulkRemove()}>
              Remove ({selected.size})
            </Button>
          </>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => rpcClient.queueAdmin.pause({ redisInstanceId, queueName })}
          >
            Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rpcClient.queueAdmin.resume({ redisInstanceId, queueName })}
          >
            Resume
          </Button>
        </div>
      </div>

      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={60} minSize={40}>
          <Tabs
            value={state}
            onValueChange={(v) =>
              navigate({
                to: "/$workspaceId/$environmentId/queues/$queueName",
                params: { workspaceId, environmentId, queueName },
                search: { redisInstanceId, state: v as typeof state },
              })
            }
            className="flex h-full flex-col"
          >
            <TabsList className="mx-4 mt-2">
              {JOB_STATES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
            {JOB_STATES.map((s) => (
              <TabsContent key={s} value={s} className="flex-1 overflow-hidden">
                <div ref={parentRef} className="h-full overflow-auto">
                  <div
                    style={{ height: virtualizer.getTotalSize(), position: "relative" }}
                  >
                    {virtualizer.getVirtualItems().map((row) => {
                      const job = jobs[row.index]!;
                      return (
                        <JobHoverPreview
                          key={job.id}
                          redisInstanceId={redisInstanceId}
                          queueName={queueName}
                          jobId={job.id}
                        >
                          <div
                            className={`absolute left-0 top-0 flex w-full cursor-pointer items-center gap-2 border-b border-[var(--color-border)] px-4 text-xs hover:bg-[var(--color-accent)]/50 ${
                              jobId === job.id ? "bg-[var(--color-accent)]" : ""
                            }`}
                            style={{
                              height: row.size,
                              transform: `translateY(${row.start}px)`,
                            }}
                            onClick={() =>
                              navigate({
                                to: "/$workspaceId/$environmentId/queues/$queueName",
                                params: { workspaceId, environmentId, queueName },
                                search: { redisInstanceId, state, jobId: job.id },
                              })
                            }
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(job.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelect(job.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="w-16 shrink-0 text-[var(--color-muted-foreground)]">
                              {job.id}
                            </span>
                            <span className="flex-1 truncate">{job.name}</span>
                            <Badge variant="outline">{job.state}</Badge>
                          </div>
                        </JobHoverPreview>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Panel>
        <PanelResizeHandle className="w-px bg-[var(--color-border)]" />
        <Panel defaultSize={40} minSize={25}>
          {jobId ? (
            <JobDetailPanel
              redisInstanceId={redisInstanceId}
              queueName={queueName}
              jobId={jobId}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--color-muted-foreground)]">
              Select a job
            </div>
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
}
