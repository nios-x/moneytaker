/**
 * One stroke weight (1.5), one join, one cap, one 24-unit grid. The source
 * copy used emoji; emoji are not an icon system and render differently on
 * every phone in the room.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconPool({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 14V4.5A1.5 1.5 0 0 1 11 4.5V5" />
      <path d="M16 14V4.5A1.5 1.5 0 0 0 13 4.5V5" />
      <path d="M8 9h8" />
      <path d="M2 18c1.6 0 1.6-1.4 3.2-1.4S6.8 18 8.4 18s1.6-1.4 3.2-1.4S13.2 18 14.8 18s1.6-1.4 3.2-1.4S19.6 18 22 18" />
      <path d="M2 22c1.6 0 1.6-1.4 3.2-1.4S6.8 22 8.4 22s1.6-1.4 3.2-1.4S13.2 22 14.8 22s1.6-1.4 3.2-1.4S19.6 22 22 22" />
    </svg>
  );
}

export function IconDrink({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 4h16l-8 8Z" />
      <path d="M12 12v8" />
      <path d="M8.5 20h7" />
      <path d="M14.5 9.5 19 5" />
    </svg>
  );
}

export function IconGames({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="6.5" width="19" height="11" rx="3.5" />
      <path d="M7 10v4M5 12h4" />
      <circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMusic({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18V5.5l11-2V16" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </svg>
  );
}

export function IconPeople({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.25 3.25 0 0 1 0 5.6" />
      <path d="M17.6 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  );
}

export function IconSpark({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3c.6 4.2 2.2 5.8 6.4 6.4-4.2.6-5.8 2.2-6.4 6.4-.6-4.2-2.2-5.8-6.4-6.4C9.8 8.8 11.4 7.2 12 3Z" />
      <path d="M18 16c.3 1.9 1 2.6 2.9 2.9-1.9.3-2.6 1-2.9 2.9-.3-1.9-1-2.6-2.9-2.9 1.9-.3 2.6-1 2.9-2.9Z" />
    </svg>
  );
}

export function IconCalendar({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconPin({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.5" r="2.75" />
    </svg>
  );
}

export function IconShirt({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8.5 3 4 5.5l1.5 4L8 8.8V21h8V8.8l2.5.7 1.5-4L15.5 3a3.6 3.6 0 0 1-7 0Z" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function IconBack({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
    </svg>
  );
}

export function IconCopy({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15" />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMail({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="m4 7.5 6.9 4.9a2 2 0 0 0 2.2 0L20 7.5" />
    </svg>
  );
}

export function IconInstagram({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSpinner({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
