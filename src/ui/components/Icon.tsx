// Ícones de traço do design system: grade de 24 px, traço 1,75, cantos arredondados, currentColor.
// Desenhados aqui no padrão Lucide (ISC); nenhum pacote nem arquivo externo.
const PATHS = {
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
  check: 'M5 12l4 4L19 7',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  plus: 'M12 5v14M5 12h14',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M6 9l6 6 6-6',
  lock: 'M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM8 10V7a4 4 0 0 1 8 0v3',
  split: 'M3 12h7M14 12h7M10 8l-4 4 4 4M14 8l4 4-4 4',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z',
  home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z',
  share: 'M12 3v12M8 7l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  copy: 'M9 9h10v12H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  download: 'M12 3v12M8 11l4 4 4-4M5 21h14',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff:
    'M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
  close: 'M6 6l12 12M18 6L6 18',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  transfer: 'M4 8h15l-4-4M20 16H5l4 4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  archive: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
