'use client';

interface AnimatedCircularProgressBarProps {
  value: number;
  max?: number;
  gaugePrimaryColor: string;
  gaugeSecondaryColor: string;
  size?: number;
  strokeWidth?: number;
}

export function AnimatedCircularProgressBar({
  value,
  max = 100,
  gaugePrimaryColor,
  gaugeSecondaryColor,
  size = 104,
  strokeWidth = 10,
}: AnimatedCircularProgressBarProps) {
  const safeValue = Math.max(0, Math.min(value, max));
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / max) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gaugeSecondaryColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gaugePrimaryColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-semibold text-[var(--foreground)]">
        {safeValue}%
      </span>
    </div>
  );
}
