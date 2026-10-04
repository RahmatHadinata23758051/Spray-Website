export const fmt = {
  mm: (v: number) => `${v.toFixed(1)} mm`,
  cm: (v: number) => `${(v / 10).toFixed(1)} cm`,
  deg: (v: number) => `${v.toFixed(1)}°`,
  area: (v: number) => `${v.toFixed(0)} mm²`,
  pct: (v: number) => `${(v * 100).toFixed(0)}%`,
  date: (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
};

export const statusLabels: Record<string, string> = {
  DRAFT: 'Draf',
  READY: 'Siap',
  CAPTURING: 'Pengambilan Data',
  PROCESSING: 'Diproses',
  REVIEW_REQUIRED: 'Perlu Ditinjau',
  FINALIZED: 'Final',
  FAILED: 'Gagal',
  ABORTED: 'Dibatalkan',
};

export const formatStatus = (status: string): string => {
  return statusLabels[status] || status;
};
