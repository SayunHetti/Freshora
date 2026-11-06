import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type Buyer = { id: number; name: string; active: boolean };
type CheckRow = {
  buyerId: number;
  name: string;
  type: string;
  dailyCashLimit: number | null;
  cashGiven: number;
  cashSpent: number;
  creditPurchases: number;
  cashReturned: number;
  difference: number;
  flagged: boolean;
};
type LogEntry = { id: number; buyerId: number; logDate: string; amount: number; category: string; notes: string | null };
type ReturnEntry = { id: number; buyerId: number; returnDate: string; amount: number; notes: string | null };

const CATEGORIES = [
  ["CASH_GIVEN", "Cash given"],
  ["CHEQUE", "Cheque"],
  ["BANK_WITHDRAWAL", "Bank withdrawal"],
];
const today = () => new Date().toLocaleDateString("en-CA");
const money = (n: number) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyLog = { buyerId: "", amount: "", category: "CASH_GIVEN", notes: "" };
const emptyReturn = { buyerId: "", amount: "", notes: "" };

export default function Cash() {
  const [date, setDate] = useState(today());
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [check, setCheck] = useState<CheckRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [returns, setReturns] = useState<ReturnEntry[]>([]);

  const [logForm, setLogForm] = useState(emptyLog);
  const [logEditing, setLogEditing] = useState<number | null>(null);
  const [logError, setLogError] = useState("");

  const [retForm, setRetForm] = useState(emptyReturn);
  const [retEditing, setRetEditing] = useState<number | null>(null);
  const [retError, setRetError] = useState("");

  useEffect(() => {
    (async () => {
      const b = await api("/api/buyers?includeInactive=true");
      if (b.ok) setBuyers(await b.json());
    })();
  }, []);

  async function load() {
    if (!date) return;
    const [c, l, r] = await Promise.all([
      api(`/api/daily-cash-check?date=${date}`),
      api(`/api/cash-log?date=${date}`),
      api(`/api/cash-returns?date=${date}`),
    ]);
    if (c.ok) setCheck(await c.json());
    if (l.ok) setLogs(await l.json());
    if (r.ok) setReturns(await r.json());
  }

  useEffect(() => {
    load();
  }, [date]);

  const buyerName = (id: number) => buyers.find((b) => b.id === id)?.name ?? `#${id}`;
  const catLabel = (c: string) => CATEGORIES.find(([k]) => k === c)?.[1] ?? c;
  const buyerOptions = (selected: string) =>
    buyers.filter((b) => b.active || String(b.id) === selected);

  // ----- cash given -----
  async function saveLog(e: FormEvent) {
    e.preventDefault();
    setLogError("");
    const body = {
      buyerId: Number(logForm.buyerId),
      logDate: date,
      amount: logForm.amount === "" ? null : Number(logForm.amount),
      category: logForm.category,
      notes: logForm.notes,
    };
    const res = await api(logEditing ? `/api/cash-log/${logEditing}` : "/api/cash-log", {
      method: logEditing ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLogError(data?.message ?? "Could not save");
      return;
    }
    setLogEditing(null);
    setLogForm(emptyLog);
    load();
  }

  function editLog(l: LogEntry) {
    setLogEditing(l.id);
    setLogForm({ buyerId: String(l.buyerId), amount: String(l.amount), category: l.category, notes: l.notes ?? "" });
    setLogError("");
  }

  async function removeLog(l: LogEntry) {
    if (!confirm("Delete this entry?")) return;
    await api(`/api/cash-log/${l.id}`, { method: "DELETE" });
    load();
  }

  // ----- cash returned -----
  async function saveReturn(e: FormEvent) {
    e.preventDefault();
    setRetError("");
    const body = {
      buyerId: Number(retForm.buyerId),
      returnDate: date,
      amount: retForm.amount === "" ? null : Number(retForm.amount),
      notes: retForm.notes,
    };
    const res = await api(retEditing ? `/api/cash-returns/${retEditing}` : "/api/cash-returns", {
      method: retEditing ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setRetError(data?.message ?? "Could not save");
      return;
    }
    setRetEditing(null);
    setRetForm(emptyReturn);
    load();
  }

  function editReturn(r: ReturnEntry) {
    setRetEditing(r.id);
    setRetForm({ buyerId: String(r.buyerId), amount: String(r.amount), notes: r.notes ?? "" });
    setRetError("");
  }

  async function removeReturn(r: ReturnEntry) {
    if (!confirm("Delete this entry?")) return;
    await api(`/api/cash-returns/${r.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <Link to="/">← Dashboard</Link>
      <h2>Buyer cash</h2>

      <label>
        Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <h3>Daily cash check</h3>
      <p style={{ marginTop: 0 }}>Difference = cash given − cash spent − cash returned. It should be 0.</p>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Buyer</th><th>Given</th><th>Spent (cash)</th>
              <th>Credit purchases</th><th>Returned</th><th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {check.map((c) => (
              <tr key={c.buyerId} style={c.flagged ? { color: "#b00020", fontWeight: 600 } : undefined}>
                <td>{c.name}</td>
                <td>{money(c.cashGiven)}</td>
                <td>{money(c.cashSpent)}</td>
                <td>{money(c.creditPurchases)}</td>
                <td>{money(c.cashReturned)}</td>
                <td>{money(c.difference)}{c.flagged ? " ⚠" : " ✓"}</td>
              </tr>
            ))}
            {check.length === 0 && (
              <tr><td colSpan={6}>No buyers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={saveLog} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <h3>{logEditing ? "Edit cash given" : `Cash given to a buyer on ${date}`}</h3>
        <select value={logForm.buyerId} onChange={(e) => setLogForm({ ...logForm, buyerId: e.target.value })} required>
          <option value="">Select a buyer...</option>
          {buyerOptions(logForm.buyerId).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="number" min="0" step="0.01" placeholder="Amount (Rs)"
          value={logForm.amount}
          onChange={(e) => setLogForm({ ...logForm, amount: e.target.value })}
          required
        />
        <select value={logForm.category} onChange={(e) => setLogForm({ ...logForm, category: e.target.value })}>
          {CATEGORIES.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Notes (optional)"
          value={logForm.notes}
          onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
        />
        {logError && <div style={{ color: "crimson" }}>{logError}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">{logEditing ? "Update" : "Add"}</button>
          {logEditing && (
            <button type="button" onClick={() => { setLogEditing(null); setLogForm(emptyLog); setLogError(""); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Buyer</th><th>Amount</th><th>Category</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{buyerName(l.buyerId)}</td>
                <td>{money(l.amount)}</td>
                <td>{catLabel(l.category)}</td>
                <td>{l.notes}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => editLog(l)}>Edit</button>{" "}
                  <button onClick={() => removeLog(l)}>Delete</button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5}>No cash given on this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={saveReturn} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <h3>{retEditing ? "Edit cash returned" : `Cash returned by a buyer on ${date}`}</h3>
        <select value={retForm.buyerId} onChange={(e) => setRetForm({ ...retForm, buyerId: e.target.value })} required>
          <option value="">Select a buyer...</option>
          {buyerOptions(retForm.buyerId).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="number" min="0" step="0.01" placeholder="Amount (Rs)"
          value={retForm.amount}
          onChange={(e) => setRetForm({ ...retForm, amount: e.target.value })}
          required
        />
        <input
          placeholder="Notes (optional)"
          value={retForm.notes}
          onChange={(e) => setRetForm({ ...retForm, notes: e.target.value })}
        />
        {retError && <div style={{ color: "crimson" }}>{retError}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit">{retEditing ? "Update" : "Add"}</button>
          {retEditing && (
            <button type="button" onClick={() => { setRetEditing(null); setRetForm(emptyReturn); setRetError(""); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Buyer</th><th>Amount</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {returns.map((r) => (
              <tr key={r.id}>
                <td>{buyerName(r.buyerId)}</td>
                <td>{money(r.amount)}</td>
                <td>{r.notes}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => editReturn(r)}>Edit</button>{" "}
                  <button onClick={() => removeReturn(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr><td colSpan={4}>No cash returned on this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}