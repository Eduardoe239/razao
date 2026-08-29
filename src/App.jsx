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
  ArrowRightLeft, Info, Receipt, CalendarClock,
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

/* ------------------------------- dinheiro (Money) -------------------------------
 * Todo valor monetário do domínio vive em CENTAVOS INTEIROS a partir daqui.
 * Nunca somamos reais em float — é assim que sistemas financeiros acumulam erro
 * de arredondamento silenciosamente. Os formulários mostram reais (ex.: "12,50"),
 * mas assim que o valor entra no estado, ele já é um inteiro de centavos.
 * ------------------------------------------------------------------------------- */
const Money = {
  // string digitada pelo usuário (reais) -> centavos inteiros.
  // Se tem vírgula, ela é o separador decimal e pontos antes dela são milhar
  // (ex.: "1.234,56"). Sem vírgula, aceita ponto decimal comum ("12.5").
  parseToCents(str) {
    let s = String(str ?? "").trim();
    if (!s) return 0;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  },
  centsToInput(cents) {
    return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
  },
  // distribui `totalCents` em `n` parcelas de forma determinística: divide
  // inteiro, e o resto (sempre < n centavos) vai 1 centavo por vez pras
  // primeiras parcelas — convenção padrão de sistemas contábeis.
  splitInstallments(totalCents, n) {
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
  },
};
function brl(cents) {
  const n = (cents || 0) / 100;
  return (n < 0 ? "-" : "") + "R$ " + Math.abs(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
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
// Meta "reserva": dinheiro de verdade guardado numa conta dedicada — o saldo
// vem da própria conta (fonte única de verdade, sem duplicar percepção de $).
// Meta "virtual": só acompanhamento — soma o histórico de aportes/resgates.
function savingsGoalSaved(goal, accounts, transactions) {
  if (goal.mode === "reserva" && goal.accountId) {
    return accountBalance(goal.accountId, transactions, 0);
  }
  return (goal.contributions || []).reduce((s, c) => s + c.amount, 0);
}
function budgetForMonth(key, budgetSettings) {
  if (!budgetSettings) return null;
  if (budgetSettings.overrides && budgetSettings.overrides[key] != null) return budgetSettings.overrides[key];
  return budgetSettings.defaultMonthly ?? null;
}
function daysInMonth(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function accountBalance(accountId, transactions, initialBalance) {
  let bal = initialBalance;
  transactions.forEach((t) => {
    if (t.status !== "pago") return;
    if (t.type === "transferencia") {
      if (t.fromAccountId === accountId) bal -= t.amount;
      if (t.toAccountId === accountId) bal += t.amount;
      return;
    }
    if (t.accountId !== accountId) return;
    bal += t.type === "receita" ? t.amount : -t.amount;
  });
  return bal;
}
function csvEscape(s) {
  return '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
}

/* ------------------------------- fatura de cartão -------------------------------
 * Uma fatura é identificada pela chave do mês em que ela FECHA (invoiceKey).
 * Uma compra feita no dia D pertence à fatura que fecha no dia `closingDay`:
 *   - se D <= closingDay do mês da compra, ela cai na fatura que fecha ESTE mês
 *   - se D > closingDay, ela já passou do fechamento — cai na fatura do mês seguinte
 * O vencimento pode ser antes ou depois do fechamento dentro do calendário:
 * se dueDay < closingDay, o vencimento é interpretado como caindo no mês seguinte
 * ao fechamento (convenção mais comum em cartões brasileiros).
 * ---------------------------------------------------------------------------- */
function invoiceKeyForDate(dateStr, closingDay) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (d <= closingDay) return `${y}-${String(m).padStart(2, "0")}`;
  const dt = new Date(y, m, 1); // mês seguinte
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
function invoiceDueDate(invoiceKey, dueDay, closingDay) {
  const [y, m] = invoiceKey.split("-").map(Number);
  if (dueDay < closingDay) {
    const dt = new Date(y, m, dueDay); // m já é 1-indexed -> new Date(y,m,..) cai no mês seguinte
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
}
function invoiceLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
// Lista as faturas de um cartão num intervalo de meses ao redor de `aroundKey`,
// já com total, vencimento, status e quanto foi pago (rastreado por transferências
// marcadas com linkedInvoice, nunca inferido só pelo saldo).
function cardInvoices(card, transactions, aroundKey, monthsBack = 3, monthsFwd = 2) {
  const closingDay = card.closingDay || 1;
  const dueDay = card.dueDay || 10;
  const [ay, am] = aroundKey.split("-").map(Number);
  const keys = [];
  for (let i = -monthsBack; i <= monthsFwd; i++) {
    const dt = new Date(ay, am - 1 + i, 1);
    keys.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  const todayK = todayISO();
  return keys.map((key) => {
    const purchases = transactions.filter((t) => t.type === "gasto" && t.accountId === card.id && invoiceKeyForDate(t.date, closingDay) === key);
    const total = purchases.reduce((s, t) => s + t.amount, 0);
    const paid = transactions
      .filter((t) => t.type === "transferencia" && t.toAccountId === card.id && t.linkedInvoice === key && t.status === "pago")
      .reduce((s, t) => s + t.amount, 0);
    const due = invoiceDueDate(key, dueDay, closingDay);
    const closed = todayK > `${key}-${String(closingDay).padStart(2, "0")}`;
    let status = "aberta";
    if (closed) status = paid >= total && total > 0 ? "paga" : (todayK > due ? "vencida" : "fechada");
    return { key, label: invoiceLabel(key), purchases, total, paid, due, status, remaining: Math.max(0, total - paid) };
  });
}

/* ------------------------------- central de compromissos -------------------------------
 * Junta tudo que já se sabe que vai acontecer financeiramente nos próximos meses:
 *  a) pendências já lançadas (parcelas futuras, contas a pagar/receber manuais)
 *  b) ocorrências futuras de recorrências ativas que ainda não viraram lançamento
 *     (a geração automática só cobre o mês corrente — aqui projetamos os seguintes)
 *  c) faturas de cartão fechadas/vencidas ainda não pagas, e a fatura aberta corrente
 * Isso NÃO cria lançamentos — é só uma projeção de leitura.
 * ----------------------------------------------------------------------------------- */
function buildCommitments(transactions, recurring, accounts, customCategories, monthsAhead) {
  const today = todayISO();
  const todayKey = monthKey(today);
  const items = [];

  transactions
    .filter((t) => t.status === "pendente" && t.date >= today)
    .forEach((t) => {
      const isTransfer = t.type === "transferencia";
      items.push({
        id: t.id, date: t.date, amount: t.amount, kind: t.type,
        label: isTransfer ? (t.desc || "Transferência") : (t.desc || catInfo(t.category, t.type === "receita", customCategories).label),
        source: t.installmentTotal ? `Parcela ${t.installmentIndex}/${t.installmentTotal}` : (t.recurringId ? "Recorrência" : "Pendência"),
      });
    });

  recurring.filter((r) => r.active).forEach((r) => {
    for (let i = 1; i <= monthsAhead; i++) {
      const [ty, tm] = todayKey.split("-").map(Number);
      const dt = new Date(ty, tm - 1 + i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const day = Math.min(r.dayOfMonth || 1, 28);
      const date = `${key}-${String(day).padStart(2, "0")}`;
      const already = transactions.some((t) => t.recurringId === r.id && monthKey(t.date) === key);
      if (!already) {
        items.push({ id: `${r.id}-${key}`, date, amount: r.amount, kind: r.type, label: r.desc, source: "Recorrência (futura)" });
      }
    }
  });

  accounts.filter((a) => a.type === "cartao").forEach((card) => {
    const invoices = cardInvoices(card, transactions, todayKey, 0, monthsAhead);
    invoices.forEach((inv) => {
      if ((inv.status === "fechada" || inv.status === "vencida") && inv.remaining > 0) {
        items.push({ id: `fatura-${card.id}-${inv.key}`, date: inv.due, amount: inv.remaining, kind: "gasto", label: `Fatura ${card.name}`, source: inv.status === "vencida" ? "Fatura vencida" : "Fatura fechada" });
      } else if (inv.status === "aberta" && inv.total > 0) {
        items.push({ id: `fatura-aberta-${card.id}-${inv.key}`, date: inv.due, amount: inv.total, kind: "gasto", label: `Fatura ${card.name} (em aberto)`, source: "Fatura em formação" });
      }
    });
  });

  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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
  // Orçamento geral: um teto pro mês inteiro (não por categoria). "defaultMonthly"
  // vale pra todo mês; "overrides" permite um valor específico pra um mês (ex.:
  // mês de viagem, mês de 13º).
  const [budgetSettings, setBudgetSettings] = useState({ defaultMonthly: null, overrides: {} });
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
          let goalsData = p.goals || {};
          let savingsData = p.savingsGoals || [];
          let recurringData = p.recurring || [];
          if (!accs) {
            const def = { id: uid(), name: "Carteira", type: "carteira", color: "#c9a227", initialBalance: 0 };
            accs = [def];
            txs = txs.map((t) => (t.accountId ? t : { ...t, accountId: def.id }));
          }
          // Migração única: dados salvos antes da Fase 2 guardavam reais em float.
          // Convertemos pra centavos inteiros uma única vez (a flag moneyUnit
          // impede rodar de novo e corromper dados já migrados).
          if (p.moneyUnit !== "cents") {
            const toCents = (n) => (n == null ? n : Math.round(n * 100));
            txs = txs.map((t) => ({ ...t, amount: toCents(t.amount) }));
            accs = accs.map((a) => ({ ...a, initialBalance: toCents(a.initialBalance || 0) }));
            goalsData = Object.fromEntries(Object.entries(goalsData).map(([k, v]) => [k, v ? toCents(v) : v]));
            savingsData = savingsData.map((g) => ({ ...g, target: toCents(g.target), saved: toCents(g.saved || 0) }));
            recurringData = recurringData.map((r) => ({ ...r, amount: toCents(r.amount) }));
          }
          // Normaliza metas antigas (só tinham um número "saved") pro novo formato
          // com modo explícito e histórico de contribuições rastreável.
          savingsData = savingsData.map((g) => ({
            ...g,
            mode: g.mode || "virtual",
            contributions: g.contributions || (g.saved ? [{ id: uid(), date: todayISO(), amount: g.saved }] : []),
          }));
          setTransactions(txs);
          setGoals(goalsData);
          setProfileName(p.profileName || "Meu razão");
          setAccounts(accs);
          setRecurring(recurringData);
          setSavingsGoals(savingsData);
          setCustomCategories(p.customCategories || []);
          setBudgetSettings(p.budgetSettings || { defaultMonthly: null, overrides: {} });
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
        await window.storage.set("financas:data", JSON.stringify({ moneyUnit: "cents", transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories, budgetSettings }), false);
      } catch (e) {
        console.error("falha ao salvar", e);
      }
    })();
  }, [transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories, budgetSettings]);

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
        const status = day <= todayDay ? "pago" : "pendente";
        if (r.type === "transferencia") {
          additions.push({ id: uid(), type: "transferencia", date: dateStr, desc: r.desc, amount: r.amount, fromAccountId: r.fromAccountId, toAccountId: r.toAccountId, notes: "Gerado automaticamente pela recorrência", status, recurringId: r.id });
        } else {
          additions.push({
            id: uid(), type: r.type, date: dateStr, desc: r.desc, amount: r.amount,
            category: r.category, necessity: r.type === "gasto" ? (r.necessity || "necessario") : undefined,
            notes: "Gerado automaticamente pela recorrência", accountId: r.accountId,
            status, recurringId: r.id,
          });
        }
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
      // Distribuição determinística de centavos: divide inteiro e distribui o
      // resto (sempre < N centavos) 1 centavo por vez nas primeiras parcelas.
      const parts = Money.splitInstallments(tx.amount, installments);
      const group = uid();
      const today = todayISO();
      const news = parts.map((amount, i) => {
        const date = addMonths(tx.date, i);
        return {
          ...tx, id: uid(), date, amount,
          desc: `${tx.desc || catInfo(tx.category, false).label} (${i + 1}/${installments})`,
          status: date <= today ? "pago" : "pendente",
          installmentGroup: group, installmentIndex: i + 1, installmentTotal: installments,
        };
      });
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
    if (transactions.some((t) => t.accountId === id || t.fromAccountId === id || t.toAccountId === id)) { showToast("Essa conta tem lançamentos — apague-os ou migre-os antes."); return; }
    if (recurring.some((r) => r.accountId === id || r.fromAccountId === id || r.toAccountId === id)) { showToast("Essa conta tem recorrências vinculadas — apague-as ou migre-as antes."); return; }
    if (savingsGoals.some((g) => g.accountId === id)) { showToast("Essa conta é a reserva de uma meta de poupança — apague a meta primeiro."); return; }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    showToast("Conta removida.");
  }
  // Pagar fatura = transferência real de uma conta pro cartão, marcada com
  // qual fatura ela quita (linkedInvoice). Nunca inferimos pagamento só pelo
  // saldo — cada pagamento é uma operação explícita e rastreável.
  function payInvoice(cardId, invoiceKey, amountCents, fromAccountId) {
    if (!fromAccountId || fromAccountId === cardId || amountCents <= 0) { showToast("Escolha uma conta de origem válida."); return; }
    setTransactions((prev) => [...prev, {
      id: uid(), type: "transferencia", date: todayISO(), amount: amountCents,
      fromAccountId, toAccountId: cardId, linkedInvoice: invoiceKey,
      notes: `Pagamento da fatura ${invoiceLabel(invoiceKey)}`, status: "pago",
    }]);
    showToast("Fatura paga.");
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
    const status = date <= todayISO() ? "pago" : "pendente";
    if (r.type === "transferencia") {
      setTransactions((prev) => [...prev, { id: uid(), type: "transferencia", date, desc: r.desc, amount: r.amount, fromAccountId: r.fromAccountId, toAccountId: r.toAccountId, notes: "Gerado manualmente a partir da recorrência", status, recurringId: r.id }]);
    } else {
      setTransactions((prev) => [...prev, {
        id: uid(), type: r.type, date, desc: r.desc, amount: r.amount, category: r.category,
        necessity: r.type === "gasto" ? (r.necessity || "necessario") : undefined,
        notes: "Gerado manualmente a partir da recorrência", accountId: r.accountId,
        status, recurringId: r.id,
      }]);
    }
    showToast("Lançamento gerado.");
  }

  /* ---- metas de poupança ----
   * "virtual": só acompanhamento, não move dinheiro real — soma um histórico
   *   de aportes/resgates que o usuário registra manualmente.
   * "reserva": cria uma conta de verdade (aparece em Contas) e cada aporte/
   *   resgate é uma Transferência real entre essa reserva e outra conta —
   *   assim o dinheiro nunca é contado duas vezes no patrimônio.
   */
  function saveSavingsGoal(g) {
    if (g.id) {
      setSavingsGoals((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...g } : x)));
      showToast("Meta atualizada.");
    } else {
      const goalId = uid();
      if (g.mode === "reserva") {
        const accId = uid();
        setAccounts((prev) => [...prev, { id: accId, name: `Reserva: ${g.name}`, type: "poupanca", color: g.color, initialBalance: 0, linkedGoalId: goalId }]);
        setSavingsGoals((prev) => [...prev, { ...g, id: goalId, accountId: accId, contributions: [] }]);
      } else {
        setSavingsGoals((prev) => [...prev, { ...g, id: goalId, contributions: [] }]);
      }
      showToast("Meta criada.");
    }
    setShowSavingsForm(false);
  }
  function deleteSavingsGoal(id) {
    const g = savingsGoals.find((x) => x.id === id);
    if (g && g.mode === "reserva") {
      const bal = accountBalance(g.accountId, transactions, 0);
      if (bal !== 0) { showToast("Essa meta ainda tem dinheiro guardado — resgate tudo antes de apagar."); return; }
      setAccounts((prev) => prev.filter((a) => a.id !== g.accountId));
    }
    setSavingsGoals((prev) => prev.filter((x) => x.id !== id));
    showToast("Meta removida.");
  }
  function contributeSavings(goalId, delta, otherAccountId) {
    const g = savingsGoals.find((x) => x.id === goalId);
    if (!g) return;
    if (g.mode === "reserva") {
      if (!otherAccountId) { showToast("Escolha a conta de origem/destino."); return; }
      const amount = Math.abs(delta);
      const isAporte = delta > 0;
      setTransactions((prev) => [...prev, {
        id: uid(), type: "transferencia", date: todayISO(), amount,
        fromAccountId: isAporte ? otherAccountId : g.accountId,
        toAccountId: isAporte ? g.accountId : otherAccountId,
        notes: `${isAporte ? "Aporte" : "Resgate"} — meta: ${g.name}`, status: "pago",
      }]);
      showToast(isAporte ? "Aporte registrado." : "Resgate registrado.");
    } else {
      setSavingsGoals((prev) => prev.map((x) => (x.id === goalId ? { ...x, contributions: [...(x.contributions || []), { id: uid(), date: todayISO(), amount: delta }] } : x)));
    }
  }

  /* ---- categorias personalizadas ---- */
  /* ---- orçamento geral ---- */
  function setDefaultBudget(cents) {
    setBudgetSettings((prev) => ({ ...prev, defaultMonthly: cents || null }));
  }
  function setBudgetOverride(key, cents) {
    setBudgetSettings((prev) => {
      const overrides = { ...prev.overrides };
      if (cents) overrides[key] = cents;
      else delete overrides[key];
      return { ...prev, overrides };
    });
  }

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
    const header = ["data", "tipo", "descricao", "categoria", "conta", "conta_destino", "valor", "necessidade", "status", "notas"];
    const rows = transactions.map((t) => {
      if (t.type === "transferencia") {
        return [
          t.date, "transferência", csvEscape(t.desc || "Transferência"), "",
          accInfo(t.fromAccountId, accounts).name, accInfo(t.toAccountId, accounts).name,
          (t.amount / 100).toFixed(2).replace(".", ","), "", t.status || "pago", csvEscape(t.notes),
        ].join(";");
      }
      return [
        t.date, t.type, csvEscape(t.desc), catInfo(t.category, t.type === "receita", customCategories).label,
        accInfo(t.accountId, accounts).name, "", (t.amount / 100).toFixed(2).replace(".", ","),
        t.necessity ? NECESSITY[t.necessity].label : "", t.status || "pago", csvEscape(t.notes),
      ].join(";");
    });
    downloadFile([header.join(";"), ...rows].join("\n"), `lancamentos-${monthCursor}.csv`, "text/csv;charset=utf-8");
    showToast("CSV exportado.");
  }
  function exportBackup() {
    downloadFile(JSON.stringify({ moneyUnit: "cents", transactions, goals, profileName, accounts, recurring, savingsGoals, customCategories, budgetSettings }, null, 2), "backup-financas.json", "application/json");
    showToast("Backup exportado.");
  }
  function importBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const toCents = (n) => (n == null ? n : Math.round(n * 100));
        const legacy = data.moneyUnit !== "cents";
        let txs = data.transactions || [];
        let accs = data.accounts && data.accounts.length ? data.accounts : accounts;
        let goalsData = data.goals || {};
        let savingsData = data.savingsGoals || [];
        let recurringData = data.recurring || [];
        if (legacy) {
          txs = txs.map((t) => ({ ...t, amount: toCents(t.amount) }));
          accs = accs.map((a) => ({ ...a, initialBalance: toCents(a.initialBalance || 0) }));
          goalsData = Object.fromEntries(Object.entries(goalsData).map(([k, v]) => [k, v ? toCents(v) : v]));
          savingsData = savingsData.map((g) => ({ ...g, target: toCents(g.target), saved: toCents(g.saved || 0) }));
          recurringData = recurringData.map((r) => ({ ...r, amount: toCents(r.amount) }));
        }
        savingsData = savingsData.map((g) => ({
          ...g,
          mode: g.mode || "virtual",
          contributions: g.contributions || (g.saved ? [{ id: uid(), date: todayISO(), amount: g.saved }] : []),
        }));
        setTransactions(txs);
        setGoals(goalsData);
        setProfileName(data.profileName || profileName);
        setAccounts(accs);
        setRecurring(recurringData);
        setSavingsGoals(savingsData);
        setCustomCategories(data.customCategories || []);
        setBudgetSettings(data.budgetSettings || { defaultMonthly: null, overrides: {} });
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

  const nextMonthKey = useMemo(() => {
    const [y, m] = monthCursor.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
  }, [monthCursor]);

  // Previsão robusta = comprometido conhecido (parcelas futuras, recorrências,
  // faturas de cartão — tudo que já se SABE que vai acontecer) + uma estimativa
  // do gasto "do dia a dia" (o que sobra do histórico depois de tirar o que já
  // era estruturado). É mais confiável que só extrapolar a média dos últimos meses,
  // porque parte do que vem por aí já é fato, não estimativa.
  const previsaoRobusta = useMemo(() => {
    const commitments = buildCommitments(transactions, recurring, accounts, customCategories, 1);
    const comprometido = commitments.filter((i) => i.kind === "gasto" && monthKey(i.date) === nextMonthKey).reduce((s, i) => s + i.amount, 0);

    const monthsWithData = last6Months.filter((m) => m.gasto > 0).slice(-3);
    let variavel = 0;
    if (monthsWithData.length) {
      const variaveisPorMes = monthsWithData.map((m) => {
        const estruturado = transactions
          .filter((t) => t.type === "gasto" && monthKey(t.date) === m.key && (t.recurringId || t.installmentTotal))
          .reduce((s, t) => s + t.amount, 0);
        return Math.max(0, m.gasto - estruturado);
      });
      variavel = Math.round(variaveisPorMes.reduce((a, b) => a + b, 0) / variaveisPorMes.length);
    }
    if (comprometido === 0 && variavel === 0) return null;
    return { comprometido, variavel, total: comprometido + variavel };
  }, [transactions, recurring, accounts, customCategories, nextMonthKey, last6Months]);

  const previsaoChart = useMemo(() => {
    const valor = previsaoRobusta ? previsaoRobusta.total : (previsao ? previsao.valor : null);
    return [...last6Months.map((m) => ({ label: m.label, real: m.gasto, previsto: null })), { label: monthLabel(nextMonthKey) + " *", real: null, previsto: valor }];
  }, [last6Months, previsao, previsaoRobusta, nextMonthKey]);

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
      .filter((t) => filterAcc === "todas" || t.accountId === filterAcc || t.fromAccountId === filterAcc || t.toAccountId === filterAcc)
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
    { id: "compromissos", label: "Compromissos", icon: CalendarClock },
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
            gastosMes={gastosMes} previsao={previsao} previsaoRobusta={previsaoRobusta} healthScore={healthScore}
            deltaGasto={deltaGasto} deltaReceita={deltaReceita}
            transactions={filteredTx.slice(0, 5)} accounts={accounts} customCategories={customCategories}
            onEdit={(t) => { setEditing(t); setShowForm(true); }} onDelete={deleteTransaction}
            hasAny={transactions.length > 0}
            pendentes={pendentes} onTogglePaid={togglePaid}
            budget={budgetForMonth(monthCursor, budgetSettings)} monthCursor={monthCursor}
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
            onDelete={deleteAccount} onPayInvoice={payInvoice}
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

        {tab === "compromissos" && (
          <CompromissosTab transactions={transactions} recurring={recurring} accounts={accounts} customCategories={customCategories} />
        )}

        {tab === "metas" && (
          <MetasTab
            goals={goals} setGoals={setGoals} porCategoria={porCategoria} allCatsGasto={allCatsGasto}
            savingsGoals={savingsGoals} accounts={accounts} transactions={transactions}
            onAddSavings={() => setShowSavingsForm(true)}
            onContribute={contributeSavings} onDeleteSavings={deleteSavingsGoal}
            budgetSettings={budgetSettings} monthCursor={monthCursor} totalGasto={totalGasto}
            onSetDefaultBudget={setDefaultBudget} onSetBudgetOverride={setBudgetOverride}
          />
        )}

        {tab === "analises" && (
          <AnalisesTab
            last6Months={last6Months} previsaoChart={previsaoChart} previsao={previsao} previsaoRobusta={previsaoRobusta}
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
              setBudgetSettings({ defaultMonthly: null, overrides: {} });
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
function PainelTab({ totalGasto, totalReceita, saldoRealizado, saldoPrevisto, gastoPendenteMes, receitaPendenteMes, porCategoria, necessarioPct, desnecessarioPct, gastosMes, previsao, previsaoRobusta, healthScore, deltaGasto, deltaReceita, transactions, accounts, customCategories, onEdit, onDelete, hasAny, pendentes, onTogglePaid, budget, monthCursor }) {
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
        <StatBlock
          label="Previsão próx. mês"
          value={previsaoRobusta ? brl(previsaoRobusta.total) : (previsao ? brl(previsao.valor) : "—")}
          sub={previsaoRobusta ? `${brl(previsaoRobusta.comprometido)} já sabido + ${brl(previsaoRobusta.variavel)} estimado` : (previsao ? "com base nos últimos meses" : "sem histórico suficiente")}
          accent={C.goldSoft}
        />
      </div>

      {budget != null && (
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <SectionTitle icon={Target}>Orçamento do mês</SectionTitle>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: totalGasto > budget ? C.brickSoft : C.text }}>{brl(totalGasto)}</span>
            <span style={{ fontSize: 12, color: C.textFaint }}>de {brl(budget)} ({budget ? Math.min(100, Math.round((totalGasto / budget) * 100)) : 0}%)</span>
          </div>
          <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${budget ? Math.min(100, Math.round((totalGasto / budget) * 100)) : 0}%`, background: totalGasto > budget ? C.brick : C.sage, borderRadius: 4 }} />
          </div>
        </Card>
      )}

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
        const isTransfer = t.type === "transferencia";
        const isIncome = t.type === "receita";
        const info = isTransfer ? null : catInfo(t.category, isIncome, customCategories);
        const acc = isTransfer ? null : accInfo(t.accountId, accounts);
        const fromAcc = isTransfer ? accInfo(t.fromAccountId, accounts) : null;
        const toAcc = isTransfer ? accInfo(t.toAccountId, accounts) : null;
        const Icon = isTransfer ? ArrowRightLeft : info.icon;
        const iconColor = isTransfer ? C.goldSoft : info.color;
        const pending = t.status === "pendente";
        return (
          <div key={t.id} className="rowhover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 6px", borderBottom: `1px solid ${C.borderSoft}`, opacity: pending ? 0.75 : 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, background: iconColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={16} color={iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isTransfer ? (t.desc || `${fromAcc.name} → ${toAcc.name}`) : (t.desc || info.label)}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.textFaint }}>{new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                {!compact && isTransfer && <span style={{ fontSize: 11, color: C.textFaint }}>· {fromAcc.name} → {toAcc.name}</span>}
                {!compact && !isTransfer && <span style={{ fontSize: 11, color: C.textFaint }}>· {acc.name}</span>}
                {!compact && !isIncome && !isTransfer && <Stamp value={t.necessity} />}
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
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: isTransfer ? C.goldSoft : (isIncome ? C.sageSoft : C.brickSoft), whiteSpace: "nowrap" }}>
              {isTransfer ? "" : (isIncome ? "+" : "-")}{brl(t.amount)}
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
function ContasTab({ accounts, transactions, totalPatrimonio, onAdd, onEdit, onDelete, onPayInvoice }) {
  const [faturasOf, setFaturasOf] = useState(null);
  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={Landmark} right={<button onClick={onAdd} style={{ ...ghostBtnStyle, display: "flex", alignItems: "center", gap: 5, padding: "6px 10px" }}><Plus size={14} /> Nova conta</button>}>
          Patrimônio total
        </SectionTitle>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 30, fontWeight: 700, color: totalPatrimonio >= 0 ? C.sageSoft : C.brickSoft, marginTop: 8 }}>
          {brl(totalPatrimonio)}
        </div>
        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>Dívida de cartão já entra aqui (limite não conta como patrimônio).</div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
        {accounts.map((a) => {
          const type = ACCOUNT_TYPES.find((t) => t.id === a.type) || ACCOUNT_TYPES[0];
          const Icon = type.icon;
          const bal = accountBalance(a.id, transactions, a.initialBalance);
          const isCard = a.type === "cartao";
          const invoices = isCard ? cardInvoices(a, transactions, monthKey(todayISO())) : null;
          const currentInvoice = isCard ? invoices.find((i) => i.status === "aberta") : null;
          const openDebt = isCard ? Math.max(0, -bal) : 0;
          const available = isCard ? (a.limit || 0) - openDebt : null;
          return (
            <Card key={a.id} className="card-hover" style={{ padding: 16, transition: "border-color .2s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: a.color + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={a.color} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: C.textFaint }}>{type.label}{a.linkedGoalId ? " · reserva de meta" : ""}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
                  <button onClick={() => onEdit(a)} style={iconBtnStyle}><Pencil size={13} /></button>
                  <button onClick={() => onDelete(a.id)} style={iconBtnStyle}><Trash2 size={13} /></button>
                </div>
              </div>

              {isCard ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700, color: openDebt > 0 ? C.brickSoft : C.text }}>{brl(openDebt)}</span>
                    <span style={{ fontSize: 10.5, color: C.textFaint }}>em aberto</span>
                  </div>
                  <div style={{ height: 6, background: C.bgDeep, borderRadius: 4, overflow: "hidden", margin: "8px 0 6px" }}>
                    <div style={{ height: "100%", width: `${a.limit ? Math.min(100, Math.round((openDebt / a.limit) * 100)) : 0}%`, background: C.brick, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>{brl(Math.max(0, available))} disponível de {brl(a.limit || 0)}</div>
                  {currentInvoice && (
                    <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 8 }}>
                      Fatura atual: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{brl(currentInvoice.total)}</span> · fecha dia {a.closingDay || 1}
                    </div>
                  )}
                  <button onClick={() => setFaturasOf(a)} style={{ ...ghostBtnStyle, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 0" }}>
                    <Receipt size={13} /> Ver faturas
                  </button>
                </>
              ) : (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: bal >= 0 ? C.text : C.brickSoft }}>{brl(bal)}</div>
              )}
            </Card>
          );
        })}
      </div>
      {faturasOf && (
        <FaturasModal card={faturasOf} accounts={accounts} transactions={transactions} onClose={() => setFaturasOf(null)} onPayInvoice={onPayInvoice} />
      )}
    </div>
  );
}

function FaturasModal({ card, accounts, transactions, onClose, onPayInvoice }) {
  const invoices = cardInvoices(card, transactions, monthKey(todayISO()));
  const STATUS_INFO = {
    aberta: { label: "ABERTA", color: C.goldSoft },
    fechada: { label: "FECHADA · AGUARDANDO PAGAMENTO", color: C.brickSoft },
    vencida: { label: "VENCIDA", color: C.brick },
    paga: { label: "PAGA", color: C.sageSoft },
  };
  return (
    <ModalSheet title={`Faturas — ${card.name}`} onClose={onClose} maxWidth={560}>
      <div style={{ fontSize: 12, color: C.textFaint, marginBottom: 14 }}>
        Fecha todo dia {card.closingDay || 1}, vence dia {card.dueDay || 10}. Compras depois do fechamento já entram na fatura seguinte.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.filter((inv) => inv.total > 0 || inv.status === "aberta").map((inv) => (
          <Card key={inv.key} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.label}</span>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: STATUS_INFO[inv.status].color, border: `1px solid ${STATUS_INFO[inv.status].color}55`, borderRadius: 4, padding: "2px 6px" }}>
                {STATUS_INFO[inv.status].label}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
              <span>{inv.purchases.length} compra(s)</span>
              <span>vence {new Date(inv.due + "T00:00:00").toLocaleDateString("pt-BR")}</span>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700, marginBottom: inv.status === "fechada" || inv.status === "vencida" ? 10 : 0 }}>
              {brl(inv.total)}
              {inv.paid > 0 && <span style={{ fontSize: 11, color: C.sageSoft, fontWeight: 500, marginLeft: 8 }}>{brl(inv.paid)} já pago</span>}
            </div>
            {(inv.status === "fechada" || inv.status === "vencida") && (
              <PayInvoiceRow card={card} invoice={inv} accounts={accounts} onPayInvoice={onPayInvoice} />
            )}
          </Card>
        ))}
      </div>
    </ModalSheet>
  );
}
function PayInvoiceRow({ card, invoice, accounts, onPayInvoice }) {
  const others = accounts.filter((a) => a.id !== card.id);
  const [fromAcc, setFromAcc] = useState((others[0] && others[0].id) || "");
  const [val, setVal] = useState(Money.centsToInput(invoice.remaining));
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <select value={fromAcc} onChange={(e) => setFromAcc(e.target.value)} style={{ ...selectStyle, flex: "1 1 140px" }}>
        {others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" style={{ ...selectStyle, width: 100 }} />
      <button
        onClick={() => onPayInvoice(card.id, invoice.key, Money.parseToCents(val), fromAcc)}
        style={{ ...ghostBtnStyle, padding: "8px 12px", color: C.sageSoft, borderColor: C.sage + "55" }}
      >Pagar</button>
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
            const isTransfer = r.type === "transferencia";
            const info = isTransfer ? null : catInfo(r.category, r.type === "receita", customCategories);
            const acc = isTransfer ? null : accInfo(r.accountId, accounts);
            const fromAcc = isTransfer ? accInfo(r.fromAccountId, accounts) : null;
            const toAcc = isTransfer ? accInfo(r.toAccountId, accounts) : null;
            const Icon = isTransfer ? ArrowRightLeft : info.icon;
            const iconColor = isTransfer ? C.goldSoft : info.color;
            return (
              <Card key={r.id} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, opacity: r.active ? 1 : 0.55 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: iconColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} color={iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.desc}</div>
                  <div style={{ fontSize: 11.5, color: C.textFaint }}>
                    Dia {r.dayOfMonth} · {isTransfer ? `${fromAcc.name} → ${toAcc.name}` : `${acc.name} · ${info.label}`}
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: isTransfer ? C.goldSoft : (r.type === "receita" ? C.sageSoft : C.brickSoft) }}>
                  {isTransfer ? "" : (r.type === "receita" ? "+" : "-")}{brl(r.amount)}
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
/* --------------------------- Central de compromissos --------------------------- */
function CompromissosTab({ transactions, recurring, accounts, customCategories }) {
  const [monthsAhead, setMonthsAhead] = useState(3);
  const items = useMemo(() => buildCommitments(transactions, recurring, accounts, customCategories, monthsAhead), [transactions, recurring, accounts, customCategories, monthsAhead]);

  const totalGasto = items.filter((i) => i.kind === "gasto").reduce((s, i) => s + i.amount, 0);
  const totalReceita = items.filter((i) => i.kind === "receita").reduce((s, i) => s + i.amount, 0);

  const groups = useMemo(() => {
    const map = {};
    items.forEach((i) => {
      const key = monthKey(i.date);
      if (!map[key]) map[key] = [];
      map[key].push(i);
    });
    return Object.entries(map).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [items]);

  const KIND_INFO = {
    gasto: { color: C.brickSoft, sign: "-" },
    receita: { color: C.sageSoft, sign: "+" },
    transferencia: { color: C.goldSoft, sign: "" },
  };

  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={CalendarClock} right={
          <select value={monthsAhead} onChange={(e) => setMonthsAhead(parseInt(e.target.value, 10))} style={selectStyle}>
            <option value={1}>Próximo mês</option>
            <option value={3}>Próximos 3 meses</option>
            <option value={6}>Próximos 6 meses</option>
          </select>
        }>
          O que já está previsto
        </SectionTitle>
        <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase" }}>Comprometido (saída)</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: C.brickSoft }}>{brl(totalGasto)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase" }}>Esperado (entrada)</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: C.sageSoft }}>{brl(totalReceita)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textFaint, textTransform: "uppercase" }}>Saldo projetado</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: totalReceita - totalGasto >= 0 ? C.sageSoft : C.brickSoft }}>{brl(totalReceita - totalGasto)}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 10 }}>
          Inclui parcelas futuras, recorrências ainda não lançadas e faturas de cartão em aberto ou fechadas. Não conta como lançamento até acontecer de verdade.
        </div>
      </Card>

      {groups.length === 0 ? (
        <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "24px 0" }}>Nada previsto pra esse período — sem parcelas, recorrências ou faturas pendentes.</div>
      ) : (
        groups.map(([key, groupItems]) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px 2px" }}>{monthLabel(key)}</div>
            <Card style={{ padding: 6 }}>
              {groupItems.map((i) => {
                const info = KIND_INFO[i.kind] || KIND_INFO.transferencia;
                return (
                  <div key={i.id} className="rowhover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderBottom: `1px solid ${C.borderSoft}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{i.label}</div>
                      <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>
                        {new Date(i.date + "T00:00:00").toLocaleDateString("pt-BR")} · {i.source}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13.5, fontWeight: 600, color: info.color }}>{info.sign}{brl(i.amount)}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))
      )}
    </div>
  );
}

