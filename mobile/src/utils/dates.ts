// Date helpers for grouping receipts in the list.

export function toIsoNow(): string {
  return new Date().toISOString();
}

export function getDateGroupLabel(isoDate: string): 'today' | 'yesterday' | 'other' {
  const value = new Date(isoDate);
  const now = new Date();

  const valueDay = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowDay.getTime() - valueDay.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    return 'today';
  }

  if (diffDays === 1) {
    return 'yesterday';
  }

  return 'other';
}

export function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoDate));
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(new Date(isoDate));
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(isoDate));
}
