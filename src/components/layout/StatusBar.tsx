import React from 'react';
import { Database, Filter, CheckSquare } from 'lucide-react';
import { DataTable } from '../../types/dataset';

interface StatusBarProps {
  activeTable: DataTable | null;
  filteredCount: number;
  selectedCount: number;
  isFiltered: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeTable,
  filteredCount,
  selectedCount,
  isFiltered,
}) => {
  if (!activeTable) {
    return (
      <footer className="app-statusbar">
        <div className="statusbar-item">
          <span>Tidak ada tabel aktif</span>
        </div>
        <div className="statusbar-item">
          <span>LUNIX In-Memory Database Ready</span>
        </div>
      </footer>
    );
  }

  const memoryBytes = activeTable.memorySizeBytes || JSON.stringify(activeTable.rows).length;
  const memoryFormatted = memoryBytes < 1024 * 1024
    ? `${(memoryBytes / 1024).toFixed(1)} KB`
    : `${(memoryBytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <footer className="app-statusbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="statusbar-item">
          <Database size={13} color="var(--pastel-blue)" />
          <span>Tabel: <strong>{activeTable.name}</strong></span>
        </div>

        <div className="statusbar-item">
          <span>Total: <strong>{activeTable.rows.length.toLocaleString()} baris</strong> ({activeTable.columns.length} kolom)</span>
        </div>

        {isFiltered && (
          <div className="statusbar-item" style={{ color: 'var(--pastel-amber)' }}>
            <Filter size={12} />
            <span>Hasil Filter: <strong>{filteredCount.toLocaleString()} baris</strong></span>
          </div>
        )}

        {selectedCount > 0 && (
          <div className="statusbar-item" style={{ color: 'var(--pastel-emerald)' }}>
            <CheckSquare size={12} />
            <span>Terpilih: <strong>{selectedCount.toLocaleString()} baris</strong></span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div className="statusbar-item">
          <span>Ukuran: <strong>{memoryFormatted}</strong></span>
        </div>
        <div className="statusbar-item">
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--pastel-emerald)' }} />
          <span>Client-Side Private DB</span>
        </div>
      </div>
    </footer>
  );
};