function MetasTab({ goals, setGoals, porCategoria, allCatsGasto, savingsGoals, accounts, transactions, onAddSavings, onContribute, onDeleteSavings, budgetSettings, monthCursor, totalGasto, onSetDefaultBudget, onSetBudgetOverride }) {
  const [sub, setSub] = useState("limites");
  const spentMap = Object.fromEntries(porCategoria.map((c) => [c.id, c.value]));
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setSub("limites")} style={{ ...ghostBtnStyle, background: sub === "limites" ? C.surfaceRaised : "transparent", color: sub === "limites" ? C.text : C.textMuted }}>Limites por categoria</button>
        <button onClick={() => setSub("poupanca")} style={{ ...ghostBtnStyle, background: sub === "poupanca" ? C.surfaceRaised : "transparent", color: sub === "poupanca" ? C.text : C.textMuted }}>Metas de poupança</button>
        <button onClick={() => setSub("orcamento")} style={{ ...ghostBtnStyle, background: sub === "orcamento" ? C.surfaceRaised : "transparent", color: sub === "orcamento" ? C.text : C.textMuted }}>Orçamento geral</button>
      </div>

      {sub === "orcamento" && (
        <OrcamentoGeral budgetSettings={budgetSettings} monthCursor={monthCursor} totalGasto={totalGasto} onSetDefaultBudget={onSetDefaultBudget} onSetBudgetOverride={onSetBudgetOverride} />
      )}

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
                <input type="text" inputMode="decimal" placeholder="Limite (R$)" defaultValue={goals[c.id] ? Money.centsToInput(goals[c.id]) : ""} key={goals[c.id] || "empty-" + c.id} onBlur={(e) => setGoals((prev) => ({ ...prev, [c.id]: Money.parseToCents(e.target.value) || undefined }))} style={{ ...selectStyle, width: "100%", marginBottom: 8 }} />
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
                const saved = savingsGoalSaved(g, accounts, transactions);
                const pct = g.target > 0 ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
                return (
                  <Card key={g.id} style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <PiggyBank size={15} color={g.color} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, marginLeft: 7 }}>{g.name}</span>
                      <span style={{ fontSize: 9, color: C.textFaint, border: `1px solid ${C.border}`, borderRadius: 4, padding: "1px 5px", marginLeft: 8 }}>
                        {g.mode === "reserva" ? "RESERVA REAL" : "ACOMPANHAMENTO"}
                      </span>
                      <button onClick={() => onDeleteSavings(g.id)} style={{ ...iconBtnStyle, marginLeft: "auto" }}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ height: 7, background: C.bgDeep, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: g.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: C.textMuted, marginBottom: 10 }}>
                      <span>{brl(saved)}</span><span>{brl(g.target)} ({pct}%)</span>
                    </div>
                    <SavingsContribute goal={g} accounts={accounts} onContribute={onContribute} />
                    {g.deadline && <SavingsForecast goal={g} saved={saved} accounts={accounts} transactions={transactions} />}
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
function OrcamentoGeral({ budgetSettings, monthCursor, totalGasto, onSetDefaultBudget, onSetBudgetOverride }) {
  const defaultVal = budgetSettings.defaultMonthly;
  const overrideVal = budgetSettings.overrides?.[monthCursor];
  const effective = overrideVal ?? defaultVal;
  const [defaultInput, setDefaultInput] = useState(defaultVal ? Money.centsToInput(defaultVal) : "");
  const [useOverride, setUseOverride] = useState(overrideVal != null);
  const [overrideInput, setOverrideInput] = useState(overrideVal ? Money.centsToInput(overrideVal) : "");

  const isCurrentMonth = monthCursor === monthKey(todayISO());
  const pct = effective ? Math.min(100, Math.round((totalGasto / effective) * 100)) : 0;
  const over = effective != null && totalGasto > effective;
  const remaining = effective != null ? effective - totalGasto : null;

  let ritmoTxt = null;
  if (isCurrentMonth && effective != null) {
    const today = new Date();
    const diasRestantes = Math.max(1, daysInMonth(monthCursor) - today.getDate() + 1);
    if (remaining > 0) ritmoTxt = `Dá pra gastar ${brl(Math.floor(remaining / diasRestantes))}/dia até o fim do mês sem estourar.`;
    else ritmoTxt = `Já passou do orçamento em ${brl(-remaining)}.`;
  }

  return (
    <div>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={Gauge}>Orçamento padrão mensal</SectionTitle>
        <div style={{ fontSize: 12, color: C.textFaint, margin: "6px 0 10px" }}>Um teto único pro mês inteiro, além dos limites por categoria. Vale pra todo mês, a não ser que você defina um valor específico abaixo.</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={defaultInput} onChange={(e) => setDefaultInput(e.target.value)} placeholder="0,00" inputMode="decimal" style={{ ...selectStyle, flex: 1 }} />
          <button onClick={() => onSetDefaultBudget(Money.parseToCents(defaultInput))} style={{ ...ghostBtnStyle, padding: "8px 14px" }}>Salvar</button>
          {defaultVal != null && (
            <button onClick={() => { setDefaultInput(""); onSetDefaultBudget(null); }} style={{ ...ghostBtnStyle, padding: "8px 10px", color: C.brickSoft, borderColor: C.brick + "55" }}><Trash2 size={13} /></button>
          )}
        </div>
      </Card>

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <SectionTitle icon={CalendarClock}>Valor específico pra {monthLabel(monthCursor)}</SectionTitle>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textMuted, margin: "8px 0", cursor: "pointer" }}>
          <input type="checkbox" checked={useOverride} onChange={(e) => { setUseOverride(e.target.checked); if (!e.target.checked) onSetBudgetOverride(monthCursor, null); }} />
          Usar um valor diferente do padrão neste mês
        </label>
        {useOverride && (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={overrideInput} onChange={(e) => setOverrideInput(e.target.value)} placeholder="0,00" inputMode="decimal" style={{ ...selectStyle, flex: 1 }} />
            <button onClick={() => onSetBudgetOverride(monthCursor, Money.parseToCents(overrideInput))} style={{ ...ghostBtnStyle, padding: "8px 14px" }}>Salvar</button>
          </div>
        )}
      </Card>

      {effective != null ? (
        <Card style={{ padding: 18 }}>
          <SectionTitle icon={Target}>Progresso — {monthLabel(monthCursor)}</SectionTitle>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700, color: over ? C.brickSoft : C.text }}>{brl(totalGasto)}</span>
            <span style={{ fontSize: 12, color: C.textFaint }}>de {brl(effective)} ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: C.bgDeep, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: over ? C.brick : C.sage, borderRadius: 4 }} />
          </div>
          {ritmoTxt && <div style={{ fontSize: 12.5, color: over ? C.brickSoft : C.textMuted, marginTop: 10 }}>{ritmoTxt}</div>}
        </Card>
      ) : (
        <div style={{ color: C.textFaint, fontSize: 13, textAlign: "center", padding: "12px 0" }}>Defina um orçamento padrão acima pra ver o progresso do mês.</div>
      )}
    </div>
  );
}

