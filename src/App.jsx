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
import { addItemWithPurchase } from "./database/operations.js";
import { checkConnection } from "./database/connection.js";

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
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name"); // "name" or "date"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const [isSyncingToDatabase, setIsSyncingToDatabase] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState({ checked: false, connected: false });

  // New item form
  const [newName, setNewName] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newPrice, setNewPrice] = useState(0);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    saveData(state);
  }, [state]);

  // Check database connection on component mount
  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  // Check database connection status
  async function checkDatabaseConnection() {
    try {
      const result = await checkConnection();
      setDatabaseStatus({ checked: true, connected: result.connected });
    } catch (error) {
      setDatabaseStatus({ checked: true, connected: false });
    }
  }

  // Notification helper
  const showNotification = (message, type = 'success', duration = 3000) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type });
    }, duration);
  };

  // Validation helpers
  const validateItemName = (name) => {
    if (!name || !name.trim()) return "Item name is required";
    if (name.trim().length < 2) return "Item name must be at least 2 characters";
    return null;
  };

  const validateNumber = (value, fieldName) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) return `${fieldName} must be a positive number`;
    return null;
  };

  const validateDate = (date) => {
    if (!date) return "Date is required";
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "Invalid date format";
    return null;
  };

  // derived list with last purchase
  const itemsWithMeta = useMemo(() => {
    const items = state.items.map((it) => {
      const sorted = [...(it.purchases || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
      const last = sorted[0] || null;
      const prev = sorted[1] || null;
      const priceChange = last && prev ? last.unitPrice - prev.unitPrice : null;
      const totalSpent = (it.purchases || []).reduce((sum, p) => sum + (p.qty * p.unitPrice), 0);
      return { ...it, last, prev, priceChange, totalSpent, purchaseCount: (it.purchases || []).length };
    });

    // Sort items based on current sort settings
    let sortedItems = [...items];
    
    if (sortBy === "name") {
      sortedItems.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? comparison : -comparison;
      });
    } else if (sortBy === "date" && items.some(item => item.last)) {
      sortedItems.sort((a, b) => {
        const dateA = a.last ? new Date(a.last.date) : new Date(0);
        const dateB = b.last ? new Date(b.last.date) : new Date(0);
        const comparison = dateA - dateB;
        return sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return sortedItems;
  }, [state.items, sortBy, sortOrder]);

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
    
    // Validate inputs
    const nameError = validateItemName(newName);
    const qtyError = validateNumber(newQty, "Quantity");
    const priceError = validateNumber(newPrice, "Price");
    const dateError = validateDate(newDate);
    
    if (nameError || qtyError || priceError || dateError) {
      showNotification(nameError || qtyError || priceError || dateError, 'error');
      return;
    }

    addItemAsPurchase({ name: newName, supplier: newSupplier, qty: newQty, unitPrice: newPrice, date: newDate });
    setNewName("");
    setNewSupplier("");
    setNewQty(1);
    setNewPrice(0);
    setShowNewItemForm(false);
    showNotification(`Successfully added ${newName}`, 'success');
  }

  function addPurchaseToItem(itemId, { qty, unitPrice, supplier, date }) {
    const qtyError = validateNumber(qty, "Quantity");
    const priceError = validateNumber(unitPrice, "Price");
    const dateError = validateDate(date);
    
    if (qtyError || priceError || dateError) {
      showNotification(qtyError || priceError || dateError, 'error');
      return;
    }

    setState((s) => {
      const items = s.items.map((it) => {
        if (it.id !== itemId) return it;
        const purchase = {
          id: uuidv4(),
          date: date || new Date().toISOString(),
          qty: Number(qty) || 0,
          unitPrice: Number(unitPrice) || 0,
          supplier: supplier || ""
        };
        return { ...it, purchases: [...(it.purchases || []), purchase] };
      });
      return { ...s, items };
    });
    showNotification('Purchase added successfully', 'success');
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
    showNotification('Purchase deleted', 'success');
  }

  function exportCSV() {
    try {
      setIsLoading(true);
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
      a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('CSV exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export CSV', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  function exportJSON() {
    try {
      setIsLoading(true);
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification('JSON exported successfully', 'success');
    } catch (error) {
      showNotification('Failed to export JSON', 'error');
    } finally {
      setIsLoading(false);
    }
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
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const rows = parseCSV(text);
        if (rows.length === 0) { showNotification('CSV file is empty', 'error'); return; }
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('item'));
        const dateIdx = headers.findIndex(h => h.includes('date'));
        const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
        const priceIdx = headers.findIndex(h => h.includes('unit') || h.includes('price'));
        const supplierIdx = headers.findIndex(h => h.includes('supplier'));
        if (nameIdx === -1) { showNotification('CSV must include an Item Name column', 'error'); return; }

        // build items grouped by name
        const itemsMap = {};
        let validRows = 0;
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
          validRows++;
        }
        const importedItems = Object.values(itemsMap);
        if (importedItems.length === 0) { showNotification('No valid rows found in CSV', 'error'); return; }
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
        showNotification(`Successfully imported ${validRows} rows from CSV`, 'success');
      } catch (e) {
        console.error(e);
        showNotification('Failed to import CSV', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  }

  function importJSON(file) {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (parsed && Array.isArray(parsed.items)) {
          setState(parsed);
          showNotification(`Successfully imported ${parsed.items.length} items from JSON`, 'success');
        } else if (Array.isArray(parsed)) {
          setState({ items: parsed });
          showNotification(`Successfully imported ${parsed.length} items from JSON`, 'success');
        } else {
          showNotification("Invalid JSON structure. Expected {items: [...]}", 'error');
        }
      } catch (e) {
        showNotification("Failed to read JSON file", 'error');
      } finally {
        setIsLoading(false);
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
      showNotification('Unsupported file type. Please provide a .json or .csv file.', 'error');
    };
    reader.readAsText(file);
  }

  function clearAll() {
    if (!window.confirm("Clear all data? This cannot be undone.")) return;
    setState({ items: [] });
    showNotification('All data cleared', 'success');
  }

  // Sync data from localStorage to database
  async function syncToDatabase() {
    if (state.items.length === 0) {
      showNotification('No data to sync. Add some items first.', 'error');
      return;
    }

    if (!databaseStatus.checked) {
      await checkDatabaseConnection();
    }

    if (!databaseStatus.connected) {
      showNotification('Database not connected. Please check your DATABASE_URL in .env file.', 'error');
      return;
    }

    setIsSyncingToDatabase(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const item of state.items) {
        try {
          // Sync each item and its purchases
          for (const purchase of item.purchases || []) {
            await addItemWithPurchase({
              name: item.name,
              supplier: purchase.supplier || '',
              qty: purchase.qty,
              unitPrice: purchase.unitPrice,
              date: new Date(purchase.date).toISOString().split('T')[0] // Format date for database
            });
            successCount++;
          }
        } catch (error) {
          console.error(`Error syncing item ${item.name}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        showNotification(`Successfully synced ${successCount} records to database!`, 'success');
      } else {
        showNotification(`Synced ${successCount} records successfully, ${errorCount} failed.`, 'warning');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showNotification('Failed to sync to database. Please try again.', 'error');
    } finally {
      setIsSyncingToDatabase(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification System */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="container">
        <header className="header">
          <h1 className="text-2xl font-semibold">Inventory & Purchase Tracker</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowNewItemForm((v) => !v)}
              className="button"
              disabled={isLoading}
            >
              {showNewItemForm ? 'Cancel' : 'Add Item / Purchase'}
            </button>
            <button
              onClick={exportCSV}
              className="button button-secondary"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Export CSV'}
            </button>
            <button
              onClick={exportJSON}
              className="button button-secondary"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Export JSON'}
            </button>
            <label className="button button-secondary cursor-pointer">
              {isLoading ? 'Loading...' : 'Import File'}
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={(e) => e.target.files && importFile(e.target.files[0])}
                className="hidden"
                disabled={isLoading}
              />
            </label>
            <button
              onClick={clearAll}
              className="button text-red-600"
              disabled={isLoading}
            >
              Clear All
            </button>
            <button
              onClick={syncToDatabase}
              className="button bg-purple-600 text-white"
              disabled={isSyncingToDatabase || !databaseStatus.checked}
              title={!databaseStatus.connected ? 'Check DATABASE_URL in .env' : 'Sync local data to database'}
            >
              {isSyncingToDatabase
                ? 'Syncing...'
                : databaseStatus.connected
                  ? 'Store to Database'
                  : 'Database Offline'
              }
            </button>
            {databaseStatus.checked && !databaseStatus.connected && (
              <button
                onClick={checkDatabaseConnection}
                className="button button-secondary"
                title="Check database connection"
              >
                🔄 Check DB
              </button>
            )}
          </div>
        </header>

        <section className="mb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search items..."
                className="input w-full"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
                aria-label="Sort by"
              >
                <option value="name">Sort by Name</option>
                <option value="date">Sort by Last Purchase Date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="button button-secondary px-3"
                aria-label={`Toggle sort order: ${sortOrder === "asc" ? "ascending to descending" : "descending to ascending"}`}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </section>

        {showNewItemForm && (
          <form onSubmit={addNewItem} className="card mb-4">
            <div className="form-grid">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Item name"
                className="input col-span-2"
                required
                aria-label="Item name"
              />
              <input
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                placeholder="Supplier (optional)"
                className="input"
                aria-label="Supplier"
              />
              <input
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                type="number"
                min="0"
                step="1"
                className="input"
                placeholder="Quantity"
                aria-label="Quantity"
              />
              <input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className="input"
                placeholder="Unit Price"
                aria-label="Unit Price"
              />
              <input
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                type="date"
                className="input"
                aria-label="Date"
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="submit" className="button bg-green-600">Add</button>
              <button
                type="button"
                onClick={() => setShowNewItemForm(false)}
                className="button button-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <main>
          {visibleItems.length === 0 ? (
            <div className="card text-center">
              {state.items.length === 0 ? (
                <div>
                  <p className="text-gray-600 mb-4">No items yet. Click "Add Item / Purchase" to get started.</p>
                  <button
                    onClick={() => setShowNewItemForm(true)}
                    className="button bg-indigo-600"
                  >
                    Add Your First Item
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">No items match your search. Try a different search term.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((it) => (
                <div key={it.id} className="card">
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <h2 className="text-lg font-medium">{it.name}</h2>
                        {it.last && (
                          <span className="text-sm text-gray-600">
                            Last: {formatDateISO(it.last.date)} @ ₹{it.last.unitPrice} ({it.last.qty})
                          </span>
                        )}
                      </div>
                      
                      {it.priceChange !== null && (
                        <div className={`text-sm mb-2 ${it.priceChange > 0 ? "text-red-600" : it.priceChange < 0 ? "text-green-600" : "text-gray-600"}`}>
                          Price change: {it.priceChange > 0 ? "+" : ""}₹{it.priceChange.toFixed(2)}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                        <span>Purchases: {it.purchaseCount}</span>
                        <span>Total spent: ₹{it.totalSpent.toFixed(2)}</span>
                        {it.last && <span>Avg price: ₹{(it.totalSpent / it.purchaseCount).toFixed(2)}</span>}
                      </div>
                    </div>

                    <div className="mt-3 md:mt-0 flex flex-col gap-2">
                      <AddPurchaseInline
                        item={it}
                        onAdd={(payload) => addPurchaseToItem(it.id, payload)}
                      />
                      <button
                        onClick={() => setSelectedItemId((v) => (v === it.id ? null : it.id))}
                        className="button button-secondary text-sm"
                      >
                        {selectedItemId === it.id ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>

                  {selectedItemId === it.id && (
                    <div className="mt-3 bg-gray-50 p-3 rounded">
                      <h3 className="font-semibold mb-2">Purchase History</h3>
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b">
                              <th className="py-2">Date</th>
                              <th className="py-2">Quantity</th>
                              <th className="py-2">Unit Price</th>
                              <th className="py-2">Total</th>
                              <th className="py-2">Supplier</th>
                              <th className="py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(it.purchases || []).slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map((p) => (
                              <tr key={p.id} className="border-b">
                                <td className="py-2">{formatDateISO(p.date)}</td>
                                <td className="py-2">{p.qty}</td>
                                <td className="py-2">₹{p.unitPrice}</td>
                                <td className="py-2">₹{(p.qty * p.unitPrice).toFixed(2)}</td>
                                <td className="py-2">{p.supplier || '-'}</td>
                                <td className="py-2">
                                  <button
                                    onClick={() => deletePurchase(it.id, p.id)}
                                    className="text-red-600 text-xs hover:underline"
                                    aria-label={`Delete purchase from ${formatDateISO(p.date)}`}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-6 text-sm text-gray-500 text-center">
          Data stored locally in your browser • Export/Import for backup
          {databaseStatus.connected && (
            <div className="mt-2 text-green-600">
              ✓ Database connection active - Use "Store to Database" to sync to cloud
            </div>
          )}
        </footer>
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