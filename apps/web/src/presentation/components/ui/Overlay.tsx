import type { Camera as CameraType } from '@spray-paragon/domain';

export function Overlay({ camera }: { camera: CameraType }) {
  const color = camera === 'side' ? '#075AA8' : '#0D747A';
  return (
    <svg viewBox="0 0 600 340" className="h-full w-full">
      <rect width="600" height="340" fill="#EDF3F9" />
      <g stroke="#D5DEE8">
        {Array.from({ length: 10 }, (_, i) => <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="340" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={i} y1={i * 60} x1="0" y2={i * 60} x2="600" />)}
      </g>
      {camera === 'side' ? (
        <g stroke={color} strokeWidth="4" fill="none">
          <circle cx="90" cy="170" r="5" fill={color} />
          <path d="M90 170 C230 92 420 92 540 128" />
          <path d="M90 170 C260 248 430 236 545 208" />
          <line x1="90" y1="170" x2="540" y2="168" />
          <line x1="405" y1="100" x2="405" y2="232" />
        </g>
      ) : (
        <g stroke={color} strokeWidth="4" fill="none">
          <ellipse cx="306" cy="170" rx="112" ry="82" />
          <circle cx="306" cy="170" r="76" />
          <line x1="306" y1="65" x2="306" y2="275" />
          <line x1="175" y1="170" x2="435" y2="170" />
          <circle cx="318" cy="162" r="7" fill={color} />
        </g>
      )}
    </svg>
  );
}
