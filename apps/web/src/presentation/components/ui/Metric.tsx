export function Metric({ label, value }: { label: string; value: string }) {
  const machineLike = /\b(id|timestamp|frame|coordinate|center|scale|offset|roi)\b/i.test(label);
  return (
    <div className="min-w-0">
      <div className="text-xs font-semibold leading-[18px] text-text-muted">{label}</div>
      <div className={`${machineLike ? 'font-mono' : 'font-sans'} truncate text-[22px] font-bold leading-[32px] tracking-[-0.025em] tabular-nums`} title={value}>
        {value}
      </div>
    </div>
  );
}
