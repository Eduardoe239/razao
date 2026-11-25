// PERS-04: lembrete de backup a cada N dias com dados novos; vira alerta se o armazenamento não estiver protegido.
export const PREF = {
  lastBackup: 'razao:ultimo-backup',
  firstChange: 'razao:primeira-gravacao',
  lastChange: 'razao:ultima-gravacao',
  intervalDays: 'razao:lembrete-dias',
} as const;

export const REMINDER_DEFAULT_DAYS = 7;
export const REMINDER_OPTIONS = [1, 3, 7, 14, 30] as const;

/** Preferências do aparelho (localStorage). Nunca guardam dado financeiro. */
export interface Prefs {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function intervalDays(prefs: Prefs): number {
  const n = Number(prefs.getItem(PREF.intervalDays));
  return (REMINDER_OPTIONS as readonly number[]).includes(n) ? n : REMINDER_DEFAULT_DAYS;
}

const ms = (prefs: Prefs, key: string): number | null => {
  const v = prefs.getItem(key);
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};

export interface BackupStatus {
  readonly lastBackupAt: string | null;
  readonly intervalDays: number;
  /** Há dados gravados depois do último backup. */
  readonly pendingChanges: boolean;
  readonly reminder: { readonly tone: 'info' | 'warning'; readonly text: string } | null;
}

export function backupStatus(prefs: Prefs, nowMs: number, persisted: boolean): BackupStatus {
  const ultimo = ms(prefs, PREF.lastBackup);
  const primeira = ms(prefs, PREF.firstChange);
  const ultimaMudanca = ms(prefs, PREF.lastChange);
  const dias = intervalDays(prefs);
  const pendente = ultimaMudanca !== null && (ultimo === null || ultimaMudanca > ultimo);
  const desde = ultimo ?? primeira;
  const venceu = pendente && desde !== null && nowMs - desde >= dias * 86_400_000;
  let reminder: BackupStatus['reminder'] = null;
  if (venceu) {
    reminder = persisted
      ? {
          tone: 'info',
          text: 'Você tem dados novos desde o último backup. Faça um backup e guarde fora deste aparelho.',
        }
      : {
          tone: 'warning',
          text: 'O navegador pode apagar os dados deste site, e há dados novos sem backup. Faça um backup agora.',
        };
  }
  return {
    lastBackupAt: ultimo === null ? null : new Date(ultimo).toISOString(),
    intervalDays: dias,
    pendingChanges: pendente,
    reminder,
  };
}

/** Marca que houve gravação, para o lembrete saber se há dados novos. */
export function noteChange(prefs: Prefs, iso: string): void {
  if (!prefs.getItem(PREF.firstChange)) prefs.setItem(PREF.firstChange, iso);
  prefs.setItem(PREF.lastChange, iso);
}
