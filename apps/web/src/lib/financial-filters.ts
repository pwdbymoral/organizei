export type TimelineFilterStatus = 'all' | 'pending' | 'realized' | 'canceled' | 'overdue';
export type TimelineFilterDirection = 'all' | 'income' | 'expense';

export type TimelineFilterParams = {
  query: string;
  status: TimelineFilterStatus;
  direction: TimelineFilterDirection;
  from: string;
  to: string;
  minAmountCents: number | null;
  maxAmountCents: number | null;
};

export type TimelinePeriod = {
  mode: 'month' | 'custom' | 'all';
  month: string;
  from: string;
  to: string;
  label: string;
};

export type FilterableMovement = {
  description: string;
  direction: 'income' | 'expense';
  expectedAmountCents: number;
  plannedDate: string;
  realizedDate?: string | null;
  status: 'pending' | 'realized' | 'canceled';
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function parseMoneyFilter(value: string | undefined) {
  const raw = String(value ?? '')
    .trim()
    .replace(/^R\$\s*/i, '');
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(raw)
      ? raw.replace(/\./g, '')
      : raw;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function parseTimelineFilters(
  params: Record<string, string | string[] | undefined>,
): TimelineFilterParams {
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? (item[0] ?? '') : (item ?? '');
  };
  const status = value('status');
  const direction = value('direction');
  return {
    query: value('q').trim(),
    status: ['pending', 'realized', 'canceled', 'overdue'].includes(status)
      ? (status as TimelineFilterStatus)
      : 'all',
    direction: ['income', 'expense'].includes(direction)
      ? (direction as TimelineFilterDirection)
      : 'all',
    from: value('from'),
    to: value('to'),
    minAmountCents: parseMoneyFilter(value('min')),
    maxAmountCents: parseMoneyFilter(value('max')),
  };
}

function isMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && Number(value.slice(5)) >= 1 && Number(value.slice(5)) <= 12;
}

function monthBounds(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year!, monthNumber!, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
}

export function resolveTimelinePeriod(
  params: Record<string, string | string[] | undefined>,
  today: string,
): TimelinePeriod {
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? (item[0] ?? '') : (item ?? '');
  };
  if (value('view') === 'all') {
    return { mode: 'all', month: '', from: '', to: '', label: 'Todas as transações' };
  }
  const from = value('from');
  const to = value('to');
  if (from && to) {
    return { mode: 'custom', month: '', from, to, label: `${from} a ${to}` };
  }
  const month = isMonth(value('month')) ? value('month') : today.slice(0, 7);
  const bounds = monthBounds(month);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-15T12:00:00Z`));
  return { mode: 'month', month, ...bounds, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

export function matchesTimelineFilters(
  movement: FilterableMovement,
  filters: TimelineFilterParams,
  today: string,
) {
  const query = normalizeText(filters.query);
  const description = normalizeText(movement.description);
  const queryAmount = parseMoneyFilter(filters.query);
  const status =
    movement.status === 'pending' && movement.plannedDate < today ? 'overdue' : movement.status;
  return (
    (!query ||
      description.includes(query) ||
      (queryAmount !== null && movement.expectedAmountCents === queryAmount) ||
      formatFilterAmount(movement.expectedAmountCents).includes(query)) &&
    (filters.status === 'all' || filters.status === status) &&
    (filters.direction === 'all' || filters.direction === movement.direction) &&
    (!filters.from || (movement.realizedDate ?? movement.plannedDate) >= filters.from) &&
    (!filters.to || (movement.realizedDate ?? movement.plannedDate) <= filters.to) &&
    (filters.minAmountCents === null || movement.expectedAmountCents >= filters.minAmountCents) &&
    (filters.maxAmountCents === null || movement.expectedAmountCents <= filters.maxAmountCents)
  );
}

function formatFilterAmount(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}
