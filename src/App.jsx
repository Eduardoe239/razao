import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import {
  Utensils, Car, Home, Gamepad2, HeartPulse, GraduationCap, Repeat,
  ShoppingBag, MoreHorizontal, Wallet, Briefcase, TrendingUp, Plus, X,
  Trash2, Pencil, Target, LayoutGrid, List, LineChart as LineChartIcon,
  Settings, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2,
  Sparkles, BookOpen, Landmark, CreditCard, PiggyBank, Search, Download,
  Upload, Bell, Gauge, ArrowUpRight, ArrowDownRight, Layers, Clock, Check,
  Tag, Star, Coffee, Book, Plane, Dumbbell, Gift, Music, Smartphone, PawPrint,
} from "lucide-react";

/* ---------------------------------- tema ---------------------------------- */
const C = {
  bg: "#0e1a15",
  bgDeep: "#0a1410",
  surface: "#152420",
  surfaceRaised: "#1b2e27",
  border: "#2a3f34",
  borderSoft: "#213229",
  gold: "#c9a227",
  goldSoft: "#dbc06a",
  sage: "#5a9678",
  sageSoft: "#7fb397",
  brick: "#bd4f3f",
  brickSoft: "#d97e6f",
  text: "#eee7d3",
  textMuted: "#9caa9a",
  textFaint: "#6c7d6d",
};

