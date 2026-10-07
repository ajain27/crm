import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Pencil, Trash2, Upload, X } from "lucide-react";
import Pagination from "../../pagination/Pagination";
import LoadingScreen from "../../loader/LoadingScreen";
import { LeadSearchInput } from "../components/LeadListPanel";
import {
  deleteCountyRecordImportById,
  deleteCountyRecordRows,
  fetchCountyRecordImports,
  fetchCountyRecordRows,
  saveCountyRecordImport,
  updateCountyRecordImport,
} from "../../../firebase/firestoreService";
import { chunkRows, parseCsv, toCountyRecords } from "./countyRecordsCsv";
import {
  buildDealFromCountyRecord,
  countyRecordFields,
  countyRecordPropertyKey,
  findFieldColumn,
  isAmountDueColumn,
  propertyKey,
} from "./countyRecordDeal";
import CountyRecordModal from "./CountyRecordModal";
import ListNameModal from "./ListNameModal";

const PAGE_SIZE = 25;
const MAX_FILE_MB = 30;

const PHONE_COLUMN = /phone|cell|mobile|\btel\b|telephone|fax/i;
const PHONE_NUMBER = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

// Phone cells as tap-to-call links. Every number in the cell is linked
// (some exports put two in one cell); other text stays as is.
function PhoneCellContent({ value }) {
  const parts = [];
  let last = 0;
  for (const match of value.matchAll(PHONE_NUMBER)) {
    if (match.index > last) parts.push(value.slice(last, match.index));
    parts.push(
      <a
        key={match.index}
        href={`tel:${match[0].replace(/[^\d+]/g, "")}`}
        className="leads-contact-link"
        onClick={(e) => e.stopPropagation()}
      >
        {match[0]}
      </a>,
    );
    last = match.index + match[0].length;
  }
  if (parts.length === 0) return value;
  if (last < value.length) parts.push(value.slice(last));
  return parts;
}