function SavingsContribute({ goal, accounts, onContribute }) {
  const [val, setVal] = useState("");
  const otherAccounts = accounts.filter((a) => a.id !== goal.accountId);
  const [otherAcc, setOtherAcc] = useState((otherAccounts[0] && otherAccounts[0].id) || "");
  const isReserva = goal.mode === "reserva";
  function go(sign) {
    const cents = Money.parseToCents(val);
    if (cents > 0) { onContribute(goal.id, sign * cents, isReserva ? otherAcc : undefined); setVal(""); }
  }
  return (
    <div>
      {isReserva && (
        <select value={otherAcc} onChange={(e) => setOtherAcc(e.target.value)} style={{ ...selectStyle, width: "100%", marginBottom: 6 }}>
          {otherAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Valor" inputMode="decimal" style={{ ...selectStyle, flex: 1, marginBottom: 0 }} />
        <button onClick={() => go(1)} style={{ ...ghostBtnStyle, padding: "6px 10px", color: C.sageSoft, borderColor: C.sage + "55" }}>+ guardar</button>
        <button onClick={() => go(-1)} style={{ ...ghostBtnStyle, padding: "6px 10px", color: C.brickSoft, borderColor: C.brick + "55" }}>- retirar</button>
      </div>
    </div>
  );
}
function SavingsForecast({ goal, saved, transactions }) {
  const remaining = goal.target - saved;
  const [dy, dm] = goal.deadline.split("-").map(Number);
  const [ty, tm] = todayISO().split("-").map(Number);
  const monthsLeft = Math.max(1, (dy - ty) * 12 + (dm - tm));
  const ritmoNecessario = remaining > 0 ? Math.ceil(remaining / monthsLeft) : 0;

  const history = goal.mode === "reserva"
    ? transactions.filter((t) => t.type === "transferencia" && t.toAccountId === goal.accountId && t.status === "pago")
    : (goal.contributions || []).filter((c) => c.amount > 0);
  const cutoff = monthKey(addMonths(todayISO(), -3));
  const last3 = history.filter((h) => monthKey(h.date) >= cutoff);
  const avgMonthly = last3.length ? last3.reduce((s, h) => s + h.amount, 0) / 3 : 0;

  let previsaoTxt = "sem ritmo suficiente pra prever ainda";
  if (remaining <= 0) previsaoTxt = "meta concluída 🎉";
  else if (avgMonthly > 0) {
    const meses = Math.ceil(remaining / avgMonthly);
    previsaoTxt = `~${meses} ${meses === 1 ? "mês" : "meses"} no ritmo atual`;
  }

  return (
    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 8, lineHeight: 1.6, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 8 }}>
      <div>Prazo: {new Date(goal.deadline + "T00:00:00").toLocaleDateString("pt-BR")}</div>
      {remaining > 0 && <div>Ritmo necessário: {brl(ritmoNecessario)}/mês pra chegar lá</div>}
      <div>Previsão: {previsaoTxt}</div>
    </div>
  );
}

/* ------------------------------ Análises ------------------------------ */
function AnalisesTab({ last6Months, previsaoChart, previsao, previsaoRobusta, porNecessidade, totalGasto, patrimonioEvolucao }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 18 }}>
        <SectionTitle icon={LineChartIcon}>Receitas x gastos — 6 meses</SectionTitle>
        <div style={{ height: 230, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={{ stroke: C.border }} />
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 100 / 1000)}k`} />
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
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 100 / 1000)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="real" name="Real" stroke={C.gold} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="previsto" name="Previsto" stroke={C.goldSoft} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {previsaoRobusta ? (
          <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5 }}>
            <div><span style={{ color: C.textFaint }}>Já comprometido</span> · <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.brickSoft }}>{brl(previsaoRobusta.comprometido)}</span></div>
            <div><span style={{ color: C.textFaint }}>+ Estimado (dia a dia)</span> · <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: C.goldSoft }}>{brl(previsaoRobusta.variavel)}</span></div>
            <div><span style={{ color: C.textFaint }}>= Previsão total</span> · <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{brl(previsaoRobusta.total)}</span></div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 6 }}>* projeção simples com base na média ponderada dos últimos 3 meses.</div>
        )}
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
              <YAxis stroke={C.textFaint} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 100 / 1000)}k`} />
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
  const [amount, setAmount] = useState(initial ? Money.centsToInput(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category || CATS[0].id);
  const [necessity, setNecessity] = useState(initial?.necessity || "necessario");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [accountId, setAccountId] = useState(initial?.accountId || (accounts[0] && accounts[0].id) || "");
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId || (accounts[0] && accounts[0].id) || "");
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId || (accounts[1] && accounts[1].id) || "");
  const [status, setStatus] = useState(initial?.status || "pago");
  const [installments, setInstallments] = useState(1);

  const cats = type === "gasto" ? allGastoCats(customCategories) : REC_CATS;
  useEffect(() => {
    if (type !== "transferencia" && !cats.find((c) => c.id === category)) setCategory(cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const amountCents = Money.parseToCents(amount);

  function submit(e) {
    e.preventDefault();
    if (!amountCents || amountCents <= 0 || !date) return;
    if (type === "transferencia") {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
      onSave({ id: initial?.id, type, date, desc: desc.trim(), amount: amountCents, fromAccountId, toAccountId, status, notes: notes.trim(), installments: 1 });
      return;
    }
    if (!accountId) return;
    onSave({
      id: initial?.id, type, date, desc: desc.trim(), amount: amountCents, category,
      necessity: type === "gasto" ? necessity : undefined, notes: notes.trim(),
      accountId, status, installments: type === "gasto" && !isEdit ? installments : 1,
    });
  }

  return (
    <ModalSheet title={isEdit ? "Editar lançamento" : "Novo lançamento"} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["gasto", "receita", "transferencia"].map((t) => {
            const active = type === t;
            const tone = t === "gasto" ? C.brick : t === "receita" ? C.sage : C.gold;
            const toneSoft = t === "gasto" ? C.brickSoft : t === "receita" ? C.sageSoft : C.goldSoft;
            return (
              <button type="button" key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${active ? tone : C.border}`,
                background: active ? tone + "22" : "transparent",
                color: active ? toneSoft : C.textMuted, fontWeight: 600, fontSize: 12.5,
              }}>{t === "gasto" ? "Gasto" : t === "receita" ? "Receita" : "Transferência"}</button>
            );
          })}
        </div>

        <FieldLabel>Descrição {type === "transferencia" ? "(opcional)" : ""}</FieldLabel>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={type === "transferencia" ? "Ex.: Pagar fatura, guardar reserva..." : "Ex.: Almoço, Uber, aluguel..."} style={fullInput} />

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

        {type === "transferencia" ? (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>De</FieldLabel>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} style={fullInput}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Para</FieldLabel>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} style={fullInput}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
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
        )}

        {type === "transferencia" && fromAccountId && fromAccountId === toAccountId && (
          <div style={{ fontSize: 11.5, color: C.brickSoft, marginTop: -2, marginBottom: 8 }}>A conta de origem e destino não podem ser iguais.</div>
        )}

        <FieldLabel>Status</FieldLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["pago", "pendente"].map((s) => (
            <button type="button" key={s} onClick={() => setStatus(s)} style={{
              flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${status === s ? C.gold : C.border}`, background: status === s ? C.gold + "1f" : "transparent",
              color: status === s ? C.gold : C.textMuted,
            }}>{s === "pago" ? "Pago" : (type === "receita" ? "A receber" : type === "transferencia" ? "Agendada" : "A pagar")}</button>
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
            {installments > 1 && (
              <div style={{ fontSize: 11.5, color: C.textFaint, marginTop: -2, marginBottom: 8 }}>
                {installments}x — parcelas de {brl(Math.floor(amountCents / installments))} a {brl(Math.ceil(amountCents / installments))} (centavos restantes vão pras primeiras)
              </div>
            )}
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
  const [initialBalance, setInitialBalance] = useState(initial ? Money.centsToInput(initial.initialBalance) : "0");
  const [limit, setLimit] = useState(initial?.limit ? Money.centsToInput(initial.limit) : "");
  const [closingDay, setClosingDay] = useState(initial?.closingDay || 1);
  const [dueDay, setDueDay] = useState(initial?.dueDay || 10);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const base = { id: initial?.id, name: name.trim(), type, color, initialBalance: Money.parseToCents(initialBalance) };
    if (type === "cartao") {
      onSave({ ...base, limit: Money.parseToCents(limit), closingDay: Math.min(28, Math.max(1, parseInt(closingDay, 10) || 1)), dueDay: Math.min(28, Math.max(1, parseInt(dueDay, 10) || 1)) });
    } else {
      onSave(base);
    }
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
        {type === "cartao" ? (
          <>
            <FieldLabel>Limite (R$)</FieldLabel>
            <input value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" placeholder="0,00" style={fullInput} required />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <FieldLabel>Dia de fechamento</FieldLabel>
                <input type="number" min={1} max={28} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} style={fullInput} />
              </div>
              <div style={{ flex: 1 }}>
                <FieldLabel>Dia de vencimento</FieldLabel>
                <input type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} style={fullInput} />
              </div>
            </div>
          </>
        ) : (
          <>
            <FieldLabel>Saldo inicial (R$)</FieldLabel>
            <input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} inputMode="decimal" style={fullInput} />
          </>
        )}
        <button type="submit" style={{ ...primaryBtnStyle, width: "100%", marginTop: 10, padding: "12px 0", fontSize: 14 }}>{isEdit ? "Salvar alterações" : "Criar conta"}</button>
      </form>
    </ModalSheet>
  );
}

