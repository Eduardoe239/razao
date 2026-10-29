import React, { useState, useEffect, useRef } from 'react';

// Design System & Estilos
import './styles/theme.css';

// Componentes da Interface
import { SplashScreen } from './components/SplashScreen';
import { AppShell } from './components/AppShell';
import { SegmentedTabs } from './components/SegmentedTabs';
import { ExecutiveBalanceHeader } from './components/ExecutiveBalanceHeader';
import { InvoiceCycleCard } from './components/InvoiceCycleCard';
import { TransactionFeed } from './components/TransactionFeed';
import { TransactionModal } from './components/TransactionModal';
import { ExpenseAnalytics } from './components/ExpenseAnalytics';
import { UserProfilePanel } from './components/UserProfilePanel';
import { PersonalizationPanel } from './components/PersonalizationPanel';
import { FinancialCharts } from './components/FinancialCharts';
import { ImportReconciliationModal } from './components/ImportReconciliationModal';
import { AccountBalanceReconciliationModal } from './components/AccountBalanceReconciliationModal';
import { AIPredictivePanel } from './components/AIPredictivePanel';
import { DiagnosticModal } from './components/DiagnosticModal';
import { StartupRecoveryScreen } from './components/StartupRecoveryScreen';
import { AuditHistoryPanel } from './components/AuditHistoryPanel';
import { AuditIntegrityPanel } from './components/AuditIntegrityPanel';

