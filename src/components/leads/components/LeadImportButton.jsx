import { useState } from "react";
import { Loader2, Upload } from "lucide-react";

function readText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// "Import CSV" — hands the chosen file's text to `onImport` (async).
export default function LeadImportButton({ onImport }) {
  const [importing, setImporting] = useState(false);

  async function handleChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      await onImport(await readText(file));
    } finally {
      setImporting(false);
    }
  }

  return (
    <label
      className={`leads-export-btn leads-import-btn${importing ? " is-importing" : ""}`}
    >
      {importing ? (
        <Loader2 size={13} className="spin" />
      ) : (
        <Upload size={13} />
      )}
      {importing ? "Importing…" : "Import CSV"}
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={importing}
        onChange={handleChange}
        aria-label="Import CSV"
      />
    </label>
  );
}
