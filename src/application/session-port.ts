// A porta do cofre vista pela sessão: cada gravação é anotada (lembrete de backup, PERS-04) e contada,
// para a atualização do app nunca recarregar no meio de uma gravação (SEC-05).
import type { Clock, SessionPort } from './ports';
import type { Prefs } from './reminder';
import { noteChange } from './reminder';

/** Conta as gravações em andamento, para a atualização do app nunca recarregar no meio de uma (SEC-05). */
export class WriteTracker {
  private emAndamento = 0;
  private espera: (() => void)[] = [];

  async track<T>(p: Promise<T>): Promise<T> {
    this.emAndamento++;
    try {
      return await p;
    } finally {
      this.emAndamento--;
      if (this.emAndamento === 0) for (const f of this.espera.splice(0)) f();
    }
  }

  get busy(): boolean {
    return this.emAndamento > 0;
  }

  /** Resolve quando não houver nenhuma gravação em andamento. */
  idle(): Promise<void> {
    return this.emAndamento === 0 ? Promise.resolve() : new Promise((r) => this.espera.push(r));
  }
}

/** Envolve a porta para anotar cada gravação (lembrete de backup, PERS-04). */
export function anotando(port: SessionPort, prefs: Prefs, clock: Clock, writes: WriteTracker): SessionPort {
  const anotar = <T>(p: Promise<T>) =>
    writes.track(p).then((r) => {
      noteChange(prefs, clock.nowIso());
      return r;
    });
  return {
    get schemaVersion() {
      return port.schemaVersion;
    },
    get safeMode() {
      return port.safeMode;
    },
    issues: () => port.issues(),
    workspaceIds: () => port.workspaceIds(),
    load: (id) => port.load(id),
    commit: (id, op) => anotar(port.commit(id, op)),
    hasOperation: (id, op) => port.hasOperation(id, op),
    readBlob: (id, b) => port.readBlob(id, b),
    verifyStorage: () => port.verifyStorage(),
    deleteWorkspace: (id) => anotar(port.deleteWorkspace(id)),
    exportWorkspaces: (ids) => port.exportWorkspaces(ids),
    importWorkspaces: (d, m, s) => anotar(port.importWorkspaces(d, m, s)),
    restorePoints: () => port.restorePoints(),
    changeKeys: (cur, ch) => writes.track(port.changeKeys(cur, ch)),
    checkCredential: (c) => port.checkCredential(c),
    newRecoveryCode: () => port.newRecoveryCode(),
    undoRestore: (s, b) => anotar(port.undoRestore(s, b)),
    close: () => {
      port.close();
    },
  };
}
