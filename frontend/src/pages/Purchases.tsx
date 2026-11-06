import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

type Named = { id: number; name: string; active: boolean };
type Item = Named & { unit: string };
type Purchase = {
  id: number;
  buyerId: number;
  supplierId: number;
  itemId: number;
  purchaseDate: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
  paymentType: string;
  notes: string | null;
};

const today = () => new Date().toLocaleDateString("en-CA");
const money = (n: number) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyForm = () => ({
  buyerId: "",
  supplierId: "",
  itemId: "",
  purchaseDate: today(),
  quantity: "",
  pricePerUnit: "",
  paymentType: "CASH",
  notes: "",
});

export default function Purchases() {
  const [buyers, setBuyers] = useState<Named[]>([]);
  const [suppliers, setSuppliers] = useState<Named[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [rows, setRows] = useState<Purchase[]>([]);
  const [filterDate, setFilterDate] = useState(today());
  const [filterBuyer, setFilterBuyer] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [b, s, i] = await Promise.all([
        api("/api/buyers?includeInactive=true"),
        api("/api/suppliers?includeInactive=true"),
        api("/api/items?includeInactive=true"),
      ]);
      if (b.ok) setBuyers(await b.json());
      if (s.ok) setSuppliers(await s.json());
      if (i.ok) setItems(await i.json());
    })();
  }, []);

  async function load() {
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    if (filterBuyer) params.set("buyerId", filterBuyer);
    const res = await api(`/api/purchases?${params}`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    load();
  }, [filterDate, filterBuyer]);

  const nameOf = (list: Named[], id: number) => list.find((x) => x.id === id)?.name ?? `#${id}`;
  const preview =
    form.quantity !== "" && form.pricePerUnit !== ""
      ? Number(form.quantity) * Number(form.pricePerUnit)
      : null;

  const cashTotal = rows.filter((r) => r.paymentType === "CASH").reduce((a, r) => a + Number(r.total), 0);
  const creditTotal = rows.filter((r) => r.paymentType === "CREDIT").reduce((a, r) => a + Number(r.total), 0);

  function startEdit(p: Purchase) {
    setEditingId(p.id);
    setForm({
      buyerId: String(p.buyerId),
      supplierId: String(p.supplierId),
      itemId: String(p.itemId),
      purchaseDate: p.purchaseDate,
      quantity: String(p.quantity),
      pricePerUnit: String(p.pricePerUnit),
      paymentType: p.paymentType,
      notes: p.notes ?? "",
    });
    setError("");
    setWarning("");
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
    setWarning("");
    setSaving(true);
    try {
      const body = {
        buyerId: Number(form.buyerId),
        supplierId: Number(form.supplierId),
        itemId: Number(form.itemId),
        purchaseDate: form.purchaseDate,
        quantity: form.quantity === "" ? null : Number(form.quantity),
        pricePerUnit: form.pricePerUnit === "" ? null : Number(form.pricePerUnit),
        paymentType: form.paymentType,
        notes: form.notes,
      };
      const res = await api(
        editingId ? `/api/purchases/${editingId}` : "/api/purchases",
        { method: editingId ? "PUT" : "POST", body: JSON.stringify(body) }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "Could not save");
        return;
      }
      if (data?.warning) setWarning(data.warning);
      if (editingId) {
        cancelEdit();
      } else {
        // keep buyer, supplier, date and type for quick entry of the next purchase
        setForm({ ...form, itemId: "", quantity: "", pricePerUnit: "", notes: "" });
      }
      load();
    } catch {
      setError("Cannot reach the server");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Purchase) {
    if (!confirm("Delete this purchase? This cannot be undone.")) return;
    await api(`/api/purchases/${p.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <Link to="/">← Dashboard</Link>
      <h2>Purchases</h2>

      {warning && (
        <div style={{ background: "#fde8e8", color: "#b00020", padding: 12, marginBottom: 16, fontWeight: 600 }}>
          ⚠ {warning}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        <h3>{editingId ? `Edit purchase #${editingId}` : "Add purchase"}</h3>
        <select value={form.buyerId} onChange={(e) => setForm({ ...form, buyerId: e.target.value })} required>
          <option value="">Select a buyer...</option>
          {buyers.filter((b) => b.active || String(b.id) === form.buyerId).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
          <option value="">Select a supplier...</option>
          {suppliers.filter((s) => s.active || String(s.id) === form.supplierId).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })} required>
          <option value="">Select an item...</option>
          {items.filter((i) => i.active || String(i.id) === form.itemId).map((i) => (
            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
          ))}
        </select>
        <label>
          Date{" "}
          <input
            type="date"
            value={form.purchaseDate}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            required
          />
        </label>
        <input
          type="number" min="0" step="0.001" placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          required
        />
        <input
          type="number" min="0" step="0.01" placeholder="Price per unit (Rs)"
          value={form.pricePerUnit}
          onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
          required
        />
        <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
          <option value="CASH">Cash</option>
          <option value="CREDIT">Credit</option>
        </select>
        {preview !== null && <div>Total: <strong>Rs {money(preview)}</strong></div>}
        <input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {error && <div style={{ color: "crimson" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update" : "Add purchase"}
          </button>
          {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
        </div>
      </form>

      <h3>Find purchases</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <label>
          Date <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        </label>
        <button type="button" onClick={() => setFilterDate("")}>All dates</button>
        <select value={filterBuyer} onChange={(e) => setFilterBuyer(e.target.value)}>
          <option value="">All buyers</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <p>
        Cash: <strong>Rs {money(cashTotal)}</strong> · Credit: <strong>Rs {money(creditTotal)}</strong>
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Date</th><th>Buyer</th><th>Supplier</th><th>Item</th>
              <th>Qty</th><th>Price</th><th>Total</th><th>Type</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.purchaseDate}</td>
                <td>{nameOf(buyers, p.buyerId)}</td>
                <td>{nameOf(suppliers, p.supplierId)}</td>
                <td>{nameOf(items, p.itemId)}</td>
                <td>{Number(p.quantity).toLocaleString()}</td>
                <td>{money(p.pricePerUnit)}</td>
                <td>{money(p.total)}</td>
                <td>{p.paymentType === "CASH" ? "Cash" : "Credit"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => startEdit(p)}>Edit</button>{" "}
                  <button onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9}>No purchases found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}