function RecurringForm({ initial, accounts, customCategories, onClose, onSave }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || "gasto");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [amount, setAmount] = useState(initial ? Money.centsToInput(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category || CATS[0].id);
  const [necessity, setNecessity] = useState(initial?.necessity || "necessario");
  const [accountId, setAccountId] = useState(initial?.accountId || (accounts[0] && accounts[0].id) || "");
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId || (accounts[0] && accounts[0].id) || "");
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId || (accounts[1] && accounts[1].id) || "");
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth || 5);
  const [active, setActive] = useState(initial?.active ?? true);

  const cats = type === "gasto" ? allGastoCats(customCategories) : REC_CATS;
  useEffect(() => {
    if (type !== "transferencia" && !cats.find((c) => c.id === category)) setCategory(cats[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function submit(e) {
    e.preventDefault();
    const cents = Money.parseToCents(amount);
    if (!cents || cents <= 0 || !desc.trim()) return;
    const base = { id: initial?.id, type, desc: desc.trim(), amount: cents, dayOfMonth: Math.min(28, Math.max(1, parseInt(dayOfMonth, 10) || 1)), active };
    if (type === "transferencia") {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
      onSave({ ...base, fromAccountId, toAccountId });
    } else {
      if (!accountId) return;
      onSave({ ...base, category, necessity: type === "gasto" ? necessity : undefined, accountId });
    }
  }
  return (
    <ModalSheet title={isEdit ? "Editar recorrência" : "Nova recorrência"} onClose={onClose}>
      <form onSubmit={submit}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {["gasto", "receita", "transferencia"].map((t) => {
            const active2 = type === t;
            const tone = t === "gasto" ? C.brick : t === "receita" ? C.sage : C.gold;
            const toneSoft = t === "gasto" ? C.brickSoft : t === "receita" ? C.sageSoft : C.goldSoft;
            return (
              <button type="button" key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: "9px 0", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${active2 ? tone : C.border}`, background: active2 ? tone + "22" : "transparent",
                color: active2 ? toneSoft : C.textMuted, fontWeight: 600, fontSize: 12.5,
              }}>{t === "gasto" ? "Gasto" : t === "receita" ? "Receita" : "Transferência"}</button>
            );
          })}
        </div>
        <FieldLabel>Descrição</FieldLabel>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={type === "transferencia" ? "Ex.: Investir todo mês, pagar fatura" : "Ex.: Netflix, Salário, Aluguel"} style={fullInput} required />
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
        {type === "transferencia" ? (
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>De</FieldLabel>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} style={fullInput}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Para</FieldLabel>
              <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} style={fullInput}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        ) : (
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
        )}
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
  const [mode, setMode] = useState("virtual");

  function submit(e) {
    e.preventDefault();
    const cents = Money.parseToCents(target);
    if (!name.trim() || !cents || cents <= 0) return;
    onSave({ name: name.trim(), target: cents, deadline: deadline || undefined, color, mode });
  }
  return (
    <ModalSheet title="Nova meta de poupança" onClose={onClose}>
      <form onSubmit={submit}>
        <FieldLabel>Nome da meta</FieldLabel>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Viagem, Reserva de emergência" style={fullInput} required />
        <FieldLabel>Como quer acompanhar?</FieldLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          <button type="button" onClick={() => setMode("virtual")} style={{
            flex: 1, padding: "9px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${mode === "virtual" ? C.gold : C.border}`, background: mode === "virtual" ? C.gold + "1f" : "transparent",
            color: mode === "virtual" ? C.gold : C.textMuted,
          }}>Só acompanhamento</button>
          <button type="button" onClick={() => setMode("reserva")} style={{
            flex: 1, padding: "9px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
            border: `1.5px solid ${mode === "reserva" ? C.gold : C.border}`, background: mode === "reserva" ? C.gold + "1f" : "transparent",
            color: mode === "reserva" ? C.gold : C.textMuted,
          }}>Reserva real</button>
        </div>
        <div style={{ fontSize: 11, color: C.textFaint, lineHeight: 1.5, marginBottom: 10, display: "flex", gap: 6 }}>
          <Info size={12} style={{ flexShrink: 0, marginTop: 2 }} />
          {mode === "virtual"
            ? "Só um número que você atualiza manualmente — não mexe em conta nenhuma."
            : "Cria uma conta dedicada de verdade. Cada aporte é uma transferência real de outra conta, então o dinheiro nunca é contado duas vezes."}
        </div>
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
