import { describe, expect, it } from 'vitest';
import { PREF, backupStatus, noteChange } from './reminder';

const prefs = (m = new Map<string, string>()) => ({
  getItem: (k: string) => m.get(k) ?? null,
  setItem: (k: string, v: string) => {
    m.set(k, v);
  },
});
const DIA = 86_400_000;
const T0 = Date.UTC(2027, 2, 1);

describe('lembrete de backup', () => {
  it('[PERS-04] sem dados novos não lembra; com dados novos lembra depois do intervalo', () => {
    const p = prefs();
    expect(backupStatus(p, T0, true).reminder).toBeNull();
    noteChange(p, new Date(T0).toISOString());
    expect(backupStatus(p, T0 + 6 * DIA, true).reminder).toBeNull();
    expect(backupStatus(p, T0 + 7 * DIA, true).reminder?.tone).toBe('info');
    p.setItem(PREF.lastBackup, new Date(T0 + 7 * DIA).toISOString());
    expect(backupStatus(p, T0 + 30 * DIA, true).reminder).toBeNull();
    noteChange(p, new Date(T0 + 8 * DIA).toISOString());
    expect(backupStatus(p, T0 + 13 * DIA, true).reminder).toBeNull();
    expect(backupStatus(p, T0 + 14 * DIA, true).reminder?.tone).toBe('info');
  });

  it('[PERS-04] vira alerta sem armazenamento protegido e o intervalo é configurável', () => {
    const p = prefs();
    noteChange(p, new Date(T0).toISOString());
    expect(backupStatus(p, T0 + 7 * DIA, false).reminder?.tone).toBe('warning');
    p.setItem(PREF.intervalDays, '3');
    expect(backupStatus(p, T0 + 3 * DIA, true).intervalDays).toBe(3);
    expect(backupStatus(p, T0 + 3 * DIA, true).reminder).not.toBeNull();
    p.setItem(PREF.intervalDays, '999');
    expect(backupStatus(p, T0, true).intervalDays).toBe(7);
  });
});
