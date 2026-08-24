import React from 'react';
import { 
  Search, 
  X, 
  RotateCcw, 
  RotateCw, 
  Plus, 
  Trash2, 
  Calculator, 
  SearchCode, 
  Filter,
  ArrowDownUp
} from 'lucide-react';
import { ColumnSchema } from '../../types/dataset';

interface TableToolbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchColumn: string;
  setSearchColumn: (col: string) => void;
  columns: ColumnSchema[];
  pageSize: number;
  setPageSize: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow: () => void;
  onDeleteSelectedRows: () => void;
  selectedRowsCount: number;
  onOpenFormulaModal: () => void;
  onOpenFindReplaceModal: () => void;
  onOpenUnpivotModal: () => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  searchColumn,
  setSearchColumn,
  columns,
  pageSize,
  setPageSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
  onDeleteSelectedRows,
  selectedRowsCount,
  onOpenFormulaModal,
  onOpenFindReplaceModal,
  onOpenUnpivotModal,
}) => {
  return (
    <div className="grid-toolbar">
      <div className="toolbar-left">
        {/* Search Input */}
        <div className="input-search-wrapper">
          <Search size={14} className="input-search-icon" />
          <input
            type="text"
            className="input-search"
            placeholder="Cari data di seluruh sel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onClick={() => setSearchTerm('')}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter by Specific Column */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={13} color="var(--text-muted)" />
          <select
            className="form-control form-select"
            style={{ height: '32px', fontSize: '12px', padding: '0 26px 0 8px', width: '130px' }}
            value={searchColumn}
            onChange={(e) => setSearchColumn(e.target.value)}
          >
            <option value="ALL">Semua Kolom</option>
            {columns.map(col => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Urungkan Perubahan)"
          >
            <RotateCcw size={13} />
          </button>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ulangi Perubahan)"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        {/* Bulk Delete Selected */}
        {selectedRowsCount > 0 && (
          <button
            className="btn btn-danger btn-sm"
            onClick={onDeleteSelectedRows}
            title={`Hapus ${selectedRowsCount} baris yang dicentang`}
          >
            <Trash2 size={13} />
            <span>Hapus ({selectedRowsCount})</span>
          </button>
        )}

        {/* Add Row */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onAddRow}
          title="Tambah Baris Baru di Bawah"
        >
          <Plus size={13} />
          <span>Tambah Baris</span>
        </button>

        {/* Find & Replace */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenFindReplaceModal}
          title="Cari & Ganti Teks (Find & Replace)"
        >
          <SearchCode size={13} color="var(--pastel-blue)" />
          <span>Find & Replace</span>
        </button>

        {/* Add Formula / Calculated Column */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenFormulaModal}
          title="Tambah Kolom Kalkulasi Baru (Rumus / Formula)"
        >
          <Calculator size={13} color="var(--pastel-purple)" />
          <span>Formula Column</span>
        </button>

        {/* Unpivot / Transpose */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenUnpivotModal}
          title="Ubah Kolom Menjadi Baris Vertikal (Unpivot / Key-Value Stacking)"
        >
          <ArrowDownUp size={13} color="var(--pastel-emerald)" />
          <span>Unpivot (Kolom ➔ Baris)</span>
        </button>

        {/* Page Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>Tampilkan:</span>
          <select
            className="form-control form-select"
            style={{ height: '28px', fontSize: '12px', padding: '0 24px 0 8px', width: '80px' }}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
          </select>
        </div>
      </div>
    </div>
  );
};