// FileReader rather than file.text(), which older Safari lacks.
function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// Distinct non-empty values of one column, sorted, for a filter dropdown.
function columnValues(rows, columnIndex) {
  if (columnIndex === -1) return [];
  const values = new Set();
  for (const row of rows) {
    if (row[columnIndex]) values.add(row[columnIndex]);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

// Column filters, in dropdown order. Each uses the property column for
// that field (mailing columns are never matched).
const COLUMN_FILTERS = [
  { field: "state", allLabel: "All states", label: "Filter by state" },
  { field: "county", allLabel: "All counties", label: "Filter by county" },
  { field: "city", allLabel: "All cities", label: "Filter by city" },
];
const NO_FILTERS = { state: "", county: "", city: "" };

// The list to open by default: the most recently added one still shown.
function newestVisible(lists) {
  return lists.filter((l) => !l.hidden).at(-1);
}

function oldestFirst(a, b) {
  return String(a.importedAt).localeCompare(String(b.importedAt));
}

// Lists imported before naming existed show their file name.
export function listName(list) {
  return list.name || String(list.fileName || "List").replace(/\.[^.]+$/, "");
}

// What the tab has loaded, per user, kept while the app is open so leaving
// the tab and coming back renders straight away (then refreshes).
const sessionCache = new Map();

export function clearCountyRecordsCache() {
  sessionCache.clear();
}

// County Records tab: import a county's CSV export and browse it with the
// file's own columns. Each import is saved to the user's account; pick one
// from the list to view it, search across every column, or delete it.
export default function CountyRecords({
  currentUser,
  deals = [],
  saveDeal,
  setDeals,
}) {
  const cached = sessionCache.get(currentUser?.id);
  const [imports, setImports] = useState(cached?.imports || []);
  const [selectedId, setSelectedId] = useState(cached?.selectedId || "");
  const [rowsById, setRowsById] = useState(cached?.rowsById || {});
  // Until the first list of imports arrives, "no imports" isn't known yet.
  const [importsLoaded, setImportsLoaded] = useState(Boolean(cached));
  const [importing, setImporting] = useState(false);
  // A parsed file waiting for its list name, and the rename window.
  const [pendingImport, setPendingImport] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState(NO_FILTERS);
  // Ticked records (row indexes in the selected import), for bulk delete.
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  // The open record, as its index in the selected import's rows.
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchCountyRecordImports(currentUser.id)
      .then((list) => {
        const sorted = [...list].sort(oldestFirst);
        setImports(sorted);
        setSelectedId((current) =>
          sorted.some((i) => i.id === current && !i.hidden)
            ? current
            : newestVisible(sorted)?.id || "",
        );
      })
      .catch(() => setError("Couldn't load your county record imports."))
      .finally(() => setImportsLoaded(true));
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !importsLoaded) return;
    sessionCache.set(currentUser.id, { imports, selectedId, rowsById });
  }, [currentUser?.id, importsLoaded, imports, selectedId, rowsById]);

  // Rows are loaded on demand per import and kept, so switching back is
  // instant.
  useEffect(() => {
    if (!selectedId || rowsById[selectedId]) return;
    fetchCountyRecordRows(selectedId)
      .then((rows) => setRowsById((prev) => ({ ...prev, [selectedId]: rows })))
      .catch(() => setError("Couldn't load these records."));
  }, [selectedId, rowsById]);

  function selectImport(id) {
    setSelectedId(id);
    setOpenRowIndex(null);
    setSelectedRows(new Set());
    setSearch("");
    setColumnFilters(NO_FILTERS);
    setPage(1);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    setError("");

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(
        `That file is over ${MAX_FILE_MB}MB. Split it and import the parts.`,
      );
      return;
    }

    setImporting(true);
    try {
      const { columns, rows } = toCountyRecords(
        parseCsv(await readFileText(file)),
      );
      if (columns.length === 0 || rows.length === 0) {
        setError(
          "No records found. The first row should be the column headers.",
        );
        return;
      }
      // Saved once the list is named.
      setPendingImport({ fileName: file.name, columns, rows });
    } catch (err) {
      console.error("County records import failed", err);
      setError("Couldn't read that file.");
    } finally {
      setImporting(false);
    }
  }

  async function handleCreateList(name) {
    const { fileName, columns: fileColumns, rows } = pendingImport;
    setSavingName(true);
    try {
      const summary = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        name,
        fileName,
        columns: fileColumns,
        rowCount: rows.length,
        importedAt: new Date().toISOString(),
      };
      await saveCountyRecordImport(summary, chunkRows(rows));
      setImports((prev) => [...prev, summary]);
      setRowsById((prev) => ({ ...prev, [summary.id]: rows }));
      selectImport(summary.id);
      setPendingImport(null);
    } catch (err) {
      console.error("County records import failed", err);
      setPendingImport(null);
      setError("Import failed. Check your connection and try again.");
    } finally {
      setSavingName(false);
    }
  }

  // Hiding only takes the tab out of view; the list and its records stay
  // saved and can be shown again from "Hidden lists".
  async function setListHidden(id, hidden) {
    try {
      await updateCountyRecordImport(id, { hidden });
      const next = imports.map((i) => (i.id === id ? { ...i, hidden } : i));
      setImports(next);
      if (!hidden) selectImport(id);
      else if (id === selectedId) selectImport(newestVisible(next)?.id || "");
    } catch {
      setError(
        `Couldn't ${hidden ? "hide" : "show"} this list. Check your connection.`,
      );
    }
  }

  async function handleRenameList(name) {
    setSavingName(true);
    try {
      await updateCountyRecordImport(selectedId, { name });
      setImports((prev) =>
        prev.map((i) => (i.id === selectedId ? { ...i, name } : i)),
      );
      setRenaming(false);
    } catch {
      setError("Couldn't rename this list. Check your connection.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleDelete() {
    const current = imports.find((i) => i.id === selectedId);
    if (!current) return;
    if (
      !window.confirm(
        `Delete the "${listName(current)}" list and its ${current.rowCount.toLocaleString()} records?`,
      )
    )
      return;
    try {
      await deleteCountyRecordImportById(current.id);
      const remaining = imports.filter((i) => i.id !== current.id);
      setImports(remaining);
      setRowsById(({ [current.id]: _removed, ...rest }) => rest);
      selectImport(newestVisible(remaining)?.id || "");
    } catch {
      setError("Couldn't delete this list. Check your connection.");
    }
  }

  async function handleDeleteRecord(index) {
    const row = rowsById[selectedId]?.[index];
    if (!row) return;
    const { ownerName, address } = countyRecordFields(columns, row);
    const label = [ownerName, address].filter(Boolean).join(", ");
    if (!window.confirm(`Delete this record${label ? ` (${label})` : ""}?`))
      return;
    await deleteRows([index]);
  }

  async function handleDeleteSelected() {
    const indexes = [...selectedRows];
    if (indexes.length === 0) return;
    const noun = indexes.length === 1 ? "record" : "records";
    if (!window.confirm(`Delete ${indexes.length} selected ${noun}?`)) return;
    await deleteRows(indexes);
  }

  async function deleteRows(indexes) {
    try {
      await deleteCountyRecordRows(selectedId, indexes);
      setImports((prev) =>
        prev.map((i) =>
          i.id === selectedId
            ? {
                ...i,
                deletedRows: [...(i.deletedRows || []), ...indexes],
                rowCount: i.rowCount - indexes.length,
              }
            : i,
        ),
      );
      setSelectedRows((prev) => {
        const next = new Set(prev);
        indexes.forEach((index) => next.delete(index));
        return next;
      });
      if (indexes.includes(openRowIndex)) setOpenRowIndex(null);
    } catch {
      setError(
        `Couldn't delete ${indexes.length === 1 ? "this record" : "these records"}. Check your connection.`,
      );
    }
  }

  function toggleRow(index) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function setPageSelected(indexes, checked) {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      indexes.forEach((index) =>
        checked ? next.add(index) : next.delete(index),
      );
      return next;
    });
  }

  const visibleImports = imports.filter((i) => !i.hidden);
  const hiddenImports = imports.filter((i) => i.hidden);
  const selected = visibleImports.find((i) => i.id === selectedId);
  // Imports not fetched yet, or the selected file's rows still on the way
  // (unless that failed — the error shows instead).
  const isLoading =
    !importsLoaded || (Boolean(selected) && !rowsById[selectedId] && !error);
  const columns = selected?.columns || [];
  const phoneColumns = columns.map((c) => PHONE_COLUMN.test(c));
  const amountDueColumns = columns.map(isAmountDueColumn);
  const crmKeys = new Set(deals.map(propertyKey).filter(Boolean));
  const isInCrm = (row) => {
    const key = countyRecordPropertyKey(columns, row);
    return Boolean(key) && crmKeys.has(key);
  };

  function renderCell(cell, columnIndex) {
    if (phoneColumns[columnIndex]) return <PhoneCellContent value={cell} />;
    if (amountDueColumns[columnIndex])
      return <span className="county-amount-due">{cell}</span>;
    return cell;
  }

  async function handleAddToCrm(row) {
    const deal = buildDealFromCountyRecord({
      columns,
      row,
      fileName: selected.fileName,
      userId: currentUser.id,
    });
    if (!deal) throw new Error("This record has no property address.");
    await saveDeal(deal);
    setDeals((prev) => [deal, ...prev]);
  }
  const allRows = rowsById[selectedId] || [];
  const query = search.trim().toLowerCase();
  // Each entry keeps its row's index in the import, so the open record
  // survives searching and paging.
  // Only fields the file actually has a column for get a dropdown.
  const activeFilters = COLUMN_FILTERS.map((filter) => {
    const column = findFieldColumn(columns, filter.field);
    return { ...filter, column, options: columnValues(allRows, column) };
  }).filter((filter) => filter.options.length > 0);

  // Rows keep their position in the file as their index; deleted ones are
  // listed on the import and skipped.
  const deletedRows = new Set(selected?.deletedRows || []);
  const indexed = allRows
    .map((row, index) => ({ row, index }))
    .filter(({ index }) => !deletedRows.has(index));
  const filtered = indexed.filter(
    ({ row }) =>
      activeFilters.every(
        ({ field, column }) =>
          !columnFilters[field] || row[column] === columnFilters[field],
      ) &&
      (!query || row.some((cell) => cell.toLowerCase().includes(query))),
  );
  const hasFilters =
    Boolean(query) || Object.values(columnFilters).some(Boolean);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <section
      className="panel"
      data-reveal="left"
      style={{ "--reveal-delay": "80ms" }}
    >
      <div className="panel-header leads-list-header">
        <div>
          <h2>County Records</h2>
          <p>
            {selected
              ? `${selected.fileName} · ${selected.rowCount.toLocaleString()} record${selected.rowCount === 1 ? "" : "s"} · ${selected.columns.length} column${selected.columns.length === 1 ? "" : "s"}`
              : importsLoaded
                ? "Import a county's CSV export as a list to browse it here."
                : "Loading…"}
          </p>
        </div>
        <div className="leads-filters">
          {selected && (
            <LeadSearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search all columns…"
            />
          )}
          {activeFilters.map(({ field, allLabel, label, options }) => (
            <select
              key={field}
              className="leads-filter-select"
              value={columnFilters[field]}
              onChange={(e) => {
                setColumnFilters((prev) => ({
                  ...prev,
                  [field]: e.target.value,
                }));
                setPage(1);
              }}
              aria-label={label}
            >
              <option value="">{allLabel}</option>
              {options.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ))}
          {hasFilters && (
            <button
              type="button"
              className="leads-clear-filters"
              onClick={() => {
                setSearch("");
                setColumnFilters(NO_FILTERS);
                setPage(1);
              }}
            >
              Clear
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv"
            onChange={handleFile}
            hidden
            aria-label="CSV file"
          />
          <button
            type="button"
            className="leads-export-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload size={13} />
            {importing ? "Reading file…" : "Add list"}
          </button>
          {selectedRows.size > 0 && (
            <button
              type="button"
              className="leads-bulk-delete-btn"
              onClick={handleDeleteSelected}
              disabled={importing}
            >
              <Trash2 size={13} />
              Delete ({selectedRows.size})
            </button>
          )}
          {selected && (
            <button
              type="button"
              className="leads-bulk-delete-btn"
              onClick={handleDelete}
              disabled={importing}
            >
              <Trash2 size={13} />
              Delete list
            </button>
          )}
        </div>
      </div>

      {imports.length > 0 && (
        <div className="county-list-tabs" role="tablist" aria-label="Lists">
          {visibleImports.map((list) => {
            const active = list.id === selectedId;
            return (
              <div
                key={list.id}
                className={`county-list-tab${active ? " county-list-tab--active" : ""}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className="county-list-tab-btn"
                  onClick={() => !active && selectImport(list.id)}
                >
                  {listName(list)}
                  <span className="county-list-tab-count">
                    {list.rowCount.toLocaleString()}
                  </span>
                </button>
                {active && (
                  <button
                    type="button"
                    className="county-list-tab-rename"
                    onClick={() => setRenaming(true)}
                    aria-label={`Rename ${listName(list)}`}
                    title="Rename list"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <button
                  type="button"
                  className="county-list-tab-hide"
                  onClick={() => setListHidden(list.id, true)}
                  aria-label={`Hide ${listName(list)}`}
                  title="Hide this tab (the list stays saved)"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {hiddenImports.length > 0 && (
            <select
              className="leads-filter-select county-hidden-lists"
              value=""
              onChange={(e) =>
                e.target.value && setListHidden(e.target.value, false)
              }
              aria-label="Show a hidden list"
            >
              <option value="">Hidden lists ({hiddenImports.length})</option>
              {hiddenImports.map((list) => (
                <option key={list.id} value={list.id}>
                  {listName(list)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {error && <p className="county-records-error">{error}</p>}

      {isLoading ? (
        <div className="county-records-loading">
          <LoadingScreen
            isLoading
            minDuration={0}
            loadingContent={<span>Loading county records…</span>}
          />
        </div>
      ) : !selected && hiddenImports.length > 0 ? (
        <div className="leads-empty county-records-empty">
          <FileSpreadsheet size={28} />
          <p>All your lists are hidden.</p>
          <span>
            Choose one from Hidden lists to show it again, or add a new list.
          </span>
        </div>
      ) : !selected ? (
        <div className="leads-empty county-records-empty">
          <FileSpreadsheet size={28} />
          <p>No county records yet.</p>
          <span>
            Click Add list and choose a CSV exported from the county. The first
            row should hold the column names.
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="leads-empty">
          <p>No records match your filters.</p>
        </div>
      ) : (
        <>
          {/* Wide screens get the full table; narrow ones get one card per
              record (owner, address, phone). Either opens the record. */}
          <div className="county-records-results">
            <div className="table-wrap county-records-table-wrap">
              <table className="compact-table county-records-table">
                <thead>
                  <tr>
                    <th className="county-row-select">
                      <input
                        type="checkbox"
                        className="buyer-checkbox"
                        aria-label="Select all on this page"
                        checked={
                          pageRows.length > 0 &&
                          pageRows.every(({ index }) => selectedRows.has(index))
                        }
                        onChange={(e) =>
                          setPageSelected(
                            pageRows.map(({ index }) => index),
                            e.target.checked,
                          )
                        }
                      />
                    </th>
                    <th className="county-row-action" aria-label="Actions" />
                    {selected.columns.map((column) => (
                      <th
                        key={column}
                        className={
                          isAmountDueColumn(column)
                            ? "county-amount-due"
                            : undefined
                        }
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(({ row, index }) => (
                    <tr
                      key={index}
                      className="clickable-row"
                      onClick={() => setOpenRowIndex(index)}
                    >
                      <td
                        className="county-row-select"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="buyer-checkbox"
                          aria-label="Select record"
                          checked={selectedRows.has(index)}
                          onChange={() => toggleRow(index)}
                        />
                      </td>
                      <td className="county-row-action">
                        <button
                          type="button"
                          className="county-row-delete"
                          title="Delete record"
                          aria-label="Delete record"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(index);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                      {row.map((cell, i) => (
                        <td key={selected.columns[i]} title={cell}>
                          {cell ? renderCell(cell, i) : "—"}
                          {/* Records already in the CRM are tagged in
                              their first cell. */}
                          {i === 0 && isInCrm(row) && (
                            <span className="county-in-crm county-in-crm--inline">
                              In CRM
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="county-records-cards">
              {pageRows.map(({ row, index }) => {
                const fields = countyRecordFields(columns, row);
                return (
                  <li key={index}>
                    <button
                      type="button"
                      className="county-record-card"
                      onClick={() => setOpenRowIndex(index)}
                    >
                      <span className="county-record-card-title">
                        {fields.ownerName || row[0] || "Record"}
                        {isInCrm(row) && (
                          <span className="county-in-crm">In CRM</span>
                        )}
                      </span>
                      {fields.address && (
                        <span className="county-record-card-line">
                          {fields.address}
                        </span>
                      )}
                      {fields.phone && (
                        <span className="county-record-card-line">
                          <PhoneCellContent value={fields.phone} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setPage}
          >
            <span className="pagination-summary">
              Showing {(pageStart + 1).toLocaleString()}–
              {(pageStart + pageRows.length).toLocaleString()} of{" "}
              {filtered.length.toLocaleString()}
            </span>
          </Pagination>
        </>
      )}
      {openRowIndex !== null && allRows[openRowIndex] && (
        <CountyRecordModal
          key={`${selectedId}-${openRowIndex}`}
          columns={columns}
          row={allRows[openRowIndex]}
          inCrm={isInCrm(allRows[openRowIndex])}
          onAddToCrm={() => handleAddToCrm(allRows[openRowIndex])}
          onClose={() => setOpenRowIndex(null)}
          onDelete={() => handleDeleteRecord(openRowIndex)}
          renderValue={renderCell}
        />
      )}
      {pendingImport && (
        <ListNameModal
          title="Name this list"
          initialName={
            pendingImport ? listName({ fileName: pendingImport.fileName }) : ""
          }
          takenNames={imports.map(listName)}
          submitLabel="Save list"
          saving={savingName}
          detail={
            pendingImport &&
            `${pendingImport.fileName} · ${pendingImport.rows.length.toLocaleString()} records · ${pendingImport.columns.length} columns`
          }
          onSubmit={handleCreateList}
          onClose={() => setPendingImport(null)}
        />
      )}
      {renaming && selected && (
        <ListNameModal
          title="Rename list"
          initialName={selected ? listName(selected) : ""}
          takenNames={imports.filter((i) => i.id !== selectedId).map(listName)}
          submitLabel="Rename"
          saving={savingName}
          onSubmit={handleRenameList}
          onClose={() => setRenaming(false)}
        />
      )}
    </section>
  );
}
