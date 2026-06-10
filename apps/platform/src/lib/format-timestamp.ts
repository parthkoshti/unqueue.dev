const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const RELATIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatAbsoluteTimestamp(ms: number) {
  const date = new Date(ms);
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

function formatTimeOfDay(ms: number) {
  const date = new Date(ms);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${minutes}:${seconds} ${ampm}`;
}

export function formatJobTimestamp(ms?: number, now = Date.now()) {
  if (!ms) return { label: "—", title: undefined };

  const date = new Date(ms);
  const elapsed = now - ms;

  if (elapsed > RELATIVE_WINDOW_MS) {
    const label = formatAbsoluteTimestamp(ms);
    return { label, title: label };
  }

  const daysAgo = Math.round(
    (startOfDay(new Date(now)).getTime() - startOfDay(date).getTime()) /
      86_400_000,
  );

  if (daysAgo <= 0) {
    if (elapsed < 60_000) return { label: "just now", title: formatAbsoluteTimestamp(ms) };
    if (elapsed < 3_600_000) {
      const minutes = Math.floor(elapsed / 60_000);
      return { label: `${minutes}m ago`, title: formatAbsoluteTimestamp(ms) };
    }
    const hours = Math.floor(elapsed / 3_600_000);
    return { label: `${hours}h ago`, title: formatAbsoluteTimestamp(ms) };
  }

  if (daysAgo === 1) {
    return {
      label: `yesterday ${formatTimeOfDay(ms)}`,
      title: formatAbsoluteTimestamp(ms),
    };
  }

  if (daysAgo < 7) {
    return { label: `${daysAgo} days ago`, title: formatAbsoluteTimestamp(ms) };
  }

  const label = formatAbsoluteTimestamp(ms);
  return { label, title: label };
}

function formatMsFraction(ms: number) {
  return `${parseFloat((ms / 1000).toFixed(3))}s`;
}

export function formatDuration(processedOn?: number, finishedOn?: number) {
  if (!processedOn || !finishedOn) return "—";
  const ms = finishedOn - processedOn;
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return formatMsFraction(ms);

  const minutes = Math.floor(ms / 60_000);
  const remainderMs = ms % 60_000;

  if (ms < 3_600_000) {
    return `${minutes}m ${formatMsFraction(remainderMs)}`;
  }

  const hours = Math.floor(ms / 3_600_000);
  const afterHoursMs = ms % 3_600_000;
  const mins = Math.floor(afterHoursMs / 60_000);
  const secsMs = afterHoursMs % 60_000;
  return `${hours}h ${mins}m ${formatMsFraction(secsMs)}`;
}

export function formatDelay(ms?: number) {
  if (ms == null || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
