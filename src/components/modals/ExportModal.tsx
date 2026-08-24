import React, { useState } from 'react';
import { Download, X, FileSpreadsheet, FileText, Database, Code, Check } from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { exportToExcel, exportToCsv, exportToJson, exportToSqlInsert } from '../../services/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DataTable | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  table,
}) => {
  const [format, setFormat] = useState<'XLSX' | 'CSV' | 'JSON' | 'SQL'>('XLSX');
  const [fileName, setFileName] = useState<string>(() => (table ? `${table.name}_Export` : 'Export'));
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');

  if (!isOpen || !table) return null;

  const handleExport = () => {
    const baseName = fileName.trim() || 'Export';

    switch (format) {
      case 'XLSX':
        exportToExcel(table.rows, table.columns, `${baseName}.xlsx`);
        break;
      case 'CSV':
        exportToCsv(table.rows, table.columns, `${baseName}.csv`, csvDelimiter);
        break;
      case 'JSON':
        exportToJson(table.rows, table.columns, `${baseName}.json`);
        break;
      case 'SQL':
        exportToSqlInsert(table.rows, table.columns, table.name, `${baseName}.sql`);
        break;
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Download size={18} color="var(--pastel-emerald)" />
            <span>Ekspor Data Tabel: "{table.name}"</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {/* Format Selector */}
          <div className="form-group">
            <label className="form-label">Pilih Format Ekspor:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${format === 'XLSX' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                onClick={() => setFormat('XLSX')}
              >
                <FileSpreadsheet size={16} />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                className={`btn ${format === 'CSV' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                onClick={() => setFormat('CSV')}
              >
                <FileText size={16} />
                <span>CSV / TSV (.csv)</span>
              </button>
              <button
                type="button"
                className={`btn ${format === 'JSON' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                onClick={() => setFormat('JSON')}
              >
                <Code size={16} />
                <span>JSON (.json)</span>
              </button>
              <button
                type="button"
                className={`btn ${format === 'SQL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '10px' }}
                onClick={() => setFormat('SQL')}
              >
                <Database size={16} />
                <span>SQL Dump (.sql)</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nama File:</label>
            <input
              type="text"
              className="form-control"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          {format === 'CSV' && (
            <div className="form-group">
              <label className="form-label">Pemisah Kolom CSV (Delimiter):</label>
              <select
                className="form-control form-select"
                value={csvDelimiter}
                onChange={(e) => setCsvDelimiter(e.target.value)}
              >
                <option value=",">Koma (,) - Standar Internasional</option>
                <option value=";">Titik Koma (;) - Standar Excel Indonesia/Eropa</option>
                <option value="	">Tab (\t) - TSV</option>
              </select>
            </div>
          )}

          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Total baris yang akan diekspor: <strong>{table.rows.length.toLocaleString()} baris</strong> ({table.columns.length} kolom).
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button className="btn btn-success btn-sm" onClick={handleExport}>
            <Download size={14} />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
