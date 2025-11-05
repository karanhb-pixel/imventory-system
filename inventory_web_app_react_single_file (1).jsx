/*
Inventory Web App — Single-file React component
- Tailwind CSS classes are used for styling (no Tailwind import here; add Tailwind in your project or use CodeSandbox template with Tailwind).
- Persisted in localStorage under key: "inventoryApp.data"

How to run:
1) Create a Vite React project (or CodeSandbox) and ensure Tailwind is configured.
2) Replace App.jsx/App.tsx contents with this file.
3) Start dev server. No backend required.

Features included:
- Add items and add purchase entries (date, qty, unit price, supplier)
- Each item's purchases are stored and you can see "Last purchase" and price change
- Search items, quick add purchase, export CSV/JSON, import CSV/JSON
- LocalStorage persistence and import/export JSON/CSV
*/

import React, { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "inventoryApp.data";

function formatDateISO(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString();
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    return JSON.parse(raw);
  } catch (e) {
    console.error("loadData", e);
    return { items: [] };
  }
}

function saveData(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function App() {
  const [state, setState] = useState(() => loadData());
  const [filter, setFilter] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  // New item form
  const [newName, setNewName] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    saveData(state);
  }, [state]);

  // derived list with last purchase
  const itemsWithMeta = useMemo(() => {
    return state.items.map((it) => {
      const sorted = [...(it.purchases || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = sorted[0] || null;
      const prev = sorted[1] || null;
      const priceChange = last && prev ? last.unitPrice - prev.unitPrice : null;
      return { ...it, last, prev, priceChange };
    });
  }, [state.items]);

  const visibleItems = itemsWithMeta.filter((it) => it.name.toLowerCase().includes(filter.toLowerCase()));

  function addItemAsPurchase({ name, supplier, qty, unitPrice, date }) {
    // find existing item by name (case-insensitive) or create new
    setState((s) => {
      const existing = s.items.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
      const purchase = {
        id: uuidv4(),
        date: date || new Date().toISOString(),
        qty: Number(qty) || 0,
        unitPrice: Number(unitPrice) || 0,
        supplier: supplier || "",
      };
      if (existing) {
        existing.purchases = [...(existing.purchases || []), purchase];
        return { ...s, items: [...s.items] };
      } else {
        const newItem = { id: uuidv4(), name: name.trim(), purchases: [purchase] };
        return { ...s, items: [...s.items, newItem] };
      }
    });
  }

  function addNewItem(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    addItemAsPurchase({ name: newName, supplier: newSupplier, qty: newQty, unitPrice: newPrice, date: newDate });
    setNewName("");
    setNewSupplier("");
    setNewQty(1);
    setNewPrice(0);
    setShowNewItemForm(false);
  }

  function addPurchaseToItem(itemId, { qty, unitPrice, supplier, date }) {
    setState((s) => {
      const items = s.items.map((it) => {
        if (it.id !== itemId) return it;
        const purchase = { id: uuidv4(), date: date || new Date().toISOString(), qty: Number(qty) || 0, unitPrice: Number(unitPrice) || 0, supplier: supplier || "" };
        return { ...it, purchases: [...(it.purchases || []), purchase] };
      });
      return { ...s, items };
    });
  }

  function deletePurchase(itemId, purchaseId) {
    if (!window.confirm("Delete this purchase?")) return;
    setState((s) => {
      const items = s.items.map((it) => {
        if (it.id !== itemId) return it;
        return { ...it, purchases: it.purchases.filter((p) => p.id !== purchaseId) };
      });
      return { ...s, items };
    });
  }

  function exportCSV() {
    // Flatten purchases to rows
    const rows = ["Item Name,Purchase Date,Quantity,Unit Price,Supplier,Total"];
    state.items.forEach((it) => {
      (it.purchases || []).forEach((p) => {
        const total = (Number(p.qty) || 0) * (Number(p.unitPrice) || 0);
        // escape quotes
        const safeName = `"${it.name.replace(/"/g, '""')}"`;
        const safeSupplier = `"${(p.supplier||"").replace(/"/g,'""')}"`;
        rows.push([`${safeName},${p.date},${p.qty},${p.unitPrice},${safeSupplier},${total}`]);
      });
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory_export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Robust-ish CSV parser that handles quoted fields and escaped double-quotes
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    const rows = [];
    for (const line of lines) {
      const cols = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === ',' && !inQuotes) { cols.push(cur); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur);
      // remove surrounding quotes
      rows.push(cols.map(c => c.replace(/^"|"$/g, '')));
    }
    return rows;
  }

  function importCSV(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) { alert('CSV empty'); return; }
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('item'));
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
        const priceIdx = headers.findIndex(h => h.includes('unit') || h.includes('price'));
        const supplierIdx = headers.findIndex(h => h.includes('supplier'));
        if (nameIdx === -1) { alert('CSV must include an Item Name column'); return; }

        // build items grouped by name
        const itemsMap = {};
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          if (!r[nameIdx] || r[nameIdx].trim() === '') continue;
          const itemName = r[nameIdx].trim();
          const purchase = {
            id: uuidv4(),
            date: (dateIdx >= 0 && r[dateIdx]) ? new Date(r[dateIdx]).toISOString() : new Date().toISOString(),
            qty: (qtyIdx >= 0 && r[qtyIdx]) ? Number(r[qtyIdx]) : 0,
            unitPrice: (priceIdx >= 0 && r[priceIdx]) ? Number(r[priceIdx]) : 0,
            supplier: (supplierIdx >= 0 && r[supplierIdx]) ? r[supplierIdx] : ''
          };
          if (!itemsMap[itemName.toLowerCase()]) itemsMap[itemName.toLowerCase()] = { id: uuidv4(), name: itemName, purchases: [purchase] };
          else itemsMap[itemName.toLowerCase()].purchases.push(purchase);
        }
        const importedItems = Object.values(itemsMap);
        if (importedItems.length === 0) { alert('No valid rows found in CSV'); return; }
        // Merge with existing: for items with same name (case-insensitive), append purchases
        setState((s) => {
          const existingMap = {};
          s.items.forEach(it => existingMap[it.name.toLowerCase()] = it);
          importedItems.forEach(it => {
            const key = it.name.toLowerCase();
            if (existingMap[key]) {
              existingMap[key].purchases = [...(existingMap[key].purchases || []), ...it.purchases];
            } else {
              existingMap[key] = it;
            }
          });
          return { items: Object.values(existingMap) };
        });
        alert('CSV import complete');
      } catch (e) {
        console.error(e);
        alert('Failed to import CSV');
      }
    };
    reader.readAsText(file);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && Array.isArray(parsed.items)) {
          setState(parsed);
        } else if (Array.isArray(parsed)) {
          setState({ items: parsed });
        } else {
          alert("Invalid JSON structure");
        }
      } catch (e) {
        alert("Failed to read JSON");
      }
    };
    reader.readAsText(file);
  }

  // Unified import handler that detects type by extension
  function importFile(file) {
    const name = (file && file.name) ? file.name.toLowerCase() : '';
    if (name.endsWith('.json')) return importJSON(file);
    if (name.endsWith('.csv')) return importCSV(file);
    // try JSON first then CSV
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      try { JSON.parse(text); importJSON(file); return; } catch (e) {}
      try { if (text.includes(',')) { importCSV(file); return; } } catch (e) {}
      alert('Unsupported file type. Please provide a .json or .csv file.');
    };
    reader.readAsText(file);
  }

  function clearAll() {
    if (!window.confirm("Clear all data? This cannot be undone.")) return;
    setState({ items: [] });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Inventory & Purchase Tracker</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowNewItemForm((v) => !v)} className="px-3 py-1 rounded bg-indigo-600 text-white">Add Item / Purchase</button>
            <button onClick={exportCSV} className="px-3 py-1 rounded border">Export CSV</button>
            <button onClick={exportJSON} className="px-3 py-1 rounded border">Export JSON</button>
            <label className="px-3 py-1 rounded border cursor-pointer">
              Import File (JSON / CSV)
              <input type="file" accept=".json,.csv,application/json,text/csv" onChange={(e) => e.target.files && importFile(e.target.files[0])} className="hidden" />
            </label>
            <button onClick={clearAll} className="px-3 py-1 rounded border text-red-600">Clear</button>
          </div>
        </header>

        <section className="mb-4">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search items..." className="w-full p-2 rounded border" />
        </section>

        {showNewItemForm && (
          <form onSubmit={addNewItem} className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name" className="p-2 border rounded col-span-2" required />
            <input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} placeholder="Supplier (optional)" className="p-2 border rounded" />
            <input value={newQty} onChange={(e) => setNewQty(e.target.value)} type="number" min="0" className="p-2 border rounded" />
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" className="p-2 border rounded" />
            <input value={newDate} onChange={(e) => setNewDate(e.target.value)} type="date" className="p-2 border rounded" />
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 bg-green-600 text-white rounded">Add</button>
              <button type="button" onClick={() => setShowNewItemForm(false)} className="px-3 py-2 border rounded">Cancel</button>
            </div>
          </form>
        )}

        <main>
          {visibleItems.length === 0 ? (
            <div className="bg-white p-6 rounded shadow text-center">No items yet. Click "Add Item / Purchase" to get started.</div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((it) => (
                <div key={it.id} className="bg-white p-4 rounded shadow flex flex-col md:flex-row md:justify-between">
                  <div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="text-lg font-medium">{it.name}</h2>
                      {it.last && (
                        <span className="text-sm text-gray-600">Last: {formatDateISO(it.last.date)} @ ₹{it.last.unitPrice} ({it.last.qty})</span>
                      )}
                    </div>
                    {it.priceChange !== null && (
                      <div className={`text-sm mt-1 ${it.priceChange > 0 ? "text-red-600" : it.priceChange < 0 ? "text-green-600" : "text-gray-600"}`}>
                        Change vs previous: {it.priceChange > 0 ? "+" : ""}₹{it.priceChange.toFixed(2)}
                      </div>
                    )}
                    <div className="mt-2 text-sm text-gray-700">
                      Purchases: {(it.purchases || []).length}
                    </div>
                  </div>

                  <div className="mt-3 md:mt-0 flex items-start gap-2">
                    <AddPurchaseInline item={it} onAdd={(payload) => addPurchaseToItem(it.id, payload)} onDelete={(purchaseId) => deletePurchase(it.id, purchaseId)} />
                    <button onClick={() => setSelectedItemId((v) => (v === it.id ? null : it.id))} className="px-3 py-1 border rounded">Details</button>
                  </div>

                  {selectedItemId === it.id && (
                    <div className="w-full md:w-1/2 mt-3">
                      <div className="mt-3 bg-gray-50 p-3 rounded">
                        <h3 className="font-semibold">Purchase history</h3>
                        <div className="mt-2 max-h-48 overflow-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left">
                                <th>Date</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Supplier</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(it.purchases || []).slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map((p) => (
                                <tr key={p.id}>
                                  <td>{formatDateISO(p.date)}</td>
                                  <td>{p.qty}</td>
                                  <td>₹{p.unitPrice}</td>
                                  <td>{p.supplier}</td>
                                  <td><button onClick={() => deletePurchase(it.id, p.id)} className="text-red-600 text-xs">Delete</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-6 text-sm text-gray-500">Data stored locally in your browser. Use Export/Import JSON or CSV to back up.</footer>
      </div>
    </div>
  );
}

function AddPurchaseInline({ item, onAdd, onDelete }) {
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(item.last ? item.last.unitPrice : 0);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <div className="flex gap-2 items-center">
      <input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="0" className="p-1 w-20 border rounded text-sm" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" className="p-1 w-28 border rounded text-sm" />
      <input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="p-1 border rounded text-sm" />
      <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier" className="p-1 border rounded text-sm w-28" />
      <button onClick={() => { onAdd({ qty, unitPrice: price, supplier, date }); setQty(1); }} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
    </div>
  );
}
