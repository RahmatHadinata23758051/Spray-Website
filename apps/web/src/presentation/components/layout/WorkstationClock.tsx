import React, { useState, useEffect } from 'react';

export function WorkstationClock({ 
  collapsed, 
}: { 
  collapsed: boolean; 
}) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;

  const days = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

  const dayName = days[time.getDay()];
  const dateNum = time.getDate();
  const monthName = months[time.getMonth()];

  if (collapsed) {
    return (
      <div 
        className="flex items-center justify-center py-2 px-1 text-center border-t border-border-subtle" 
        title={`${dayName}, ${dateNum} ${monthName} · ${timeString}`}
      >
        <span className="font-mono text-[10px] font-semibold text-text-muted tabular-nums">
          {hours}:{minutes}
        </span>
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle bg-surface-subtle/50 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono select-none">
      <span className="tabular-nums font-semibold text-text-secondary">{timeString}</span>
      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
        {dayName}, {dateNum} {monthName}
      </span>
    </div>
  );
}
