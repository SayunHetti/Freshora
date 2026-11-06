import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type Supplier = { id: number; name: string; active: boolean };
type Balance = {
  supplierId: number;
  name: string;
  creditLimit: number;
  creditTotal: number;
  paidTotal: number;
  balance: number;
  overLimit: boolean;
  minimumPayment: number;
};
type Payment = {
  id: number;
  supplierId: number;
  paymentDate: string;
  amount: number;
  method: string;
  notes: string | null;
};

const METHODS = [
  ["CASH", "Cash"],
  ["BANK_TRANSFER", "Bank transfer"],
  ["CHEQUE", "Cheque"],
];
const today = () => new Date().toLocaleDateString("en-CA");
const money = (n: number) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const emptyForm = () => ({ supplierId: "", paymentDate: today(), amount: "", method: "CASH", notes: "" });

export default function SupplierPayments() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterSupplier, setFilterSupplier] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadBalances() {
    const res = await api("/api/supplier-balances");
    if (res.ok) setBalances(await res.json());
  }

  async function loadPayments() {
    const q = filterSupplier ? `?supplierId=${filterSupplier}` : "";
    const res = await api(`/api/supplier-payments${q}`);
    if (res.ok) setPayments(await res.json());
  }

  useEffect(() => {
    (async () => {
      const s = await api("/api/suppliers?includeInactive=true");
      if (s.ok) setSuppliers(await s.json());
    })();
    loadBalances();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [filterSupplier]);

  const supplierName = (id: number) => suppliers.find((s) => s.id === id)?.name ?? `#${id}`;
  const methodLabel = (m: string) => METHODS.find(([k]) => k === m)?.[1] ?? m;

  function startEdit(p: Payment) {
    setEditingId(p.id);
    setForm({
      supplierId: String(p.supplierId),
      paymentDate: p.paymentDate,
      amount: String(p.amount),
      method: p.method,
      notes: p.notes ?? "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = {
        supplierId: Number(form.supplierId),
        paymentDate: form.paymentDate,
        amount: form.amount === "" ? null : Number(form.amount),
        method: form.method,
        notes: form.notes,
      };
      const res = await api(
        editingId ? `/api/supplier-payments/${editingId}` : "/api/supplier-payments",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Could not save");
        return;
      }
      cancelEdit();
      loadPayments();
      loadBalances();
    } catch {
      setError("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Payment) {
    if (!confirm("Delete this payment? This cannot be undone.")) return;
    await api(`/api/supplier-payments/${p.id}`, { method: "DELETE" });
    loadPayments();
    loadBalances();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <Link to="/">← Dashboard</Link>
      <h2>Supplier payments</h2>

      <h3>Balances</h3>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Supplier</th><th>Credit limit</th><th>Bought on credit</th>
              <th>Paid</th><th>Balance owed</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.supplierId} style={b.overLimit ? { color: "#b00020", fontWeight: 600 } : undefined}>
                <td>{b.name}</td>
                <td>{money(b.creditLimit)}</td>
                <td>{money(b.creditTotal)}</td>
                <td>{money(b.paidTotal)}</td>
                <td>{money(b.balance)}</td>
                <td>
                  {b.overLimit ? `Over limit. Pay at least Rs ${money(b.minimumPayment)}` : "OK"}
                </td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr><td colSpan={6}>No suppliers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <h3>{editingId ? `Edit payment #${editingId}` : "Record a payment to a supplier"}</h3>
        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
          <option value="">Select a supplier...</option>
          {suppliers.filter((s) => s.active || String(s.id) === form.supplierId).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <label>
          Date{" "}
          <input
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
            required
          />
        </label>
        <input
          type="number" min="0" step="0.01" placeholder="Amount (Rs)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
          {METHODS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {error && <div style={{ color: "crimson" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update" : "Add payment"}
          </button>
          {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <h3>Payment history</h3>
      <select
        value={filterSupplier}
        onChange={(e) => setFilterSupplier(e.target.value)}
        style={{ marginBottom: 8 }}
      >
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Date</th><th>Supplier</th><th>Amount</th><th>Method</th><th>Notes</th><th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.paymentDate}</td>
                <td>{supplierName(p.supplierId)}</td>
                <td>{money(p.amount)}</td>
                <td>{methodLabel(p.method)}</td>
                <td>{p.notes}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => startEdit(p)}>Edit</button>{" "}
                  <button onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr><td colSpan={6}>No payments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}