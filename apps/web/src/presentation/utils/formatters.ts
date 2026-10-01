export const fmt = {
  mm: (v: number) => `${v.toFixed(1)} mm`,
  cm: (v: number) => `${(v / 10).toFixed(1)} cm`,
  deg: (v: number) => `${v.toFixed(1)}°`,
  area: (v: number) => `${v.toFixed(0)} mm²`,
  pct: (v: number) => `${(v * 100).toFixed(0)}%`,
  date: (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
};