const CATS = [
  { id: "alimentacao", label: "Alimentação", icon: Utensils, color: "#c9a227" },
  { id: "transporte", label: "Transporte", icon: Car, color: "#5a9678" },
  { id: "moradia", label: "Moradia", icon: Home, color: "#7c9cbf" },
  { id: "lazer", label: "Lazer", icon: Gamepad2, color: "#bd4f3f" },
  { id: "saude", label: "Saúde", icon: HeartPulse, color: "#d98e5d" },
  { id: "educacao", label: "Educação", icon: GraduationCap, color: "#8c7bc9" },
  { id: "assinaturas", label: "Assinaturas", icon: Repeat, color: "#5da3a0" },
  { id: "compras", label: "Compras", icon: ShoppingBag, color: "#c97e9e" },
  { id: "outros", label: "Outros", icon: MoreHorizontal, color: "#9aa08f" },
];
const REC_CATS = [
  { id: "salario", label: "Salário", icon: Briefcase, color: "#c9a227" },
  { id: "freelance", label: "Freelance/Extra", icon: Sparkles, color: "#5a9678" },
  { id: "investimentos", label: "Investimentos", icon: TrendingUp, color: "#7c9cbf" },
  { id: "outros_receita", label: "Outros", icon: Wallet, color: "#9aa08f" },
];
const NECESSITY = {
  necessario: { label: "NECESSÁRIO", color: C.sage },
  neutro: { label: "PODERIA EVITAR", color: C.gold },
  desnecessario: { label: "DESNECESSÁRIO", color: C.brick },
};
const ACCOUNT_TYPES = [
  { id: "carteira", label: "Carteira", icon: Wallet },
  { id: "conta", label: "Conta corrente", icon: Landmark },
  { id: "cartao", label: "Cartão de crédito", icon: CreditCard },
  { id: "poupanca", label: "Poupança", icon: PiggyBank },
];
const ICON_LIBRARY = { Tag, Star, Coffee, Book, Plane, Dumbbell, Gift, Music, Smartphone, PawPrint };
const ICON_CHOICES = Object.keys(ICON_LIBRARY);
const SWATCHES = ["#c9a227", "#5a9678", "#7c9cbf", "#bd4f3f", "#d98e5d", "#8c7bc9", "#5da3a0", "#c97e9e", "#9aa08f", "#d9a5c8"];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
// Data local do usuário — NUNCA toISOString() aqui: ele converte pra UTC e,
// em fusos atrás de UTC (ex.: Brasil), pode devolver o dia seguinte à noite.
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const monthKey = (iso) => iso.slice(0, 7);
const brl = (n) =>
  (n < 0 ? "-" : "") +
  "R$ " +
  Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLabel = (key) => {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
};
function addMonths(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
function allGastoCats(customCategories) {
  return [...CATS, ...customCategories.map((c) => ({ ...c, icon: ICON_LIBRARY[c.iconName] || Tag }))];
}
function catInfo(id, isIncome, customCategories = []) {
  if (isIncome) return REC_CATS.find((c) => c.id === id) || REC_CATS[REC_CATS.length - 1];
  const found = CATS.find((c) => c.id === id);
  if (found) return found;
  const custom = customCategories.find((c) => c.id === id);
  if (custom) return { ...custom, icon: ICON_LIBRARY[custom.iconName] || Tag };
  return CATS[CATS.length - 1];
}
function accInfo(id, accounts) {
  return accounts.find((a) => a.id === id) || { id, name: "Conta removida", type: "carteira", color: C.textFaint, initialBalance: 0 };
}
function accountBalance(accountId, transactions, initialBalance) {
  let bal = initialBalance;
  transactions.forEach((t) => {
    if (t.accountId !== accountId || t.status !== "pago") return;
    bal += t.type === "receita" ? t.amount : -t.amount;
  });
  return bal;
}
function csvEscape(s) {
  return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
}
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------- ui base ------------------------------- */

function Stamp({ value, size = "sm" }) {
  const info = NECESSITY[value];
  if (!info) return null;
  const small = size === "sm";
  return (
    <span
      style={{
        display: "inline-block",
        transform: "rotate(-5deg)",
        border: `2px solid ${info.color}`,
        color: info.color,
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.06em",
        borderRadius: 4,
        padding: small ? "1px 6px" : "3px 10px",
        fontSize: small ? 9 : 11,
        opacity: 0.9,
        whiteSpace: "nowrap",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      {info.label}
    </span>
  );
}
function Card({ children, style, className = "" }) {
  return (
    <div className={className} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}
function StatBlock({ label, value, sub, accent }) {
  return (
    <Card style={{ padding: "16px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.08em", color: C.textFaint, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 24, fontWeight: 600, color: accent || C.text, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}
function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <Icon size={14} /> {children}
      </div>
      {right}
    </div>
  );
}
const selectStyle = { background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "8px 10px", fontSize: 13 };
const iconBtnStyle = { background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", padding: 5, borderRadius: 5, display: "flex" };
const dangerBtnStyle = { background: C.brick, color: "#fff", border: "none", borderRadius: 7, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const primaryBtnStyle = { background: C.gold, color: C.bgDeep, border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const ghostBtnStyle = { background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };

function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
      <div style={{ color: d.color, fontWeight: 600 }}>{d.label}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{brl(d.value)}</div>
    </div>
  );
}
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
      <div style={{ color: C.textMuted, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => p.value != null && (
        <div key={p.name} style={{ color: p.color, fontFamily: "'IBM Plex Mono', monospace" }}>
          {p.name}: {brl(p.value)}
        </div>
      ))}
    </div>
  );
}

function ModalSheet({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(6,12,9,0.7)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 40 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderBottom: "none", borderRadius: "14px 14px 0 0", width: "100%", maxWidth, padding: 20, maxHeight: "88vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600 }}>{title}</span>
          <button type="button" onClick={onClose} style={iconBtnStyle}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FieldLabel({ children }) {
  return <div style={{ fontSize: 11.5, color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.05em", margin: "10px 0 5px" }}>{children}</div>;
}
const fullInput = { width: "100%", background: C.bgDeep, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: "10px 11px", fontSize: 13.5, marginBottom: 4 };

/* --------------------------------- app --------------------------------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("painel");
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState({});
  const [profileName, setProfileName] = useState("Meu razão");
  const [accounts, setAccounts] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [monthCursor, setMonthCursor] = useState(monthKey(todayISO()));

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [showSavingsForm, setShowSavingsForm] = useState(false);

  const [filterCat, setFilterCat] = useState("todas");
  const [filterNec, setFilterNec] = useState("todas");
  const [filterAcc, setFilterAcc] = useState("todas");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  const loaded = useRef(false);
  const recurGenRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("financas:data", false);
        if (res && res.value) {
          const p = JSON.parse(res.value);
          let accs = p.accounts && p.accounts.length ? p.accounts : null;
          let txs = p.transactions || [];
          if (!accs) {
            const def = { id: uid(), name: "Carteira", type: "carteira", color: "#c9a227", initialBalance: 0 };
            accs = [def];
            txs = txs.map((t) => (t.accountId ? t : { ...t, accountId: def.id }));
          }
          setTransactions(txs);
          setGoals(p.goals || {});
          setProfileName(p.profileName || "Meu razão");
          setAccounts(accs);
          setRecurring(p.recurring || []);
          setSavingsGoals(p.savingsGoals || []);
          setCustomCategories(p.customCategories || []);
        } else {
          setAccounts([{ id: uid(), name: "Carteira", type: "carteira", color: "#c9a227", initialBalance: 0 }]);
        }
      } catch (e) {
        setAccounts([{ id: uid(), name: "Carteira", type: "carteira", color: "#c9a227", initialBalance: 0 }]);
      } finally {
        loaded.current = true;
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    (async () => {
      try {
        await window.storage.set("financas:data", JSON.stringify({ transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories }), false);
      } catch (e) {
        console.error("falha ao salvar", e);
      }
    })();
  }, [transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories]);

  // gera lançamentos recorrentes do mês atual, uma única vez por sessão
  useEffect(() => {
    if (loading || recurGenRef.current) return;
    recurGenRef.current = true;
    const todayKey = monthKey(todayISO());
    const todayDay = new Date().getDate();
    setTransactions((prev) => {
      const additions = [];
      recurring.forEach((r) => {
        if (!r.active) return;
        const already = prev.some((t) => t.recurringId === r.id && monthKey(t.date) === todayKey);
        if (already) return;
        const day = Math.min(r.dayOfMonth || 1, 28);
        const dateStr = `${todayKey}-${String(day).padStart(2, "0")}`;
        additions.push({
          id: uid(), type: r.type, date: dateStr, desc: r.desc, amount: r.amount,
          category: r.category, necessity: r.type === "gasto" ? (r.necessity || "necessario") : undefined,
          notes: "Gerado automaticamente pela recorrência", accountId: r.accountId,
          status: day <= todayDay ? "pago" : "pendente", recurringId: r.id,
        });
      });
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [loading, recurring]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  /* ---- transações ---- */
  function saveTransaction(payload) {
    const { installments, ...tx } = payload;
    if (tx.id) {
      // Mescla por cima do lançamento existente — nunca substitui o objeto inteiro.
      // Assim, campos que o formulário não edita diretamente (recurringId,
      // installmentGroup/Index/Total) sobrevivem à edição.
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? { ...t, ...tx } : t)));
      showToast("Lançamento atualizado.");
    } else if (installments && installments > 1) {
      const total = tx.amount;
      const base = Math.floor((total / installments) * 100) / 100;
      const remainder = Math.round((total - base * installments) * 100) / 100;
      const group = uid();
      const today = todayISO();
      const news = [];
      for (let i = 0; i < installments; i++) {
        const date = addMonths(tx.date, i);
        const amount = i === installments - 1 ? Math.round((base + remainder) * 100) / 100 : base;
        news.push({
          ...tx, id: uid(), date, amount,
          desc: `${tx.desc || catInfo(tx.category, false).label} (${i + 1}/${installments})`,
          status: date <= today ? "pago" : "pendente",
          installmentGroup: group, installmentIndex: i + 1, installmentTotal: installments,
        });
      }
      setTransactions((prev) => [...prev, ...news]);
      showToast(`${installments} parcelas lançadas.`);
    } else {
      setTransactions((prev) => [...prev, { ...tx, id: uid() }]);
      showToast("Lançamento adicionado.");
    }
    setShowForm(false);
    setEditing(null);
  }
  function deleteTransaction(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    showToast("Lançamento removido.");
  }
  function togglePaid(id) {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, status: t.status === "pago" ? "pendente" : "pago" } : t)));
  }

  /* ---- contas ---- */
  function saveAccount(acc) {
    if (acc.id) {
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? acc : a)));
      showToast("Conta atualizada.");
    } else {
      setAccounts((prev) => [...prev, { ...acc, id: uid() }]);
      showToast("Conta criada.");
    }
    setShowAccountForm(false);
    setEditingAccount(null);
  }
  function deleteAccount(id) {
    if (accounts.length <= 1) { showToast("Você precisa manter ao menos uma conta."); return; }
    if (transactions.some((t) => t.accountId === id)) { showToast("Essa conta tem lançamentos — apague-os ou migre-os antes."); return; }
    if (recurring.some((r) => r.accountId === id)) { showToast("Essa conta tem recorrências vinculadas — apague-as ou migre-as antes."); return; }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast("Conta removida.");
  }

  /* ---- recorrências ---- */
  function saveRecurring(r) {
    if (r.id) {
      setRecurring((prev) => prev.map((x) => (x.id === r.id ? r : x)));
      showToast("Recorrência atualizada.");
    } else {
      setRecurring((prev) => [...prev, { ...r, id: uid() }]);
      showToast("Recorrência criada.");
    }
    setShowRecurringForm(false);
    setEditingRecurring(null);
  }
  function deleteRecurring(id) {
    setRecurring((prev) => prev.filter((r) => r.id !== id));
    showToast("Recorrência removida.");
  }
  function toggleRecurringActive(id) {
    setRecurring((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }
  function launchRecurringNow(r) {
    const key = monthCursor;
    const already = transactions.some((t) => t.recurringId === r.id && monthKey(t.date) === key);
    if (already) { showToast("Já lançado neste mês."); return; }
    const day = Math.min(r.dayOfMonth || 1, 28);
    const date = `${key}-${String(day).padStart(2, "0")}`;
    setTransactions((prev) => [...prev, {
      id: uid(), type: r.type, date, desc: r.desc, amount: r.amount, category: r.category,
      necessity: r.type === "gasto" ? (r.necessity || "necessario") : undefined,
      notes: "Gerado manualmente a partir da recorrência", accountId: r.accountId,
      status: date <= todayISO() ? "pago" : "pendente", recurringId: r.id,
    }]);
    showToast("Lançamento gerado.");
  }

  /* ---- metas de poupança ---- */
  function saveSavingsGoal(g) {
    if (g.id) setSavingsGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)));
    else setSavingsGoals((prev) => [...prev, { ...g, id: uid(), saved: 0 }]);
    setShowSavingsForm(false);
    showToast("Meta salva.");
  }
  function deleteSavingsGoal(id) {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
    showToast("Meta removida.");
  }
  function contributeSavings(id, delta) {
    setSavingsGoals((prev) => prev.map((g) => (g.id === id ? { ...g, saved: Math.max(0, Math.round((g.saved + delta) * 100) / 100) } : g)));
  }

  /* ---- categorias personalizadas ---- */
  function addCustomCategory(cat) {
    setCustomCategories((prev) => [...prev, { ...cat, id: "custom_" + uid() }]);
    showToast("Categoria criada.");
  }
  function removeCustomCategory(id) {
    if (transactions.some((t) => t.category === id) || Object.prototype.hasOwnProperty.call(goals, id)) {
      showToast("Categoria em uso em lançamentos/metas — remova-os primeiro.");
      return;
    }
    if (recurring.some((r) => r.category === id)) {
      showToast("Categoria em uso numa recorrência — remova ou migre-a primeiro.");
      return;
    }
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
    showToast("Categoria removida.");
  }

  /* ---- import / export ---- */
  function exportCSV() {
    const header = ["data", "tipo", "descricao", "categoria", "conta", "valor", "necessidade", "status", "notas"];
    const rows = transactions.map((t) => [
      t.date, t.type, csvEscape(t.desc), catInfo(t.category, t.type === "receita", customCategories).label,
      accInfo(t.accountId, accounts).name, t.amount.toFixed(2).replace(".", ","),
      t.necessity ? NECESSITY[t.necessity].label : "", t.status || "pago", csvEscape(t.notes),
    ].join(";"));
    downloadFile([header.join(";"), ...rows].join("\n"), `lancamentos-${monthCursor}.csv`, "text/csv;charset=utf-8");
    showToast("CSV exportado.");
  }
  function exportBackup() {
    downloadFile(JSON.stringify({ transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories }, null, 2), "backup-financas.json", "application/json");
    showToast("Backup exportado.");
  }
  function importBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setTransactions(data.transactions || []);
        setGoals(data.goals || {});
        setProfileName(data.profileName || profileName);
        setAccounts(data.accounts && data.accounts.length ? data.accounts : accounts);
        setRecurring(data.recurring || []);
        setSavingsGoals(data.savingsGoals || []);
        setCustomCategories(data.customCategories || []);
        showToast("Backup importado.");
      } catch (err) {
        showToast("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* --------- derivações --------- */
  const monthTx = useMemo(() => transactions.filter((t) => monthKey(t.date) === monthCursor), [transactions, monthCursor]);
  const gastosMes = monthTx.filter((t) => t.type === "gasto");
  const receitasMes = monthTx.filter((t) => t.type === "receita");
  // "Comprometido" = tudo do mês, pago + pendente (o que já está decidido acontecer).
  const totalGasto = gastosMes.reduce((s, t) => s + t.amount, 0);
  const totalReceita = receitasMes.reduce((s, t) => s + t.amount, 0);
  // "Realizado" = só o que já foi efetivamente pago/recebido — é o dinheiro que
  // de fato já mudou de mão. "Previsto" soma o que ainda está pendente no mês.
  const gastoRealizado = gastosMes.filter((t) => t.status === "pago").reduce((s, t) => s + t.amount, 0);
  const receitaRealizada = receitasMes.filter((t) => t.status === "pago").reduce((s, t) => s + t.amount, 0);
  const gastoPendenteMes = totalGasto - gastoRealizado;
  const receitaPendenteMes = totalReceita - receitaRealizada;
  const saldoRealizado = receitaRealizada - gastoRealizado;
  const saldoPrevisto = totalReceita - totalGasto;
  const pendentes = monthTx.filter((t) => t.status === "pendente").sort((a, b) => (a.date > b.date ? 1 : -1));

  const porCategoria = useMemo(() => {
    const map = {};
    gastosMes.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).map(([id, value]) => ({ id, value, ...catInfo(id, false, customCategories) })).sort((a, b) => b.value - a.value);
  }, [gastosMes, customCategories]);

  const porNecessidade = useMemo(() => {
    const map = { necessario: 0, neutro: 0, desnecessario: 0 };
    gastosMes.forEach((t) => { map[t.necessity] = (map[t.necessity] || 0) + t.amount; });
    return Object.entries(map).map(([id, value]) => ({ id, value, ...NECESSITY[id] }));
  }, [gastosMes]);

  const last6Months = useMemo(() => {
    const keys = [];
    const [y, m] = monthCursor.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return keys.map((key) => {
      const txs = transactions.filter((t) => monthKey(t.date) === key);
      const gasto = txs.filter((t) => t.type === "gasto").reduce((s, t) => s + t.amount, 0);
      const receita = txs.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
      return { key, label: monthLabel(key), gasto, receita };
    });
  }, [transactions, monthCursor]);

  const mesAnterior = last6Months[last6Months.length - 2];
  const mesAtualStats = last6Months[last6Months.length - 1];
  const deltaGasto = mesAnterior && mesAnterior.gasto > 0 ? ((mesAtualStats.gasto - mesAnterior.gasto) / mesAnterior.gasto) * 100 : null;
  const deltaReceita = mesAnterior && mesAnterior.receita > 0 ? ((mesAtualStats.receita - mesAnterior.receita) / mesAnterior.receita) * 100 : null;

  const previsao = useMemo(() => {
    const withData = last6Months.filter((m) => m.gasto > 0);
    const base = withData.slice(-3);
    if (base.length === 0) return null;
    const media = base.reduce((s, m) => s + m.gasto, 0) / base.length;
    const trend = base.length >= 2 ? base[base.length - 1].gasto - base[0].gasto : 0;
    return { valor: Math.max(0, media + trend * 0.3), media };
  }, [last6Months]);

  const previsaoChart = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
    return [...last6Months.map((m) => ({ label: m.label, real: m.gasto, previsto: null })), { label: monthLabel(nextKey) + " *", real: null, previsto: previsao ? previsao.valor : null }];
  }, [last6Months, previsao, monthCursor]);

  const patrimonioEvolucao = useMemo(() => {
    const startBalance = accounts.reduce((s, a) => s + a.initialBalance, 0);
    return last6Months.map((m) => {
      const endOfMonth = m.key + "-31";
      const acumulado = transactions
        .filter((t) => t.status === "pago" && t.date <= endOfMonth)
        .reduce((s, t) => s + (t.type === "receita" ? t.amount : -t.amount), startBalance);
      return { label: m.label, saldo: acumulado };
    });
  }, [transactions, last6Months, accounts]);

  const necessarioPct = totalGasto > 0 ? Math.round(((porNecessidade.find((n) => n.id === "necessario")?.value || 0) / totalGasto) * 100) : 0;
  const desnecessarioPct = totalGasto > 0 ? Math.round(((porNecessidade.find((n) => n.id === "desnecessario")?.value || 0) / totalGasto) * 100) : 0;

  const healthScore = useMemo(() => {
    const savingsRate = receitaRealizada > 0 ? Math.max(0, Math.min(1, saldoRealizado / receitaRealizada)) : (saldoRealizado >= 0 ? 0.5 : 0);
    const necScore = necessarioPct / 100;
    const goalEntries = Object.entries(goals).filter(([, v]) => v > 0);
    const goalScore = goalEntries.length === 0 ? 0.6 : goalEntries.filter(([cat, limit]) => (porCategoria.find((c) => c.id === cat)?.value || 0) <= limit).length / goalEntries.length;
    const score = Math.round((savingsRate * 0.4 + necScore * 0.3 + goalScore * 0.3) * 100);
    let label = "Crítico", color = C.brick;
    if (score >= 75) { label = "Ótimo"; color = C.sage; }
    else if (score >= 50) { label = "Bom"; color = C.goldSoft; }
    else if (score >= 30) { label = "Atenção"; color = C.brickSoft; }
    return { score, label, color };
  }, [receitaRealizada, saldoRealizado, necessarioPct, goals, porCategoria]);

  const totalPatrimonio = useMemo(() => accounts.reduce((s, a) => s + accountBalance(a.id, transactions, a.initialBalance), 0), [accounts, transactions]);

  const allCatsGasto = useMemo(() => allGastoCats(customCategories), [customCategories]);

  const filteredTx = useMemo(() => {
    const src = search.trim() ? transactions : monthTx;
    return src
      .filter((t) => filterCat === "todas" || t.category === filterCat)
      .filter((t) => filterNec === "todas" || t.necessity === filterNec)
      .filter((t) => filterAcc === "todas" || t.accountId === filterAcc)
      .filter((t) => !search.trim() || (t.desc || "").toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, monthTx, filterCat, filterNec, filterAcc, search]);

  function shiftMonth(delta) {
    const [y, m] = monthCursor.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const TABS = [
    { id: "painel", label: "Painel", icon: LayoutGrid },
    { id: "transacoes", label: "Lançamentos", icon: List },
    { id: "contas", label: "Contas", icon: Landmark },
    { id: "recorrencias", label: "Recorrências", icon: Repeat },
    { id: "metas", label: "Metas", icon: Target },
    { id: "analises", label: "Análises", icon: LineChartIcon },
    { id: "config", label: "Ajustes", icon: Settings },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>abrindo o razão…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::selection { background: ${C.gold}44; }
        input, select, textarea { font-family: 'IBM Plex Sans', sans-serif; }
        input:focus, select:focus, textarea:focus, button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 1px; }
        .fade-in { animation: fadeIn .35s ease both; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .fade-in { animation: none; } }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        .navbtn:hover { background: ${C.surfaceRaised} !important; }
        .rowhover:hover { background: ${C.surfaceRaised}; }
        .card-hover:hover { border-color: ${C.gold}55 !important; }
      `}</style>

      <nav style={{ display: "flex", overflowX: "auto", borderBottom: `1px solid ${C.border}`, background: C.bgDeep, position: "sticky", top: 0, zIndex: 20 }} className="scrollbar-thin">
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
          <BookOpen size={18} color={C.gold} />
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16 }}>{profileName}</span>
        </div>
        <div style={{ display: "flex" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="navbtn"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "14px 16px",
                  background: active ? C.surface : "transparent", border: "none",
                  borderBottom: active ? `2px solid ${C.gold}` : "2px solid transparent",
                  color: active ? C.text : C.textMuted, cursor: "pointer", fontSize: 13,
                  fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "20px 16px 100px" }} className="fade-in" key={tab}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => shiftMonth(-1)} style={{ ...ghostBtnStyle, padding: "6px 8px" }}><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, minWidth: 80, textAlign: "center" }}>{monthLabel(monthCursor)}</span>
            <button onClick={() => shiftMonth(1)} style={{ ...ghostBtnStyle, padding: "6px 8px" }}><ChevronRight size={16} /></button>
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} style={{ ...primaryBtnStyle, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={16} /> Novo lançamento
          </button>
        </div>

        {tab === "painel" && (
          <PainelTab
            totalGasto={totalGasto} totalReceita={totalReceita}
            saldoRealizado={saldoRealizado} saldoPrevisto={saldoPrevisto}
            gastoPendenteMes={gastoPendenteMes} receitaPendenteMes={receitaPendenteMes}
            porCategoria={porCategoria} necessarioPct={necessarioPct} desnecessarioPct={desnecessarioPct}
            gastosMes={gastosMes} previsao={previsao} healthScore={healthScore}
            deltaGasto={deltaGasto} deltaReceita={deltaReceita}
            transactions={filteredTx.slice(0, 5)} accounts={accounts} customCategories={customCategories}
            onEdit={(t) => { setEditing(t); setShowForm(true); }} onDelete={deleteTransaction}
            hasAny={transactions.length > 0}
            pendentes={pendentes} onTogglePaid={togglePaid}
          />
        )}

        {tab === "transacoes" && (
          <TransacoesTab
            transactions={filteredTx} accounts={accounts} customCategories={customCategories}
            filterCat={filterCat} setFilterCat={setFilterCat}
            filterNec={filterNec} setFilterNec={setFilterNec}
            filterAcc={filterAcc} setFilterAcc={setFilterAcc}
            search={search} setSearch={setSearch}
            onEdit={(t) => { setEditing(t); setShowForm(true); }} onDelete={deleteTransaction} onTogglePaid={togglePaid}
          />
        )}

        {tab === "contas" && (
          <ContasTab
            accounts={accounts} transactions={transactions} totalPatrimonio={totalPatrimonio}
            onAdd={() => { setEditingAccount(null); setShowAccountForm(true); }}
            onEdit={(a) => { setEditingAccount(a); setShowAccountForm(true); }}
            onDelete={deleteAccount}
          />
        )}

        {tab === "recorrencias" && (
          <RecorrenciasTab
            recurring={recurring} accounts={accounts} customCategories={customCategories}
            onAdd={() => { setEditingRecurring(null); setShowRecurringForm(true); }}
            onEdit={(r) => { setEditingRecurring(r); setShowRecurringForm(true); }}
            onDelete={deleteRecurring} onToggle={toggleRecurringActive} onLaunch={launchRecurringNow}
          />
        )}

        {tab === "metas" && (
          <MetasTab
            goals={goals} setGoals={setGoals} porCategoria={porCategoria} allCatsGasto={allCatsGasto}
            savingsGoals={savingsGoals} onAddSavings={() => setShowSavingsForm(true)}
            onContribute={contributeSavings} onDeleteSavings={deleteSavingsGoal}
          />
        )}

        {tab === "analises" && (
          <AnalisesTab
            last6Months={last6Months} previsaoChart={previsaoChart} previsao={previsao}
            porNecessidade={porNecessidade} totalGasto={totalGasto} patrimonioEvolucao={patrimonioEvolucao}
          />
        )}

        {tab === "config" && (
          <ConfigTab
            profileName={profileName} setProfileName={setProfileName}
            transactionsCount={transactions.length}
            onWipe={async () => {
              const freshAccount = { id: uid(), name: "Carteira", type: "carteira", color: "#c9a227", initialBalance: 0 };
              setTransactions([]); setGoals({}); setRecurring([]); setSavingsGoals([]); setCustomCategories([]);
              setAccounts([freshAccount]); setProfileName("Meu razão");
              try { await window.storage.delete("financas:data", false); } catch (e) { /* segue mesmo se a chave não existir */ }
              showToast("Todos os dados foram apagados — contas e perfil inclusos.");
            }}
            customCategories={customCategories} onAddCategory={addCustomCategory} onRemoveCategory={removeCustomCategory}
            onExportCSV={exportCSV} onExportBackup={exportBackup} onImport={importBackup} fileInputRef={fileInputRef}
          />
        )}
      </main>

      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.surfaceRaised, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 16px", fontSize: 13, color: C.text, zIndex: 50, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={14} color={C.sage} /> {toast}
        </div>
      )}

      {showForm && (
        <TxForm initial={editing} accounts={accounts} customCategories={customCategories} onClose={() => { setShowForm(false); setEditing(null); }} onSave={saveTransaction} />
      )}
      {showAccountForm && (
        <AccountForm initial={editingAccount} onClose={() => { setShowAccountForm(false); setEditingAccount(null); }} onSave={saveAccount} />
      )}
      {showRecurringForm && (
        <RecurringForm initial={editingRecurring} accounts={accounts} customCategories={customCategories} onClose={() => { setShowRecurringForm(false); setEditingRecurring(null); }} onSave={saveRecurring} />
      )}
      {showSavingsForm && (
        <SavingsGoalForm onClose={() => setShowSavingsForm(false)} onSave={saveSavingsGoal} />
      )}
    </div>
  );
}

/* ------------------------------- Painel ------------------------------- */
function PainelTab({ totalGasto, totalReceita, saldoRealizado, saldoPrevisto, gastoPendenteMes, receitaPendenteMes, porCategoria, necessarioPct, desnecessarioPct, gastosMes, previsao, healthScore, deltaGasto, deltaReceita, transactions, accounts, customCategories, onEdit, onDelete, hasAny, pendentes, onTogglePaid }) {
  if (!hasAny) {
    return (
      <Card style={{ padding: "48px 24px", textAlign: "center" }}>
        <BookOpen size={28} color={C.gold} style={{ marginBottom: 10 }} />
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 6 }}>Seu razão está em branco</div>
        <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 380, margin: "0 auto" }}>
          Registre o primeiro gasto ou receita pra começar a enxergar pra onde seu dinheiro vai — e se ele precisava ir.
        </div>
      </Card>
    );
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <StatBlock
          label="Receitas do mês"
          value={brl(totalReceita)}
          accent={C.sageSoft}
          sub={receitaPendenteMes > 0 ? `${brl(receitaPendenteMes)} ainda a receber` : (deltaReceita != null ? `${deltaReceita >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(deltaReceita))}% vs mês anterior` : undefined)}
        />
        <StatBlock
          label="Gastos do mês"
          value={brl(totalGasto)}
          accent={C.brickSoft}
          sub={gastoPendenteMes > 0 ? `${brl(gastoPendenteMes)} ainda a pagar` : (deltaGasto != null ? `${deltaGasto >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(deltaGasto))}% vs mês anterior` : undefined)}
        />
        <StatBlock
          label="Saldo realizado"
          value={brl(saldoRealizado)}
          accent={saldoRealizado >= 0 ? C.sageSoft : C.brickSoft}
          sub="só o que já foi pago/recebido"
        />
        <StatBlock
          label="Saldo previsto"
          value={brl(saldoPrevisto)}
          accent={saldoPrevisto >= 0 ? C.sageSoft : C.brickSoft}
          sub="realizado + pendências do mês"
        />
        <StatBlock label="Previsão próx. mês" value={previsao ? brl(previsao.valor) : "—"} sub={previsao ? "com base nos últimos meses" : "sem histórico suficiente"} accent={C.goldSoft} />
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Card style={{ padding: 18, flex: "1 1 260px" }}>
          <SectionTitle icon={Gauge}>Saúde financeira do mês</SectionTitle>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 34, fontWeight: 700, color: healthScore.color }}>{healthScore.score}</span>
            <span style={{ color: C.textFaint, fontSize: 13 }}>/ 100</span>
            <span style={{ marginLeft: "auto", color: healthScore.color, fontWeight: 700, fontSize: 13 }}>{healthScore.label}</span>
          </div>
          <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden", marginTop: 10 }}>
            <div style={{ height: "100%", width: `${healthScore.score}%`, background: healthScore.color, borderRadius: 4, transition: "width .4s ease" }} />
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
            Combina sua taxa de economia, quanto do gasto foi necessário e o quanto você respeitou suas metas.
          </div>
        </Card>

        <Card style={{ padding: 18, flex: "1 1 260px" }}>
          <SectionTitle icon={Target}>Necessidade dos gastos</SectionTitle>
          <div style={{ marginTop: 12 }}>
            <NecBar label="Necessário" pct={necessarioPct} color={C.sage} />
            <NecBar label="Desnecessário" pct={desnecessarioPct} color={C.brick} />
          </div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            {desnecessarioPct >= 30
              ? `${desnecessarioPct}% do que você gastou esse mês foi marcado como desnecessário — dá pra rever aí.`
              : desnecessarioPct === 0 && gastosMes.length > 0
              ? "Nenhum gasto marcado como desnecessário até agora. Bom sinal."
              : `${desnecessarioPct}% dos gastos foram marcados como desnecessários.`}
          </div>
        </Card>

        <Card style={{ padding: 18, flex: "1 1 260px" }}>
          <SectionTitle icon={LayoutGrid}>Gasto por categoria</SectionTitle>
          {porCategoria.length === 0 ? (
            <div style={{ color: C.textFaint, fontSize: 13, marginTop: 8 }}>Nenhum gasto ainda neste mês.</div>
          ) : (
            <div style={{ height: 180, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porCategoria} dataKey="value" nameKey="label" innerRadius={42} outerRadius={68} paddingAngle={2}>
                    {porCategoria.map((c) => <Cell key={c.id} fill={c.color} stroke={C.surface} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {pendentes.length > 0 && (
        <Card style={{ padding: 18, marginTop: 16 }}>
          <SectionTitle icon={Bell}>Contas pendentes deste mês</SectionTitle>
          <div style={{ marginTop: 8 }}>
            {pendentes.map((t) => {
              const info = catInfo(t.category, t.type === "receita", customCategories);
              return (
                <div key={t.id} className="rowhover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: `1px solid ${C.borderSoft}` }}>
                  <Clock size={14} color={C.goldSoft} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.desc || info.label}</div>
                    <div style={{ fontSize: 11, color: C.textFaint }}>{new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}</div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: t.type === "receita" ? C.sageSoft : C.brickSoft }}>
                    {t.type === "receita" ? "+" : "-"}{brl(t.amount)}
                  </span>
                  <button onClick={() => onTogglePaid(t.id)} style={{ ...ghostBtnStyle, padding: "5px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={13} /> Pago
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {transactions.length > 0 && (
        <Card style={{ padding: 18, marginTop: 16 }}>
          <SectionTitle icon={List}>Últimos lançamentos</SectionTitle>
          <TxTable transactions={transactions} accounts={accounts} customCategories={customCategories} onEdit={onEdit} onDelete={onDelete} compact />
        </Card>
      )}
    </div>
  );
}
function NecBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: C.textMuted }}>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{pct}%</span>
      </div>
      <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

/* ---------------------------- Transações ---------------------------- */
function TransacoesTab({ transactions, accounts, customCategories, filterCat, setFilterCat, filterNec, setFilterNec, filterAcc, setFilterAcc, search, setSearch, onEdit, onDelete, onTogglePaid }) {
  const cats = allGastoCats(customCategories);
  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={14} color={C.textFaint} style={{ position: "absolute", left: 10, top: 11 }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição (em todos os meses)..." style={{ ...fullInput, paddingLeft: 30, marginBottom: 0 }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={selectStyle}>
          <option value="todas">Todas as categorias</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={filterNec} onChange={(e) => setFilterNec(e.target.value)} style={selectStyle}>
          <option value="todas">Toda necessidade</option>
          {Object.entries(NECESSITY).map(([id, n]) => <option key={id} value={id}>{n.label}</option>)}
        </select>
        <select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)} style={selectStyle}>
          <option value="todas">Todas as contas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <Card style={{ padding: 18 }}>
        {transactions.length === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nada por aqui com esse filtro.</div>
        ) : (
          <TxTable transactions={transactions} accounts={accounts} customCategories={customCategories} onEdit={onEdit} onDelete={onDelete} onTogglePaid={onTogglePaid} />
        )}
      </Card>
    </div>
  );
}
function TxTable({ transactions, accounts, customCategories, onEdit, onDelete, onTogglePaid, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {transactions.map((t) => {
        const isIncome = t.type === "receita";
        const info = catInfo(t.category, isIncome, customCategories);
        const acc = accInfo(t.accountId, accounts);
        const Icon = info.icon;
        const pending = t.status === "pendente";
        return (
          <div key={t.id} className="rowhover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.borderSoft}`, opacity: pending ? 0.75 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: info.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={16} color={info.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc || info.label}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.textFaint }}>{new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                {!compact && <span style={{ fontSize: 11, color: C.textFaint }}>· {acc.name}</span>}
                {!compact && !isIncome && <Stamp value={t.necessity} />}
                {!compact && pending && (
                  <span style={{ fontSize: 9.5, color: C.goldSoft, border: `1px solid ${C.goldSoft}55`, borderRadius: 4, padding: "1px 5px", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={9} /> PENDENTE
                  </span>
                )}
                {!compact && t.installmentTotal && (
                  <span style={{ fontSize: 9.5, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", display: "flex", alignItems: "center", gap: 3 }}>
                    <Layers size={9} /> {t.installmentIndex}/{t.installmentTotal}
                  </span>
                )}
                {!compact && t.recurringId && (
                  <span style={{ fontSize: 9.5, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", display: "flex", alignItems: "center", gap: 3 }}>
                    <Repeat size={9} /> auto
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: isIncome ? C.sageSoft : C.brickSoft, whiteSpace: "nowrap" }}>
              {isIncome ? "+" : "-"}{brl(t.amount)}
            </div>
            {!compact && (
              <div style={{ display: "flex", gap: 2 }}>
                {onTogglePaid && (
                  <button onClick={() => onTogglePaid(t.id)} title={pending ? "Marcar como pago" : "Marcar como pendente"} style={iconBtnStyle}><Check size={13} color={pending ? C.textMuted : C.sage} /></button>
                )}
                <button onClick={() => onEdit(t)} style={iconBtnStyle}><Pencil size={13} /></button>
                <button onClick={() => onDelete(t.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Contas ------------------------------- */
function ContasTab({ accounts, transactions, totalPatrimonio, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={Landmark} right={<button onClick={onAdd} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 5, padding: "6px 10px" }}><Plus size={14} /> Nova conta</button>}>
          Patrimônio total
        </SectionTitle>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 700, color: totalPatrimonio >= 0 ? C.sageSoft : C.brickSoft, marginTop: 8 }}>
          {brl(totalPatrimonio)}
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {accounts.map((a) => {
          const type = ACCOUNT_TYPES.find((t) => t.id === a.type) || ACCOUNT_TYPES[0];
          const Icon = type.icon;
          const bal = accountBalance(a.id, transactions, a.initialBalance);
          return (
            <Card key={a.id} className="card-hover" style={{ padding: 16, transition: "border-color .2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={a.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.textFaint }}>{type.label}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <button onClick={() => onEdit(a)} style={iconBtnStyle}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(a.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: bal >= 0 ? C.text : C.brickSoft }}>{brl(bal)}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------- Recorrências --------------------------- */
function RecorrenciasTab({ recurring, accounts, customCategories, onAdd, onEdit, onDelete, onToggle, onLaunch }) {
  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={Repeat} right={<button onClick={onAdd} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 5, padding: "6px 10px" }}><Plus size={14} /> Nova recorrência</button>}>
          Assinaturas, salário e contas fixas
        </SectionTitle>
        <div style={{ color: C.textFaint, fontSize: 12, marginTop: 6 }}>
          Lançadas automaticamente todo mês, no dia escolhido. Se o dia ainda não chegou, entram como pendentes.
        </div>
      </Card>
      {recurring.length === 0 ? (
        <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nenhuma recorrência cadastrada ainda.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recurring.map((r) => {
            const info = catInfo(r.category, r.type === "receita", customCategories);
            const acc = accInfo(r.accountId, accounts);
            const Icon = info.icon;
            return (
              <Card key={r.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, opacity: r.active ? 1 : 0.55 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: info.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} color={info.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.desc}</div>
                  <div style={{ fontSize: 11.5, color: C.textFaint }}>Dia {r.dayOfMonth} · {acc.name} · {info.label}</div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: r.type === "receita" ? C.sageSoft : C.brickSoft }}>
                  {r.type === "receita" ? "+" : "-"}{brl(r.amount)}
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => onLaunch(r)} title="Lançar agora" style={iconBtnStyle}><Bell size={13} /></button>
                  <button onClick={() => onToggle(r.id)} title={r.active ? "Pausar" : "Ativar"} style={iconBtnStyle}>{r.active ? <CheckCircle2 size={13} color={C.sage} /> : <X size={13} />}</button>
                  <button onClick={() => onEdit(r)} style={iconBtnStyle}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(r.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Metas ------------------------------- */
function MetasTab({ goals, setGoals, porCategoria, allCatsGasto, savingsGoals, onAddSavings, onContribute, onDeleteSavings }) {
  const [sub, setSub] = useState("limites");
  const spentMap = Object.fromEntries(porCategoria.map((c) => [c.id, c.value]));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSub("limites")} style={{ ...ghostBtnStyle, background: sub === "limites" ? C.surfaceRaised : "transparent", color: sub === "limites" ? C.text : C.textMuted }}>Limites por categoria</button>
        <button onClick={() => setSub("poupanca")} style={{ ...ghostBtnStyle, background: sub === "poupanca" ? C.surfaceRaised : "transparent", color: sub === "poupanca" ? C.text : C.textMuted }}>Metas de poupança</button>
      </div>

      {sub === "limites" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
          {allCatsGasto.map((c) => {
            const limit = goals[c.id] || 0;
            const spent = spentMap[c.id] || 0;
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const over = limit > 0 && spent > limit;
            const Icon = c.icon;
            return (
              <Card key={c.id} style={{ padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Icon size={15} color={c.color} />
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.label}</span>
                  {over && <AlertTriangle size={13} color={C.brick} style={{ marginLeft: "auto" }} />}
                </div>
                <input type="number" placeholder="Limite (R$)" value={goals[c.id] || ""} onChange={(e) => setGoals((prev) => ({ ...prev, [c.id]: parseFloat(e.target.value) || undefined }))} style={{ ...selectStyle, width: "100%", marginBottom: 8 }} />
                {limit > 0 && (
                  <>
                    <div style={{ height: 6, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: over ? C.brick : c.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textFaint, marginTop: 4, fontFamily: "'IBM Plex Mono', monospace" }}>
                      <span>{brl(spent)}</span><span>{brl(limit)}</span>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {sub === "poupanca" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={onAddSavings} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 5 }}><Plus size={14} /> Nova meta</button>
          </div>
          {savingsGoals.length === 0 ? (
            <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nenhuma meta de poupança ainda. Que tal uma viagem, uma reserva de emergência?</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {savingsGoals.map((g) => {
                const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
                return (
                  <Card key={g.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <PiggyBank size={15} color={g.color} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, marginLeft: 7 }}>{g.name}</span>
                      <button onClick={() => onDeleteSavings(g.id)} style={{ ...iconBtnStyle, marginLeft: "auto" }}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: g.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: C.textMuted, marginBottom: 10 }}>
                      <span>{brl(g.saved)}</span><span>{brl(g.target)} ({pct}%)</span>
                    </div>
                    <SavingsContribute goal={g} onContribute={onContribute} />
                    {g.deadline && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>Prazo: {new Date(g.deadline + "T00:00:00").toLocaleDateString("pt-BR")}</div>}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function SavingsContribute({ goal, onContribute }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Valor" inputMode="decimal" style={{ ...selectStyle, flex: 1, marginBottom: 0 }} />
      <button
        onClick={() => { const n = parseFloat(String(val).replace(",", ".")); if (n > 0) { onContribute(goal.id, n); setVal(""); } }}
        style={{ ...ghostBtnStyle, padding: "6px 10px", color: C.sageSoft, borderColor: C.sage + "55" }}
      >+ guardar</button>
      <button
        onClick={() => { const n = parseFloat(String(val).replace(",", ".")); if (n > 0) { onContribute(goal.id, -n); setVal(""); } }}
        style={{ ...ghostBtnStyle, padding: "6px 10px", color: C.brickSoft, borderColor: C.brick + "55" }}
      >- retirar</button>
    </div>
  );
}

/* ------------------------------ Análises ------------------------------ */
function AnalisesTab({ last6Months, previsaoChart, previsao, porNecessidade, totalGasto, patrimonioEvolucao }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 18 }}>
        <SectionTitle icon={LineChartIcon}>Receitas x gastos — 6 meses</SectionTitle>
        <div style={{ height: 230, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: C.textMuted }} />
              <Bar dataKey="receita" name="Receitas" fill={C.sage} radius={[3, 3, 0, 0]} />
              <Bar dataKey="gasto" name="Gastos" fill={C.brick} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={TrendingUp}>Tendência e previsão de gastos</SectionTitle>
        <div style={{ height: 210, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={previsaoChart}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="real" name="Real" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="previsto" name="Previsto" stroke={C.goldSoft} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 12, color: C.textFaint, marginTop: 6 }}>* projeção simples com base na média ponderada dos últimos 3 meses.</div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Landmark}>Evolução do patrimônio</SectionTitle>
        <div style={{ height: 200, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={patrimonioEvolucao}>
              <defs>
                <linearGradient id="patGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.gold} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="saldo" name="Patrimônio" stroke={C.gold} fill="url(#patGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Target}>Pra onde foi — necessário x evitável</SectionTitle>
        {totalGasto === 0 ? (
          <div style={{ color: C.textFaint, fontSize: 13, marginTop: 8 }}>Sem gastos neste mês pra analisar.</div>
        ) : (
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porNecessidade.filter((n) => n.value > 0)} dataKey="value" nameKey="label" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {porNecessidade.map((n) => <Cell key={n.id} fill={n.color} stroke={C.surface} strokeWidth={2} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              {porNecessidade.map((n) => (
                <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: n.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: C.textMuted, flex: 1 }}>{n.label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>{brl(n.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------- Ajustes ------------------------------- */
function ConfigTab({ profileName, setProfileName, transactionsCount, onWipe, customCategories, onAddCategory, onRemoveCategory, onExportCSV, onExportBackup, onImport, fileInputRef }) {
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState(ICON_CHOICES[0]);
  const [newCatColor, setNewCatColor] = useState(SWATCHES[0]);

  function submitCategory() {
    if (!newCatName.trim()) return;
    onAddCategory({ label: newCatName.trim(), iconName: newCatIcon, color: newCatColor });
    setNewCatName("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480 }}>
      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Settings}>Nome do razão</SectionTitle>
        <input value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ ...selectStyle, width: "100%", marginTop: 10 }} />
        <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8, lineHeight: 1.5 }}>
          Seus dados ficam salvos na sua conta, de forma privada. Se um amigo abrir este mesmo app, ele terá o próprio razão — os dados não se misturam.
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Tag}>Categorias personalizadas</SectionTitle>
        <div style={{ marginTop: 10 }}>
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nome da categoria" style={{ ...fullInput }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {ICON_CHOICES.map((name) => {
              const Ic = ICON_LIBRARY[name];
              const active = newCatIcon === name;
              return (
                <button key={name} type="button" onClick={() => setNewCatIcon(name)} style={{ width: 30, height: 30, borderRadius: 6, border: `1.5px solid ${active ? C.gold : C.border}`, background: active ? C.gold + "22" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Ic size={14} color={active ? C.gold : C.textMuted} />
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {SWATCHES.map((sw) => (
              <button key={sw} type="button" onClick={() => setNewCatColor(sw)} style={{ width: 22, height: 22, borderRadius: "50%", background: sw, border: newCatColor === sw ? `2px solid ${C.text}` : "2px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
          <button onClick={submitCategory} style={{ ...ghostBtnStyle, width: "100%" }}>Adicionar categoria</button>
        </div>
        {customCategories.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {customCategories.map((c) => {
              const Ic = ICON_LIBRARY[c.iconName] || Tag;
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px" }}>
                  <Ic size={14} color={c.color} />
                  <span style={{ fontSize: 13, flex: 1 }}>{c.label}</span>
                  <button onClick={() => onRemoveCategory(c.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={Download}>Backup e exportação</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.textMuted, margin: "10px 0" }}>Exporte seus lançamentos ou faça um backup completo pra restaurar depois.</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={onExportCSV} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 6 }}><Download size={14} /> Exportar CSV do mês</button>
          <button onClick={onExportBackup} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 6 }}><Download size={14} /> Exportar backup (.json)</button>
          <button onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} /> Importar backup</button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
        </div>
      </Card>

      <Card style={{ padding: 18 }}>
        <SectionTitle icon={AlertTriangle}>Zona de risco</SectionTitle>
        <div style={{ fontSize: 12.5, color: C.textMuted, margin: "10px 0" }}>{transactionsCount} lançamento(s) salvos.</div>
        {!confirmWipe ? (
          <button onClick={() => setConfirmWipe(true)} style={dangerBtnStyle}>Apagar todos os dados</button>
        ) : (
          <div style={{ border: `1px solid ${C.brick}55`, borderRadius: 8, padding: 14, background: C.brick + "0f" }}>
            <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
              Isso apaga <strong>tudo</strong>: lançamentos, contas, recorrências, metas, categorias
              personalizadas e o nome do seu razão. Não tem como desfazer depois.
            </div>
            <button type="button" onClick={onExportBackup} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Download size={14} /> Exportar backup antes de apagar
            </button>
            <FieldLabel>Digite APAGAR pra confirmar</FieldLabel>
            <input value={wipeConfirmText} onChange={(e) => setWipeConfirmText(e.target.value)} placeholder="APAGAR" style={fullInput} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                disabled={wipeConfirmText.trim().toUpperCase() !== "APAGAR"}
                onClick={() => { onWipe(); setConfirmWipe(false); setWipeConfirmText(""); }}
                style={{ ...dangerBtnStyle, opacity: wipeConfirmText.trim().toUpperCase() === "APAGAR" ? 1 : 0.4, cursor: wipeConfirmText.trim().toUpperCase() === "APAGAR" ? "pointer" : "not-allowed" }}
              >
                Apagar definitivamente
              </button>
              <button onClick={() => { setConfirmWipe(false); setWipeConfirmText(""); }} style={ghostBtnStyle}>Cancelar</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------- Formulários -------------------------------- */
function TxForm({ initial, accounts, customCategories, onClose, onSave }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "gasto");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [desc, setDesc] = useState(initial?.desc || "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category || CATS[0].id);
  const [necessity, setNecessity] = useState(initial?.necessity || "necessario");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [accountId, setAccountId] = useState(initial?.accountId || (accounts[0] && accounts[0].id) || "");
  const [status, setStatus] = useState(initial?.status || "pago");
  const [installments, setInstallments] = useState(1);

  const cats = type === "gasto" ? allGastoCats(customCategories) : REC_CATS;
  useEffect(() => {
    if (!cats.find((c) => c.id === category)) setCategory(cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function submit(e) {
    e.preventDefault();
    const val = parseFloat(String(amount).replace(",", "."));
    if (!val || val <= 0 || !date || !accountId) return;
    onSave({
      id: initial?.id, type, date, desc: desc.trim(), amount: val, category,
      necessity: type === "gasto" ? necessity : undefined, notes: notes.trim(),
      accountId, status, installments: type === "gasto" && !isEdit ? installments : 1,
    });
  }

  return (
    <ModalSheet title={isEdit ? "Editar lançamento" : "Novo lançamento"} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["gasto", "receita"].map((t) => (
            <button type="button" key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${type === t ? (t === "gasto" ? C.brick : C.sage) : C.border}`,
              background: type === t ? (t === "gasto" ? C.brick + "22" : C.sage + "22") : "transparent",
              color: type === t ? (t === "gasto" ? C.brickSoft : C.sageSoft) : C.textMuted, fontWeight: 600, fontSize: 13,
            }}>{t === "gasto" ? "Gasto" : "Receita"}</button>
          ))}
        </div>

        <FieldLabel>Descrição</FieldLabel>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Almoço, Uber, aluguel..." style={fullInput} />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Valor (R$)</FieldLabel>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" style={fullInput} required />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Data</FieldLabel>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fullInput} required />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Categoria</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={fullInput}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Conta</FieldLabel>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={fullInput}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <FieldLabel>Status</FieldLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["pago", "pendente"].map((s) => (
            <button type="button" key={s} onClick={() => setStatus(s)} style={{
              flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${status === s ? C.gold : C.border}`, background: status === s ? C.gold + "1f" : "transparent",
              color: status === s ? C.gold : C.textMuted,
            }}>{s === "pago" ? "Pago" : (type === "receita" ? "A receber" : "A pagar")}</button>
          ))}
        </div>

        {type === "gasto" && (
          <>
            <FieldLabel>Isso era necessário?</FieldLabel>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {Object.entries(NECESSITY).map(([id, n]) => (
                <button type="button" key={id} onClick={() => setNecessity(id)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                  border: `1.5px solid ${necessity === id ? n.color : C.border}`, background: necessity === id ? n.color + "1f" : "transparent",
                  color: necessity === id ? n.color : C.textMuted,
                }}>{n.label}</button>
              ))}
            </div>
          </>
        )}

        {type === "gasto" && !isEdit && (
          <>
            <FieldLabel>Parcelar em quantas vezes?</FieldLabel>
            <input type="number" min={1} max={48} value={installments} onChange={(e) => setInstallments(Math.max(1, parseInt(e.target.value, 10) || 1))} style={fullInput} />
            {installments > 1 && <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: -2, marginBottom: 8 }}>{installments}x de aproximadamente {brl((parseFloat(String(amount).replace(",", ".")) || 0) / installments)}</div>}
          </>
        )}

        <FieldLabel>Notas (opcional)</FieldLabel>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...fullInput, resize: "vertical" }} />

        <button type="submit" style={{ ...primaryBtnStyle, width: "100%", marginTop: 8, padding: "12px 0", fontSize: 14 }}>
          {isEdit ? "Salvar alterações" : "Adicionar lançamento"}
        </button>
      </form>
    </ModalSheet>
  );
}

function AccountForm({ initial, onClose, onSave }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "carteira");
  const [color, setColor] = useState(initial?.color || SWATCHES[0]);
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance ?? 0);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ id: initial?.id, name: name.trim(), type, color, initialBalance: parseFloat(String(initialBalance).replace(",", ".")) || 0 });
  }
  return (
    <ModalSheet title={isEdit ? "Editar conta" : "Nova conta"} onClose={onClose}>
      <form onSubmit={submit}>
        <FieldLabel>Nome</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Carteira, Cofre" style={fullInput} required />
        <FieldLabel>Tipo</FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {ACCOUNT_TYPES.map((t) => {
            const Ic = t.icon;
            const active = type === t.id;
            return (
              <button type="button" key={t.id} onClick={() => setType(t.id)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                border: `1.5px solid ${active ? C.gold : C.border}`, background: active ? C.gold + "1f" : "transparent", color: active ? C.gold : C.textMuted,
              }}><Ic size={13} /> {t.label}</button>
            );
          })}
        </div>
        <FieldLabel>Cor</FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {SWATCHES.map((sw) => (
            <button type="button" key={sw} onClick={() => setColor(sw)} style={{ width: 24, height: 24, borderRadius: "50%", background: sw, border: color === sw ? `2px solid ${C.text}` : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
        <FieldLabel>Saldo inicial (R$)</FieldLabel>
        <input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} inputMode="decimal" style={fullInput} />
        <button type="submit" style={{ ...primaryBtnStyle, width: "100%", marginTop: 10, padding: "12px 0", fontSize: 14 }}>{isEdit ? "Salvar alterações" : "Criar conta"}</button>
      </form>
    </ModalSheet>
  );
}

function RecurringForm({ initial, accounts, customCategories, onClose, onSave }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "gasto");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category || CATS[0].id);
  const [necessity, setNecessity] = useState(initial?.necessity || "necessario");
  const [accountId, setAccountId] = useState(initial?.accountId || (accounts[0] && accounts[0].id) || "");
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth || 5);
  const [active, setActive] = useState(initial?.active ?? true);

  const cats = type === "gasto" ? allGastoCats(customCategories) : REC_CATS;
  useEffect(() => {
    if (!cats.find((c) => c.id === category)) setCategory(cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function submit(e) {
    e.preventDefault();
    const val = parseFloat(String(amount).replace(",", "."));
    if (!val || val <= 0 || !desc.trim() || !accountId) return;
    onSave({ id: initial?.id, type, desc: desc.trim(), amount: val, category, necessity: type === "gasto" ? necessity : undefined, accountId, dayOfMonth: Math.min(28, Math.max(1, parseInt(dayOfMonth, 10) || 1)), active });
  }
  return (
    <ModalSheet title={isEdit ? "Editar recorrência" : "Nova recorrência"} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["gasto", "receita"].map((t) => (
            <button type="button" key={t} onClick={() => setType(t)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${type === t ? (t === "gasto" ? C.brick : C.sage) : C.border}`,
              background: type === t ? (t === "gasto" ? C.brick + "22" : C.sage + "22") : "transparent",
              color: type === t ? (t === "gasto" ? C.brickSoft : C.sageSoft) : C.textMuted, fontWeight: 600, fontSize: 13,
            }}>{t === "gasto" ? "Gasto" : "Receita"}</button>
          ))}
        </div>
        <FieldLabel>Descrição</FieldLabel>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Netflix, Salário, Aluguel" style={fullInput} required />
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Valor (R$)</FieldLabel>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" style={fullInput} required />
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Dia do mês</FieldLabel>
            <input type="number" min={1} max={28} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} style={fullInput} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <FieldLabel>Categoria</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={fullInput}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <FieldLabel>Conta</FieldLabel>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={fullInput}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        {type === "gasto" && (
          <>
            <FieldLabel>Necessidade padrão</FieldLabel>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {Object.entries(NECESSITY).map(([id, n]) => (
                <button type="button" key={id} onClick={() => setNecessity(id)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: 700,
                  border: `1.5px solid ${necessity === id ? n.color : C.border}`, background: necessity === id ? n.color + "1f" : "transparent",
                  color: necessity === id ? n.color : C.textMuted,
                }}>{n.label}</button>
              ))}
            </div>
          </>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted, margin: "6px 0 12px", cursor: "pointer" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativa (gera lançamentos automaticamente)
        </label>
        <button type="submit" style={{ ...primaryBtnStyle, width: "100%", padding: "12px 0", fontSize: 14 }}>{isEdit ? "Salvar alterações" : "Criar recorrência"}</button>
      </form>
    </ModalSheet>
  );
}

function SavingsGoalForm({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  function submit(e) {
    e.preventDefault();
    const val = parseFloat(String(target).replace(",", "."));
    if (!name.trim() || !val || val <= 0) return;
    onSave({ name: name.trim(), target: val, deadline: deadline || undefined, color });
  }
  return (
    <ModalSheet title="Nova meta de poupança" onClose={onClose}>
      <form onSubmit={submit}>
        <FieldLabel>Nome da meta</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem, Reserva de emergência" style={fullInput} required />
        <FieldLabel>Valor alvo (R$)</FieldLabel>
        <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" style={fullInput} required />
        <FieldLabel>Prazo (opcional)</FieldLabel>
        <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={fullInput} />
        <FieldLabel>Cor</FieldLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {SWATCHES.map((sw) => (
            <button type="button" key={sw} onClick={() => setColor(sw)} style={{ width: 24, height: 24, borderRadius: "50%", background: sw, border: color === sw ? `2px solid ${C.text}` : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
        <button type="submit" style={{ ...primaryBtnStyle, width: "100%", marginTop: 6, padding: "12px 0", fontSize: 14 }}>Criar meta</button>
      </form>
    </ModalSheet>
  );
}
