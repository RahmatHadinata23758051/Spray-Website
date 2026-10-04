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

  if (collapsed) {
    return (
      <div className="relative flex items-center justify-center border-b border-border-subtle py-3 px-2 text-center">
        <div className="font-mono text-xs font-bold text-text-primary tabular-nums">
          {time.getHours().toString().padStart(2, '0')}<span className="animate-pulse opacity-50">:</span>{time.getMinutes().toString().padStart(2, '0')}
        </div>
      </div>
    );
  }

  const timeString = `${time.getHours().toString().padStart(2, '0')}.${time.getMinutes().toString().padStart(2, '0')}.${time.getSeconds().toString().padStart(2, '0')}`;
  
  const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  
  const dayName = days[time.getDay()];
  const dateNum = time.getDate();
  const monthName = months[time.getMonth()];
  const year = time.getFullYear();
  
  const dateString = `${dayName}, ${dateNum} ${monthName} ${year}`;

  return (
    <div className="relative flex flex-col items-center justify-center border-b border-border-subtle py-4 px-4 text-center">
      <div className="font-sans text-[26px] font-bold tracking-tight text-text-primary tabular-nums leading-none">
        {timeString}
      </div>
      <div className="mt-1.5 font-sans text-[11px] font-bold tracking-widest text-text-muted uppercase">
        {dateString}
      </div>
    </div>
  );
}
