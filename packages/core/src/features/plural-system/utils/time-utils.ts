import { format, parseISO, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export function formatDuration(startIso: string, endIso?: string): string {
  const end = endIso ? parseISO(endIso) : new Date();
  const start = parseISO(startIso);
  const totalSeconds = differenceInSeconds(end, start);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}m`;
  const hours = differenceInHours(end, start);
  if (hours < 24) {
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }
  const days = differenceInDays(end, start);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function formatDateTime(iso: string, timezone?: string): string {
  try {
    const date = parseISO(iso);
    if (timezone) {
      return format(date, 'MMM d, yyyy h:mm a');
    }
    return format(date, 'MMM d, yyyy h:mm a');
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), 'h:mm a');
  } catch {
    return iso;
  }
}

export function getStartOfDay(iso: string): string {
  try {
    const d = parseISO(iso);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  } catch {
    return iso;
  }
}

export function getEndOfDay(iso: string): string {
  try {
    const d = parseISO(iso);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  } catch {
    return iso;
  }
}
