export type DateFilterPeriod = '24h' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface DateFilterOption {
  key: DateFilterPeriod;
  label: string;
}

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { key: '24h', label: 'Últimas 24 horas' },
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'custom', label: 'Fecha personalizada' },
];

export function getItemDate(item: any): Date | null {
  const dateVal = item?.creado_en ?? item?.createdAt ?? item?.created_at ?? item?.fecha;
  if (dateVal === undefined || dateVal === null) return null;
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? null : parsed;
}


export function filterItemsByDatePeriod<T>(
  items: T[],
  period: DateFilterPeriod,
  customStartStr?: string,
  customEndStr?: string
): T[] {
  const now = new Date();

  return items.filter((item) => {
    const itemDate = getItemDate(item);
    if (!itemDate) return false;

    switch (period) {
      case '24h': {
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return itemDate >= last24h && itemDate <= now;
      }
      case 'today': {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        return itemDate >= startOfToday && itemDate <= endOfToday;
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        return itemDate >= startOfYesterday && itemDate <= endOfYesterday;
      }
      case 'week': {
        const dayOfWeek = now.getDay();
        // Adjust for Monday as start of week (0 = Sun, 1 = Mon, ..., 6 = Sat)
        const diffToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
        return itemDate >= monday && itemDate <= now;
      }
      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return itemDate >= startOfMonth && itemDate <= now;
      }
      case 'custom': {
        if (!customStartStr && !customEndStr) return true;
        
        let start = customStartStr ? new Date(customStartStr) : new Date(0);
        if (isNaN(start.getTime())) start = new Date(0);
        else start.setHours(0, 0, 0, 0);

        let end = customEndStr ? new Date(customEndStr) : new Date();
        if (isNaN(end.getTime())) end = new Date();
        else end.setHours(23, 59, 59, 999);

        return itemDate >= start && itemDate <= end;
      }
      default:
        return true;
    }
  });
}