// Domínio Financeiro Determinístico & Aprendizado Contínuo
import { cardInvoices } from './domain/invoices';
import { prepareInvoicePayment } from './domain/invoicePayment';
import { applyReconciliationDecisions } from './domain/reconciliation';
import { applyBalanceAdjustment } from './domain/balanceCorrection.js';
import { accountLedger } from './domain/ledger';
import { calculateDashboardSummary, formatDashboardRangeLabel, getDashboardRange } from './domain/dashboardSummary';
import { setCategoryBudget, budgetForMonth } from './domain/budget';
import { buildCommitments } from './domain/commitments';
import { materializeRecurringOccurrences } from './domain/recurringGeneration.js';
import { RecurringManager } from './components/RecurringManager';
import { formatMoney, parseMoneyInputToCents } from './domain/money';
import { sanitizeState, createFreshState } from './domain/sanitize';
import { migrateData, CURRENT_SCHEMA_VERSION } from './domain/migrations.js';
import { validateTransactionMutation } from './domain/transactionMutationValidation.js';
import { validateStateStructure } from './domain/stateValidation.js';
import { parseBackupText, validateHistoricalBackupState } from './domain/backup.js';
import { createAuditEvent, appendAuditEvent, changedSnapshotFields } from './domain/auditLog.js';
import { uid } from './domain/uid';
import { predictCategory, updateCategoryRuleMap, loadLearningRules, filterCategoryRuleMap } from './domain/categoryLearning.js';
import { loadStateAsync, saveState, saveStateWithRecovery } from './services/storage';
import { entitiesForProfile, migrateProfileScopedEntities } from './domain/profileIsolation.js';
import { listLocalBackupHistory, loadLocalBackup } from './services/backupHistory.js';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');
  const [bootError, setBootError] = useState('');
  const [bootAttempt, setBootAttempt] = useState(0);
  const [bootRecoveryBackups, setBootRecoveryBackups] = useState([]);
  const [bootRecoveryBusyId, setBootRecoveryBusyId] = useState('');
  const [bootRecoveryMessage, setBootRecoveryMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [aiQuickQuestion, setAIQuickQuestion] = useState('');
  const [dashboardPeriod, setDashboardPeriod] = useState('monthly');
  const [dashboardMonthOffset, setDashboardMonthOffset] = useState(0);
  const [profileMode, setProfileMode] = useState('PF'); // 'PF' (Pessoal) ou 'PJ' (Empresarial/PME)
  const [hideAmounts, setHideAmounts] = useState(false);
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBalanceReconciliationOpen, setIsBalanceReconciliationOpen] = useState(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const invoicePaymentLocksRef = useRef(new Set());
  const balanceAdjustmentLocksRef = useRef(new Set());

  // Estado Central Financeiro
  const [state, setState] = useState(() => createFreshState());

  // Apply saved visual preferences as design tokens without changing financial state.
  useEffect(() => {
    const storedTheme = state.settings?.theme;
    const accent = storedTheme === 'executive-midnight' || storedTheme === 'minimal-obsidian' || storedTheme === 'slate'
      ? 'slate'
      : storedTheme === 'emerald-gold' || storedTheme === 'forest' ? 'forest' : 'classic-blue';
    const density = ['comfortable', 'compact', 'expanded'].includes(state.settings?.density) ? state.settings.density : 'comfortable';
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.theme = 'light';
  }, [state.settings?.theme, state.settings?.density]);

  useEffect(() => {
    const onStorageHealth = event => setStorageWarning(event?.detail?.message || '');
    window.addEventListener('razao:storage-health', onStorageHealth);
    return () => window.removeEventListener('razao:storage-health', onStorageHealth);
  }, []);

  // Hidratação fail-closed: se a leitura falhar, não habilitar autosave nem
  // deixar a splash infinita. Exibir um fluxo explícito de recuperação validada.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const loaded = await loadStateAsync();
        if (!active) return;
        // No primeiro uso, criar um estado vazio e versionado sem misturar dados
        // de demonstração. Estados existentes passam pelo migrador único, são
        // validados antes da sanitização e só então podem voltar à persistência.
        const source = loaded === null ? createFreshState() : loaded;
        const migrated = migrateData(source);
        const preSanitizeValidation = validateStateStructure(migrated, {
          requireCurrentSchema: true,
          allowProfileMigration: true
        });
        if (!preSanitizeValidation.valid) {
          throw new Error(`O estado após migração não passou na validação: ${preSanitizeValidation.issues.join(' ')}`);
        }
        const scoped = migrateProfileScopedEntities(migrated);
        const scopedValidation = validateStateStructure(scoped, {
          requireCurrentSchema: true,
          allowProfileMigration: false
        });
        if (!scopedValidation.valid) {
          throw new Error(`O estado após isolamento PF/PJ não passou na validação: ${scopedValidation.issues.join(' ')}`);
        }
        const baseHydrated = sanitizeState(scoped);
        const storedLearningByProfile = baseHydrated.settings?.categoryLearningRulesByProfile || {};
        const categoriesForLearning = baseHydrated.categories || [];
        const legacyWebRules = window.electronAPI?.isDesktop ? {} : loadLearningRules();
        const pfRules = {
          ...filterCategoryRuleMap(legacyWebRules, categoriesForLearning, 'PF'),
          ...filterCategoryRuleMap(storedLearningByProfile.PF, categoriesForLearning, 'PF')
        };
        const pjRules = filterCategoryRuleMap(storedLearningByProfile.PJ, categoriesForLearning, 'PJ');
        const hydrated = {
          ...baseHydrated,
          settings: {
            ...baseHydrated.settings,
            categoryLearningRulesByProfile: { PF: pfRules, PJ: pjRules }
          }
        };
        const requiresSchemaCommit = loaded !== null && (
          Number(loaded.version) !== CURRENT_SCHEMA_VERSION
          || Number(loaded.schemaVersion) !== CURRENT_SCHEMA_VERSION
        );
        if (requiresSchemaCommit) {
          const committed = await saveStateWithRecovery(hydrated);
          if (!committed?.success) {
            throw new Error(committed?.message || 'A migração não foi gravada com segurança. Os dados anteriores foram preservados.');
          }
          if (committed.recoverySnapshotUpdated === false) {
            setStorageWarning(committed.recoveryWarning || 'A migração foi gravada, mas a cópia secundária de recuperação não foi atualizada. Exporte um backup.');
          }
        }
        setState(hydrated);
        setUserProfile(hydrated.userProfile || {
          name: '', email: '', phone: '', avatarEmoji: '👨‍💼', title: 'Iniciado do Razão'
        });
        setBootError('');
        setBootRecoveryBackups([]);
        setBootRecoveryMessage('');
        setIsHydrated(true);
      } catch (error) {
        if (!active) return;
        const message = error?.message || 'Erro desconhecido ao ler o armazenamento.';
        console.error('Não foi possível carregar os dados persistidos do Razão:', error);
        setBootError(message);
        setIsHydrated(false);
        setShowSplash(false);
        try {
          let backups = [];
          if (window.electronAPI?.isDesktop && typeof window.electronAPI.listRecoveryBackups === 'function') {
            backups = await window.electronAPI.listRecoveryBackups();
          } else if (!window.electronAPI?.isDesktop) {
            backups = listLocalBackupHistory();
          }
          if (active) setBootRecoveryBackups(Array.isArray(backups) ? backups.filter(item => item && typeof item.id === 'string') : []);
        } catch (backupError) {
          if (active) {
            setBootRecoveryBackups([]);
            setBootRecoveryMessage(`Não foi possível listar o histórico de recuperação sem alterar os arquivos: ${backupError?.message || 'erro desconhecido'}`);
          }
        }
      }
    })();
    return () => { active = false; };
  }, [bootAttempt]);

  // Estado do Perfil do Usuário
  const [userProfile, setUserProfile] = useState(() => {
    return state.userProfile || {
      name: '',
      email: '',
      phone: '',
      avatarEmoji: '👨‍💼',
      title: 'Iniciado do Razão'
    };
  });

  // Persistência Criptografada Observável
  useEffect(() => {
    if (!isHydrated) return;
    saveState({ ...state, userProfile }).then(ok => {
      if (!ok) console.error('O Razão não conseguiu confirmar a persistência dos dados.');
    });
  }, [state, userProfile, isHydrated]);

  const { transactions = [], recurring = [] } = state;
  const accounts = entitiesForProfile(state.accounts, profileMode);
  const categories = entitiesForProfile(state.categories, profileMode);
  const cards = entitiesForProfile(state.cards, profileMode);

  // Filtragem Dinâmica por Perfil PF / PJ (Inspirado no Organizze)
  // Hydration/migration assigns an explicit PF/PJ to every financial record.
  // Do not let an unclassified record fall into both views.
  const filteredTransactions = transactions.filter(t => t?.profileType === profileMode);

  const formatCurrency = (amountCents) => {
    if (hideAmounts) return '••••••';
    return formatMoney(amountCents || 0);
  };
  const localNow = new Date();
  const todayISO = `${localNow.getFullYear()}-${String(localNow.getMonth()+1).padStart(2,'0')}-${String(localNow.getDate()).padStart(2,'0')}`;
  const dashboardRange = getDashboardRange({ period: dashboardPeriod, monthOffset: dashboardMonthOffset, now: localNow });
  const dashboardMonthKey = dashboardRange.monthKey;
  const dashboardMonthLabel = formatDashboardRangeLabel(dashboardRange);

  const primaryCard = cards[0] || null;
  const invoicesData = primaryCard ? cardInvoices(primaryCard, filteredTransactions, todayISO.slice(0, 7), 2, 2, todayISO) : [];
  const currentInvoice = invoicesData.find(i => i.monthKey === todayISO.slice(0, 7)) || invoicesData[0] || null;
  const dashboardInvoicesData = primaryCard ? cardInvoices(primaryCard, filteredTransactions, dashboardMonthKey, 2, 2, todayISO) : [];
  const dashboardInvoice = dashboardInvoicesData.find(i => i.monthKey === dashboardMonthKey) || null;
  const committedCents = dashboardInvoice ? dashboardInvoice.remainingCents : 0;

  const dashboardSummary = calculateDashboardSummary({
    transactions: filteredTransactions,
    accounts,
    period: dashboardPeriod,
    monthOffset: dashboardMonthOffset,
    now: localNow,
    committedCents
  });
  const {
    realizedCents,
    projectedCents,
    availableCents,
    incomeCents,
    expenseCents
  } = dashboardSummary;

  const filteredRecurring = recurring.filter(rule => rule?.profileType === profileMode);
  const commitments = buildCommitments({ transactions: filteredTransactions, recurring: filteredRecurring, todayISO, monthsAhead: 3 });


  const handleRestoreBackup = async (restoredState) => {
    // Defense in depth: the UI modal validates its input, but this persistence
    // boundary must independently reject semantic corruption before sanitizing.
    const validation = validateHistoricalBackupState(restoredState);
    if (!validation.valid) {
      throw new Error(`O backup foi recusado antes da restauração: ${validation.issues.join(' ')}`);
    }
    const scopedRestored = migrateProfileScopedEntities(validation.state);
    const scopedRestoreValidation = validateStateStructure(scopedRestored, { requireCurrentSchema: true, allowProfileMigration: false });
    if (!scopedRestoreValidation.valid) throw new Error(`O backup foi recusado após isolamento PF/PJ: ${scopedRestoreValidation.issues.join(' ')}`);
    const restored = sanitizeState(scopedRestored);
    const restoredProfile = restored.userProfile || { name: '', email: '', phone: '', avatarEmoji: '👨‍💼', title: 'Iniciado do Razão' };
    const event = createAuditEvent({
      eventId: uid(), timestamp: new Date().toISOString(), action: 'backup_restored',
      entityType: 'backup', entityId: uid(), profileType: profileMode,
      metadata: { accounts: restored.accounts.length, transactions: restored.transactions.length, source: 'validated_json_backup' }
    });
    const nextState = { ...restored, auditLog: appendAuditEvent(restored.auditLog, event) };
    const persisted = await saveStateWithRecovery({ ...nextState, userProfile: restoredProfile });
    if (!persisted?.success) {
      throw new Error(persisted?.message || 'Não foi possível confirmar a gravação do backup restaurado. Os dados em memória não foram substituídos.');
    }
    setState(nextState);
    setUserProfile(restoredProfile);
    return persisted;
  };

  const handleStartupRestore = async (candidateState, sourceLabel, createdAt, sourceType = 'recovery_copy') => {
    if (bootRecoveryBusyId) return;
    setBootRecoveryBusyId(sourceLabel || sourceType);
    setBootRecoveryMessage('');
    try {
      const validation = validateHistoricalBackupState(candidateState, createdAt);
      if (!validation.valid) throw new Error(`A cópia não passou na validação financeira: ${validation.issues.join(' ')}`);
      const summary = validation.summary;
      const confirmed = window.confirm(
        `Restaurar ${sourceLabel || 'esta cópia'}?\n\nContas: ${summary.accounts}\nLançamentos: ${summary.transactions}\nCartões: ${summary.cards}\nEventos de auditoria: ${summary.auditEvents}\n\nOs dados ativos serão substituídos somente depois da validação. O estado atual será preservado pelo mecanismo de recuperação quando possível.`
      );
      if (!confirmed) {
        setBootRecoveryMessage('Restauração cancelada; os dados ativos não foram alterados.');
        return;
      }
      const scopedRestored = migrateProfileScopedEntities(validation.state);
      const scopedRestoreValidation = validateStateStructure(scopedRestored, { requireCurrentSchema: true, allowProfileMigration: false });
      if (!scopedRestoreValidation.valid) throw new Error(`A cópia foi recusada após isolamento PF/PJ: ${scopedRestoreValidation.issues.join(' ')}`);
      const restored = sanitizeState(scopedRestored);
      const restoredProfile = restored.userProfile || { name: '', email: '', phone: '', avatarEmoji: '👨‍💼', title: 'Iniciado do Razão' };
      const event = createAuditEvent({
        eventId: uid(), timestamp: new Date().toISOString(), action: 'backup_restored',
        entityType: 'backup', entityId: uid(), profileType: 'PF',
        metadata: { accounts: restored.accounts.length, transactions: restored.transactions.length, source: sourceType }
      });
      const nextState = { ...restored, auditLog: appendAuditEvent(restored.auditLog, event), userProfile: restoredProfile };
      const persisted = await saveStateWithRecovery(nextState);
      if (!persisted?.success) throw new Error(persisted?.message || 'A restauração não foi confirmada; a aplicação continuará bloqueada para evitar sobrescrita.');
      setState(nextState);
      setUserProfile(restoredProfile);
      setBootRecoveryBackups([]);
      setBootError('');
      setShowSplash(false);
      setIsHydrated(true);
      if (persisted.recoverySnapshotUpdated === false) {
        const warning = persisted.recoveryWarning || 'A cópia de recuperação secundária não foi atualizada. Exporte um backup externo imediatamente.';
        setStorageWarning(warning);
      }
    } catch (error) {
      setBootRecoveryMessage(`Não foi possível restaurar a cópia; os dados ativos continuam protegidos: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setBootRecoveryBusyId('');
    }
  };

  const handleRestoreStartupBackup = async (backup) => {
    if (!backup?.valid) {
      setBootRecoveryMessage(`Esta cópia não está marcada como válida: ${backup?.issue || 'validação estrutural falhou'}`);
      return;
    }
    setBootRecoveryBusyId(backup.id);
    try {
      let loaded;
      if (window.electronAPI?.isDesktop) {
        if (typeof window.electronAPI.loadRecoveryBackup !== 'function') throw new Error('Esta versão desktop não oferece carregamento de cópias de recuperação.');
        loaded = await window.electronAPI.loadRecoveryBackup(backup.id);
      } else {
        loaded = loadLocalBackup(backup.id);
      }
      // Clear the busy state before the shared restore guard acquires its own lock.
      setBootRecoveryBusyId('');
      await handleStartupRestore(loaded?.state, backup.label || backup.id, loaded?.createdAt || backup.createdAt, window.electronAPI?.isDesktop ? 'desktop_recovery_copy' : 'local_history_backup');
    } catch (error) {
      setBootRecoveryMessage(`Falha ao abrir a cópia de recuperação: ${error?.message || 'erro desconhecido'}`);
      setBootRecoveryBusyId('');
    }
  };

  const handleImportStartupBackup = async (file) => {
    if (!file || bootRecoveryBusyId) return;
    setBootRecoveryBusyId('external-backup');
    setBootRecoveryMessage('');
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error('O arquivo excede o limite de 25 MB.');
      const parsed = parseBackupText(await file.text());
      if (!parsed.valid) throw new Error(parsed.issues.join(' '));
      setBootRecoveryBusyId('');
      await handleStartupRestore(parsed.state, file.name || 'backup JSON externo', parsed.summary.createdAt, 'external_json_backup');
    } catch (error) {
      setBootRecoveryMessage(`O backup externo foi recusado: ${error?.message || 'arquivo inválido'}`);
      setBootRecoveryBusyId('');
    }
  };

  const handleRetryStartupRead = () => {
    if (bootRecoveryBusyId) return;
    setBootRecoveryMessage('Tentando ler o armazenamento novamente…');
    setBootError('');
    setShowSplash(true);
    setBootAttempt(attempt => attempt + 1);
  };

  const handleAddRecurring = (rule) => {
    if (!rule || typeof rule.id !== 'string' || !rule.id.trim()) return;
    const timestamp = new Date().toISOString();
    setState(prev => {
      const current = prev.recurring || [];
      if (current.some(existing => existing.id === rule.id)) return prev;
      const created = { ...rule, profileType: profileMode };
      const event = createAuditEvent({ eventId: uid(), timestamp, action: 'recurring_rule_created', entityType: 'recurring_rule', entityId: created.id, profileType: profileMode, after: created, metadata: { amountCents: created.amountCents, type: created.type, dayOfMonth: created.dayOfMonth } });
      return { ...prev, recurring: [...current, created], auditLog: appendAuditEvent(prev.auditLog, event) };
    });
  };
  const handleToggleRecurring = (id) => {
    const timestamp = new Date().toISOString();
    setState(prev => {
      const current = prev.recurring || [];
      const before = current.find(rule => rule.id === id);
      if (!before || before.profileType !== profileMode) return prev;
      const after = { ...before, active: !before.active };
      const event = createAuditEvent({ eventId: uid(), timestamp, action: 'recurring_rule_toggled', entityType: 'recurring_rule', entityId: id, profileType: profileMode, before, after, metadata: { oldActive: Boolean(before.active), newActive: Boolean(after.active) } });
      return { ...prev, recurring: current.map(rule => rule.id === id ? after : rule), auditLog: appendAuditEvent(prev.auditLog, event) };
    });
  };
  const handleDeleteRecurring = (id) => {
    const timestamp = new Date().toISOString();
    setState(prev => {
      const current = prev.recurring || [];
      const before = current.find(rule => rule.id === id);
      if (!before || before.profileType !== profileMode) return prev;
      const event = createAuditEvent({ eventId: uid(), timestamp, action: 'recurring_rule_deleted', entityType: 'recurring_rule', entityId: id, profileType: profileMode, before, metadata: { deleted: true } });
      return { ...prev, recurring: current.filter(rule => rule.id !== id), auditLog: appendAuditEvent(prev.auditLog, event) };
    });
  };

  const handleGenerateRecurringOccurrences = (requestedOccurrences) => {
    const requests = Array.isArray(requestedOccurrences) ? requestedOccurrences : [requestedOccurrences];
    const preview = materializeRecurringOccurrences({
      recurring: filteredRecurring, occurrences: requests, transactions: filteredTransactions,
      accounts, categories, profileType: profileMode, createId: () => `preview-${Math.random()}`
    });
    if (!preview.added.length) {
      alert(preview.issues[0] || 'Nenhuma ocorrência nova e válida para gerar.');
      return;
    }
    const incomeCents = preview.added.filter(tx => tx.type === 'receita').reduce((sum, tx) => sum + tx.amountCents, 0);
    const expenseCents = preview.added.filter(tx => tx.type !== 'receita').reduce((sum, tx) => sum + tx.amountCents, 0);
    const summary = `${preview.added.length} lançamento(s) pendente(s) serão criados.\nReceitas: ${formatCurrency(incomeCents)}\nDespesas: ${formatCurrency(expenseCents)}`;
    if (!window.confirm(`${summary}\n\nNenhum pagamento será executado. Deseja continuar?`)) return;
    const timestamp = new Date().toISOString();
    setState(prev => {
      const currentTransactions = prev.transactions || [];
      const currentRecurring = (prev.recurring || []).filter(rule => rule?.profileType === profileMode);
      const result = materializeRecurringOccurrences({
        recurring: currentRecurring, occurrences: requests, transactions: currentTransactions,
        accounts: entitiesForProfile(prev.accounts, profileMode), categories: entitiesForProfile(prev.categories, profileMode), profileType: profileMode, createId: uid
      });
      if (!result.added.length) return prev;
      let auditLog = prev.auditLog || [];
      for (const transaction of result.added) {
        const event = createAuditEvent({
          eventId: uid(), timestamp, action: 'transaction_created', entityType: 'transaction',
          entityId: transaction.id, profileType: profileMode, after: transaction,
          metadata: { source: 'recurring', recurringId: transaction.recurringId, occurrenceDate: transaction.recurringOccurrenceDate }
        });
        auditLog = appendAuditEvent(auditLog, event);
      }
      return { ...prev, transactions: [...result.added, ...currentTransactions], auditLog };
    });
    alert(`Solicitação de geração concluída. Foram selecionadas ${preview.added.length} ocorrência(s). Revise os lançamentos pendentes para confirmar.`);
  };

  // HANDLERS DE LANÇAMENTO & APRENDIZADO
  const handleSaveTransaction = (data) => {
    // Revalidar antes de qualquer efeito colateral. Uma edição antiga aberta em
    // outro perfil não pode contaminar aprendizado nem alterar finanças.
    let existingRecord = null;
    if (data?.id) {
      existingRecord = (state.transactions || []).find(transaction => transaction?.id === data.id) || null;
      if (!existingRecord || existingRecord.profileType !== profileMode) {
        alert('Este lançamento não pertence ao perfil ativo ou já não existe. Nenhuma alteração foi aplicada.');
        return;
      }
      // O formulário simples não implementa conversão de transferências para
      // receita/despesa: preservar o destino é mais seguro que mudar o tipo.
      if (existingRecord.type === 'transferencia' && data.type !== 'transferencia') {
        alert('Este lançamento é uma transferência. O formulário simples não pode convertê-lo em receita ou despesa. Nenhuma alteração foi aplicada.');
        return;
      }
    }
    const proposedTransaction = { ...(existingRecord || {}), ...data, profileType: profileMode };
    const mutationValidation = validateTransactionMutation(proposedTransaction, {
      accounts: state.accounts || [], cards: state.cards || [], categories: state.categories || [], profileType: profileMode
    });
    if (!mutationValidation.valid) {
      alert(`${mutationValidation.reason} Nenhuma alteração foi aplicada.`);
      return;
    }

    // O aprendizado fica dentro do estado financeiro persistido (e, portanto,
    // dentro do safeStorage no desktop), separado por perfil PF/PJ.
    if (data.description && data.categoryId) {
      setState(prev => {
        const settings = prev.settings || {};
        const byProfile = settings.categoryLearningRulesByProfile || {};
        const currentRules = byProfile[profileMode] || {};
        const updatedRules = updateCategoryRuleMap(currentRules, data.description, data.categoryId);
        if (updatedRules === currentRules) return prev;
        return {
          ...prev,
          settings: {
            ...settings,
            categoryLearningRulesByProfile: { ...byProfile, [profileMode]: updatedRules }
          }
        };
      });
    }

    const txData = {
      ...data,
      profileType: profileMode
    };

    const eventId = uid();
    const timestamp = new Date().toISOString();
    if (txData.id) {
      setState(prev => {
        const before = (prev.transactions || []).find(t => t.id === txData.id);
        if (!before || before.profileType !== profileMode) return prev;
        const updated = { ...before, ...txData };
        const event = createAuditEvent({ eventId, timestamp, action: 'transaction_updated', entityType: 'transaction', entityId: updated.id, profileType: profileMode, before, after: updated, metadata: { changedFields: changedSnapshotFields(before, updated).join(',') } });
        return { ...prev, transactions: (prev.transactions || []).map(t => t.id === txData.id ? updated : t), auditLog: appendAuditEvent(prev.auditLog, event) };
      });
    } else {
      const newTransaction = { ...txData, id: uid() };
      const event = createAuditEvent({ eventId, timestamp, action: 'transaction_created', entityType: 'transaction', entityId: newTransaction.id, profileType: profileMode, after: newTransaction });
      setState(prev => ({ ...prev, transactions: [newTransaction, ...(prev.transactions || [])], auditLog: appendAuditEvent(prev.auditLog, event) }));
    }
  };

  const handleDeleteTransaction = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      const eventId = uid();
      const timestamp = new Date().toISOString();
      setState(prev => {
        const removed = (prev.transactions || []).find(t => t.id === id);
        if (!removed || removed.profileType !== profileMode) return prev;
        const event = createAuditEvent({ eventId, timestamp, action: 'transaction_deleted', entityType: 'transaction', entityId: id, profileType: removed.profileType, before: removed, metadata: { deleted: true } });
        return { ...prev, transactions: prev.transactions.filter(t => t.id !== id), auditLog: appendAuditEvent(prev.auditLog, event) };
      });
    }
  };

  const handleToggleStatus = (t) => {
    const updatedStatus = t.status === 'pendente' ? 'pago' : 'pendente';
    const eventId = uid();
    const timestamp = new Date().toISOString();
    setState(prev => {
      const before = (prev.transactions || []).find(item => item.id === t.id);
      if (!before || before.profileType !== profileMode) return prev;
      const after = { ...before, status: updatedStatus };
      const event = createAuditEvent({ eventId, timestamp, action: 'transaction_status_changed', entityType: 'transaction', entityId: t.id, profileType: before.profileType, before, after, metadata: { oldStatus: before.status, newStatus: updatedStatus } });
      return { ...prev, transactions: prev.transactions.map(item => item.id === t.id ? after : item), auditLog: appendAuditEvent(prev.auditLog, event) };
    });
  };

  const handlePayInvoice = (card, invoice) => {
    if (!invoice || !card) return;
    const remainingCents = Number(invoice.remainingCents);
    if (!Number.isSafeInteger(remainingCents) || remainingCents <= 0) {
      alert('Esta fatura não possui saldo devedor válido.');
      return;
    }
    if (!accounts.length) {
      alert('Cadastre uma conta bancária antes de registrar o pagamento. Nenhuma movimentação foi criada.');
      return;
    }

    // Não seleciona silenciosamente a primeira conta quando há várias opções.
    const accountOptions = accounts.map((account, index) => {
      const balance = accountLedger(account, filteredTransactions).balanceCents;
      return `${index + 1}. ${account.name || `Conta ${index + 1}`} — ${formatCurrency(balance)}`;
    });
    let selectedAccount = accounts[0];
    if (accounts.length > 1) {
      const answer = window.prompt(
        `De qual conta deseja pagar ${formatCurrency(remainingCents)} da fatura ${card.name || ''}?\n\n${accountOptions.join('\n')}\n\nDigite o número da conta:`,
        '1'
      );
      if (answer === null) return;
      const selectedIndex = Number(answer) - 1;
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= accounts.length) {
        alert('Seleção de conta inválida. Nenhuma movimentação foi criada.');
        return;
      }
      selectedAccount = accounts[selectedIndex];
    }

    const transactionId = uid();
    const proposal = prepareInvoicePayment({
      card,
      invoice,
      accounts,
      transactions: filteredTransactions,
      fromAccountId: selectedAccount.id,
      todayISO,
      profileType: profileMode,
      transactionId
    });
    if (!proposal.valid) {
      alert(`${proposal.reason}\n\nNenhuma movimentação foi criada.`);
      return;
    }

    const lockKey = proposal.transaction.idempotencyKey;
    if (invoicePaymentLocksRef.current.has(lockKey)) {
      alert('Este pagamento já está sendo processado. Aguarde a atualização da fatura.');
      return;
    }
    invoicePaymentLocksRef.current.add(lockKey);

    const paymentAuditEventId = uid();
    const paymentAuditTimestamp = new Date().toISOString();
    setState(prev => {
      // Segunda validação contra o estado mais recente; o bloqueio em memória
      // reduz clique duplo, e a chave persistida impede reenvio após recarga.
      const currentTransactions = (prev.transactions || []).filter(t => t?.profileType === profileMode);
      const currentCard = entitiesForProfile(prev.cards, profileMode).find(item => item?.id === card.id);
      if (!currentCard) return prev;
      const currentPayment = prepareInvoicePayment({
        card: currentCard,
        invoice,
        accounts: entitiesForProfile(prev.accounts, profileMode),
        transactions: currentTransactions,
        fromAccountId: selectedAccount.id,
        todayISO,
        profileType: profileMode,
        transactionId
      });
      if (!currentPayment.valid || currentPayment.transaction.idempotencyKey !== lockKey) return prev;
      const event = createAuditEvent({ eventId: paymentAuditEventId, timestamp: paymentAuditTimestamp, action: 'invoice_payment_registered', entityType: 'transaction', entityId: currentPayment.transaction.id, profileType: profileMode, after: currentPayment.transaction, metadata: { cardId: card.id, invoiceMonth: invoice.monthKey || invoice.periodKey || '', amountCents: currentPayment.transaction.amountCents } });
      return { ...prev, transactions: [currentPayment.transaction, ...(prev.transactions || [])], auditLog: appendAuditEvent(prev.auditLog, event) };
    });

    // Se a segunda validação detectar estado obsoleto, permite nova tentativa.
    // Em caso de sucesso, a chave ficará no histórico e bloqueará reenvio idêntico.
    window.setTimeout(() => invoicePaymentLocksRef.current.delete(lockKey), 1200);
    alert(`A validação do pagamento de ${formatCurrency(proposal.requiredBalanceCents)} a partir de “${selectedAccount.name || 'conta selecionada'}” foi aprovada. Confira a fatura após a atualização; se os dados tiverem mudado durante a operação, tente novamente. O Razão registra a movimentação localmente, mas não envia dinheiro ao banco.`);
  };

  const handleApplyBalanceAdjustment = (draft, reviewedResult) => {
    const selectedProfile = draft?.profileType === 'PJ' ? 'PJ' : 'PF';
    if (selectedProfile !== profileMode) {
      return { ok: false, message: 'O perfil do ajuste não corresponde ao perfil ativo. Nenhuma alteração foi aplicada.' };
    }
    const lockKey = `${selectedProfile}:${draft?.reconciliationKey || ''}`;
    if (!draft?.reconciliationKey || balanceAdjustmentLocksRef.current.has(lockKey)) {
      return { ok: false, message: 'Este ajuste já está sendo processado. Confira o saldo novamente.' };
    }
    if ((state.transactions || []).some(tx => tx?.profileType === selectedProfile && tx?.reconciliationKey === draft.reconciliationKey && tx.status !== 'cancelado')) {
      return { ok: false, message: 'Este ajuste para a mesma divergência já foi registrado neste perfil.' };
    }

    balanceAdjustmentLocksRef.current.add(lockKey);
    const profileTransactions = (state.transactions || []).filter(tx => tx?.profileType === selectedProfile);
    const transactionId = uid();
    const applied = applyBalanceAdjustment({
      accounts: entitiesForProfile(state.accounts, selectedProfile),
      transactions: profileTransactions,
      result: reviewedResult,
      draft,
      transactionId
    });
    if (!applied.valid) {
      balanceAdjustmentLocksRef.current.delete(lockKey);
      return { ok: false, message: applied.reason };
    }

    // A chave é bloqueada antes de enfileirar o update para que cliques rápidos
    // não registrem o mesmo ajuste duas vezes. Os dados da conferência são
    // revalidados pelo domínio antes de chegar aqui.
    const auditEventId = uid();
    const auditTimestamp = new Date().toISOString();
    setState(prev => {
      if ((prev.transactions || []).some(tx => tx?.profileType === selectedProfile && tx?.reconciliationKey === draft.reconciliationKey && tx.status !== 'cancelado')) return prev;
      const event = createAuditEvent({ eventId: auditEventId, timestamp: auditTimestamp, action: 'balance_adjustment_applied', entityType: 'transaction', entityId: applied.transaction.id, profileType: selectedProfile, after: applied.transaction, metadata: { reconciliationKey: draft.reconciliationKey, differenceCents: draft.differenceCents || 0 } });
      return { ...prev, transactions: [applied.transaction, ...(prev.transactions || [])], auditLog: appendAuditEvent(prev.auditLog, event) };
    });
    window.setTimeout(() => balanceAdjustmentLocksRef.current.delete(lockKey), 1500);
    return { ok: true, transaction: applied.transaction };
  };

  const handleImportConfirmed = (selectedItems, selectedAccountId, selectedCategoryId) => {
    // A prévia permite informar o resultado esperado sem colocar efeitos colaterais
    // dentro do updater do React. O updater aplica a mesma função ao estado mais recente.
    const preparedItems = selectedItems.map(item => ({
      ...item,
      categoryId: item.categoryId || predictCategory(item.description, selectedCategoryId || categories[0]?.id || '', state.settings?.categoryLearningRulesByProfile?.[profileMode] || {})
    }));
    const preview = applyReconciliationDecisions({
      existingTransactions: state.transactions,
      selectedItems: preparedItems,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      profileType: profileMode,
      accounts,
      categories,
      createId: uid
    });

    const auditEventId = uid();
    const auditTimestamp = new Date().toISOString();
    setState(prev => {
      const applied = applyReconciliationDecisions({
        existingTransactions: prev.transactions || [],
        selectedItems: preparedItems,
        accountId: selectedAccountId,
        categoryId: selectedCategoryId,
        profileType: profileMode,
        accounts: entitiesForProfile(prev.accounts, profileMode),
        categories: entitiesForProfile(prev.categories, profileMode),
        createId: uid
      });
      const event = createAuditEvent({ eventId: auditEventId, timestamp: auditTimestamp, action: 'import_reconciliation_summary', entityType: 'import', entityId: null, profileType: profileMode, metadata: { addedCount: applied.addedCount, settledCount: applied.settledCount, skippedCount: applied.skippedCount, source: 'local_import' } });
      return { ...prev, transactions: applied.transactions, auditLog: appendAuditEvent(prev.auditLog, event) };
    });

    const details = [
      `${preview.addedCount} novo(s) lançamento(s)`,
      `${preview.settledCount} pendência(s) baixada(s)`,
      `${preview.skippedCount} item(ns) ignorado(s)`
    ];
    const issueText = preview.issues.length ? `\n\nAtenção: ${preview.issues.slice(0, 3).join(' ')}` : '';
    alert(`${details.join(' · ')}.\n\nAs alterações são locais. Revise o histórico para confirmar o resultado.${issueText}`);
  };

  return (
    <>
      {/* 1. TELA DE ABERTURA SPLASH SCREEN (VERSÃO .EXE DESKTOP E WEB) */}
      {!bootError && (!isHydrated || showSplash) && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {storageWarning && (
        <div className="storage-health-warning" role="alert" aria-live="assertive">
          <span>{storageWarning}</span>
          <button type="button" aria-label="Fechar aviso de armazenamento" onClick={() => setStorageWarning('')}>Entendi</button>
        </div>
      )}

      {!bootError && isHydrated && !showSplash && (<AppShell
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewTransaction={() => { setEditingTransaction(null); setIsModalOpen(true); }}
        onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
        userProfile={userProfile}
        badges={{ pendingInvoices: currentInvoice?.status === 'fechada' ? 1 : 0 }}
        profileMode={profileMode}
        setProfileMode={setProfileMode}
        hideAmounts={hideAmounts}
        setHideAmounts={setHideAmounts}
        onAIQuickAsk={(prompt) => setAIQuickQuestion(prompt)}
      >
        {/* 1. ABA PAINEL GERAL (DASHBOARD) */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-view">
            <div className="dashboard-toolbar">
              <div className="dashboard-period-controls" aria-label="Período do painel">
                <div className="pill-tabs-container" role="group" aria-label="Selecionar período">
                  <button type="button" className={`pill-tab ${dashboardPeriod === 'weekly' ? 'active' : ''}`} aria-pressed={dashboardPeriod === 'weekly'} onClick={() => setDashboardPeriod('weekly')}>Semana</button>
                  <button type="button" className={`pill-tab ${dashboardPeriod === 'monthly' ? 'active' : ''}`} aria-pressed={dashboardPeriod === 'monthly'} onClick={() => setDashboardPeriod('monthly')}>Mês</button>
                  <button type="button" className={`pill-tab ${dashboardPeriod === 'quarterly' ? 'active' : ''}`} aria-pressed={dashboardPeriod === 'quarterly'} onClick={() => setDashboardPeriod('quarterly')}>3 meses</button>
                </div>
                <div className="date-navigator" aria-label="Navegar entre períodos">
                  <button type="button" className="date-nav-btn" aria-label="Período anterior" onClick={() => setDashboardMonthOffset(v => v - 1)}>‹</button>
                  <span className="date-nav-label">{dashboardMonthLabel.charAt(0).toUpperCase() + dashboardMonthLabel.slice(1)} · {profileMode}</span>
                  <button type="button" className="date-nav-btn" aria-label="Próximo período" onClick={() => setDashboardMonthOffset(v => v + 1)}>›</button>
                </div>
              </div>
              <div className="dashboard-quick-actions">
                <button type="button" className="button-secondary" onClick={() => setIsBalanceReconciliationOpen(true)}>Conferir saldo do extrato</button>
                <button type="button" className="button-secondary" onClick={() => setIsImportModalOpen(true)}>Importar arquivo</button>
              </div>
            </div>

            <ExecutiveBalanceHeader
              realizedCents={realizedCents}
              projectedCents={projectedCents}
              committedCents={committedCents}
              availableCents={availableCents}
              incomeCents={incomeCents}
              expenseCents={expenseCents}
              formatCurrency={formatCurrency}
              hideAmounts={hideAmounts}
            />

            <div className="dashboard-lower-grid">
              <section className="dashboard-section" aria-labelledby="dashboard-transactions-title">
                <div className="dashboard-section-heading">
                  <div>
                    <h2 id="dashboard-transactions-title">Últimas movimentações</h2>
                    <p>Atividade recente em {profileMode === 'PF' ? 'finanças pessoais' : 'finanças profissionais'}.</p>
                  </div>
                  <button type="button" className="see-all-link" onClick={() => setActiveTab('transactions')}>Ver todas <span aria-hidden="true">→</span></button>
                </div>
                <TransactionFeed
                  transactions={filteredTransactions.slice(0, 8)}
                  accounts={[...accounts, ...cards]}
                  categories={categories}
                  formatCurrency={formatCurrency}
                  onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onToggleStatus={handleToggleStatus}
                />
              </section>

              <section className="dashboard-section" aria-labelledby="dashboard-commitments-title">
                <div className="dashboard-section-heading">
                  <div>
                    <h2 id="dashboard-commitments-title">Próximos compromissos</h2>
                    <p>Pagamentos e recorrências previstos.</p>
                  </div>
                  <span className="commitment-count">{commitments.length}</span>
                </div>
                {commitments.length === 0 ? (
                  <div className="empty-state compact-empty-state">
                    <span className="empty-state-mark" aria-hidden="true">✓</span>
                    <strong>Nenhum compromisso previsto</strong>
                    <p>Quando houver pagamentos pendentes ou recorrências, eles aparecerão aqui.</p>
                  </div>
                ) : <>
                  {commitments.some(item => item.sourceType === 'recurring') && (
                    <button type="button" className="button-secondary commitments-generate-all" onClick={() => handleGenerateRecurringOccurrences(commitments.filter(item => item.sourceType === 'recurring').map(item => ({ recurringId: item.recurringId, recurringOccurrenceDate: item.recurringOccurrenceDate })))}>
                      Gerar todas as recorrências do período
                    </button>
                  )}
                  <div className="commitment-list">
                    {commitments.slice(0, 8).map(item => (
                      <div className="commitment-item" key={`${item.sourceType}-${item.id}`}>
                        <div className="commitment-date-mark" aria-hidden="true"><span>{String(item.date || '').slice(8, 10) || '—'}</span></div>
                        <div className="commitment-copy">
                          <strong>{item.description}</strong>
                          <span>{item.date} · {item.sourceType === 'recurring' ? 'Recorrência prevista' : 'Lançamento pendente'}</span>
                        </div>
                        <div className="commitment-value-group">
                          <strong className={item.type === 'receita' ? 'is-income' : ''}>{formatCurrency(item.amountCents)}</strong>
                          {item.sourceType === 'recurring' && <button type="button" className="text-button" onClick={() => handleGenerateRecurringOccurrences({ recurringId: item.recurringId, recurringOccurrenceDate: item.recurringOccurrenceDate })}>Gerar lançamento</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>}
              </section>
            </div>

            <section className="dashboard-section dashboard-recurring-section">
              <RecurringManager
                recurring={filteredRecurring}
                accounts={accounts}
                categories={categories}
                formatCurrency={formatCurrency}
                onAdd={handleAddRecurring}
                onToggle={handleToggleRecurring}
                onDelete={handleDeleteRecurring}
              />
            </section>
          </div>
        )}

        {/* 2. ABA LANÇAMENTOS */}
        {activeTab === 'transactions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="section-title">Histórico ({profileMode})</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  📥 Importar
                </button>
                <button
                  onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
                  className="btn-primary"
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  + Novo Lançamento
                </button>
              </div>
            </div>

            <TransactionFeed
              transactions={filteredTransactions}
              accounts={[...accounts, ...cards]}
              categories={categories}
              advancedFilters={true}
              formatCurrency={formatCurrency}
              onEditTransaction={(t) => { setEditingTransaction(t); setIsModalOpen(true); }}
              onDeleteTransaction={handleDeleteTransaction}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        )}

        {/* 3. ABA CARTÕES E FATURAS */}
        {activeTab === 'invoices' && (
          <div>{primaryCard && currentInvoice ? <InvoiceCycleCard card={primaryCard} invoice={currentInvoice} formatCurrency={formatCurrency} onPayInvoice={handlePayInvoice} /> : <div className="summary-card" style={{padding:'24px',display:'block'}}><h3 className="section-title">Nenhum cartão cadastrado</h3><p style={{color:'var(--text-secondary)',fontSize:'13px'}}>Cadastre um cartão antes de consultar faturas. O Razão não exibirá mais um cartão fictício como se fosse seu.</p></div>}</div>
        )}

        {/* 4. ABA LIMITES & ORÇAMENTO */}
        {activeTab === 'budget' && (
          <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px', gap: '18px' }}>
            <div>
              <h3 className="section-title" style={{ marginBottom: '8px' }}>Orçamento por categoria</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Defina limites mensais e acompanhe os gastos registrados. Os valores são calculados a partir dos lançamentos locais.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (!budgetCategoryId || budgetAmount.trim() === '') return; const parsedBudget = parseMoneyInputToCents(budgetAmount); if (!parsedBudget.valid) { alert(parsedBudget.reason || 'Informe um valor monetário válido.'); return; } const cents = parsedBudget.cents; const monthKey = todayISO.slice(0,7); setState(prev => { const key = `${profileMode}:${budgetCategoryId}:${monthKey}`; const oldLimit = budgetForMonth(prev.budgets, budgetCategoryId, monthKey, profileMode); const budgets = setCategoryBudget(prev.budgets, budgetCategoryId, monthKey, cents, profileMode); const event = createAuditEvent({ eventId: uid(), timestamp: new Date().toISOString(), action: 'budget_limit_set', entityType: 'budget', entityId: key, profileType: profileMode, before: oldLimit === null ? null : { id: key, categoryId: budgetCategoryId, monthKey, amountCents: oldLimit, profileType: profileMode }, after: { id: key, categoryId: budgetCategoryId, monthKey, amountCents: cents, profileType: profileMode }, metadata: { categoryId: budgetCategoryId, monthKey, amountCents: cents } }); return { ...prev, budgets, auditLog: appendAuditEvent(prev.auditLog, event) }; }); setBudgetAmount(''); }} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'12px', alignItems:'end' }}>
              <label style={{display:'grid',gap:'6px',fontSize:'12px',color:'var(--text-secondary)'}}>Categoria de despesa<select value={budgetCategoryId} onChange={e=>setBudgetCategoryId(e.target.value)} required style={{padding:'12px',borderRadius:'10px',background:'var(--surface-subtle)',color:'var(--text-primary)',border:'1px solid var(--border-card)'}}><option value="">Selecione...</option>{categories.filter(c=>c.type==='despesa').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label style={{display:'grid',gap:'6px',fontSize:'12px',color:'var(--text-secondary)'}}>Limite mensal (R$)<input value={budgetAmount} onChange={e=>setBudgetAmount(e.target.value)} inputMode="decimal" placeholder="Ex.: 450,00" required style={{padding:'12px',borderRadius:'10px',background:'var(--surface-subtle)',color:'var(--text-primary)',border:'1px solid var(--border-card)'}} /></label>
              <button className="btn-primary" type="submit" style={{padding:'12px 16px'}}>Salvar limite</button>
            </form>
            <div style={{display:'grid',gap:'12px'}}>
              {categories.filter(c=>c.type==='despesa').map(category=>{ const limit=budgetForMonth(state.budgets,category.id,todayISO.slice(0,7),profileMode); const spent=filteredTransactions.filter(t=>t.type==='despesa'&&t.date?.slice(0,7)===todayISO.slice(0,7)&&t.categoryId===category.id).reduce((sum,t)=>sum+(t.amountCents||0),0); const pct=limit>0?Math.min(100,spent/limit*100):0; return <div key={category.id} style={{padding:'14px',border:'1px solid var(--border-card)',borderRadius:'12px',display:'grid',gap:'8px'}}><div style={{display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}><strong>{category.name}</strong><span style={{fontSize:'13px',color:'var(--text-secondary)'}}>{formatCurrency(spent)} gastos {limit===null?'· sem limite':`de ${formatCurrency(limit)}`}</span></div>{limit!==null&&<><div style={{height:'8px',background:'var(--surface-subtle)',borderRadius:'999px',overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:spent>limit?'#ef4444':'var(--brand-accent)',borderRadius:'999px'}} /></div><div style={{fontSize:'12px',color:spent>limit?'#ef4444':'var(--text-secondary)'}}>{limit===0?(spent>0?'Limite de R$ 0,00 ultrapassado':'Limite definido em R$ 0,00'):spent>limit?`Limite ultrapassado em ${formatCurrency(spent-limit)}`:`${Math.round(spent/limit*100)}% utilizado`}</div><button type="button" onClick={()=>{ const monthKey=todayISO.slice(0,7); setState(prev=>{ const key=`${profileMode}:${category.id}:${monthKey}`; const oldLimit=budgetForMonth(prev.budgets,category.id,monthKey,profileMode); if(oldLimit===null)return prev; const budgets=setCategoryBudget(prev.budgets,category.id,monthKey,null,profileMode); const event=createAuditEvent({eventId:uid(),timestamp:new Date().toISOString(),action:'budget_limit_removed',entityType:'budget',entityId:key,profileType:profileMode,before:{id:key,categoryId:category.id,monthKey,amountCents:oldLimit,profileType:profileMode},metadata:{categoryId:category.id,monthKey,amountCents:oldLimit}}); return {...prev,budgets,auditLog:appendAuditEvent(prev.auditLog,event)}; }); }} style={{justifySelf:'start',border:0,background:'transparent',color:'var(--text-secondary)',cursor:'pointer',fontSize:'12px'}}>Remover limite</button></>}</div>})}
            </div>
          </div>
        )}

        {/* 5. ABA GRÁFICOS & MÉTRICAS */}
        {activeTab === 'analytics' && (
          <div>
            <FinancialCharts
              transactions={filteredTransactions}
              categories={categories}
              formatCurrency={formatCurrency}
              hideAmounts={hideAmounts}
            />
            <ExpenseAnalytics
              transactions={filteredTransactions}
              categories={categories}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* 6. ABA IA RAZÃO & CENÁRIOS (FASE 7) */}
        {activeTab === 'ai_predictive' && (
          <AIPredictivePanel
            state={{ ...state, transactions: filteredTransactions, accounts, categories, cards, recurring: filteredRecurring, profileType: profileMode }}
            formatCurrency={formatCurrency}
            initialPrompt={aiQuickQuestion}
            onPromptConsumed={() => setAIQuickQuestion('')}
            profileMode={profileMode}
            key={profileMode}
          />
        )}

        {/* 7. ABA EXTRATOR & OPEN FINANCE */}
        {activeTab === 'importer' && (
          <div className="summary-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span className="module-icon-mark" aria-hidden="true">⇩</span>
              <div>
                <h3 className="section-title">Extrator Multiformato & Conciliação</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Importe arquivos OFX, CSV ou texto de comprovantes para análise local. A opção bancária disponível é demonstrativa; não há conexão real com instituições financeiras.
                </p>
              </div>
            </div>

            <button className="btn-primary" onClick={() => setIsImportModalOpen(true)}>
              Abrir Importador e Extrator de Comprovantes
            </button>
          </div>
        )}

        {activeTab === 'audit' && <AuditHistoryPanel auditLog={state.auditLog || []} profileMode={profileMode} />}
        {activeTab === 'integrity' && <AuditIntegrityPanel state={{ ...state, accounts, categories, cards }} profileMode={profileMode} />}

        {/* 8. ABA CONQUISTAS & PERFIL DO USUÁRIO */}
        {activeTab === 'profile' && (
          <UserProfilePanel
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            transactions={filteredTransactions}
            accounts={accounts}
            categories={categories}
            budgets={state.budgets || {}}
            commitments={commitments}
          />
        )}

        {/* 9. ABA PERSONALIZAÇÃO & AJUSTES */}
        {activeTab === 'settings' && (
          <PersonalizationPanel settings={state.settings || {}} onSaveSettings={(settings) => setState(prev => ({...prev, settings}))} />
        )}

        {/* Modais Acessíveis */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
          accounts={accounts}
          categories={categories}
          initialData={editingTransaction}
        />

        <AccountBalanceReconciliationModal
          isOpen={isBalanceReconciliationOpen}
          onClose={() => setIsBalanceReconciliationOpen(false)}
          accounts={accounts}
          transactions={filteredTransactions}
          categories={categories}
          profileType={profileMode}
          onApplyAdjustment={handleApplyBalanceAdjustment}
          formatCurrency={formatCurrency}
        />

        <ImportReconciliationModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          existingTransactions={filteredTransactions}
          accounts={accounts}
          categories={categories}
          profileType={profileMode}
          formatCurrency={formatCurrency}
          onImportConfirmed={handleImportConfirmed}
        />

        <DiagnosticModal
          isOpen={isDiagnosticModalOpen}
          onClose={() => setIsDiagnosticModalOpen(false)}
          state={{ ...state, userProfile }}
          onRestoreBackup={handleRestoreBackup}
        />
      </AppShell>)}
      {bootError && (
        <StartupRecoveryScreen
          error={bootError}
          backups={bootRecoveryBackups}
          isDesktop={Boolean(window.electronAPI?.isDesktop)}
          busyId={bootRecoveryBusyId}
          message={bootRecoveryMessage}
          onRetry={handleRetryStartupRead}
          onRestoreBackup={handleRestoreStartupBackup}
          onImportBackup={handleImportStartupBackup}
        />
      )}
    </>
  );
}
