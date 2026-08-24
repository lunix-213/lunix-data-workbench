import React, { useState } from 'react';
import { Scissors, X, Check } from 'lucide-react';
import { ColumnSchema, DataTable } from '../../types/dataset';
import { splitColumnByDelimiter } from '../../services/dataCleaner';

interface SplitColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnName: string;
  table: DataTable;
  onUpdateRows: (rows: any[], actionType: any, description: string) => void;
  onUpdateColumns: (columns: ColumnSchema[]) => void;
}

export const SplitColumnModal: React.FC<SplitColumnModalProps> = ({
  isOpen,
  onClose,
  columnName,
  table,
  onUpdateRows,
  onUpdateColumns,
}) => {
  const [delimiter, setDelimiter] = useState<string>(',');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [col1Name, setCol1Name] = useState<string>(`${columnName}_Part1`);
  const [col2Name, setCol2Name] = useState<string>(`${columnName}_Part2`);

  if (!isOpen || !columnName) return null;

  const activeDelimiter = delimiter === 'CUSTOM' ? customDelimiter : delimiter;

  const handleExecute = () => {
    if (!activeDelimiter || !col1Name || !col2Name) return;

    const newColNames = [col1Name.trim(), col2Name.trim()];
    const { rows } = splitColumnByDelimiter(table.rows, columnName, activeDelimiter, newColNames);

    // Add new columns to schema
    const updatedCols: ColumnSchema[] = [...table.columns];
    newColNames.forEach(name => {
      if (!updatedCols.some(c => c.name === name)) {
        updatedCols.push({
          name,
          originalName: name,
          type: 'TEXT',
          inferredType: 'TEXT',
        });
      }
    });

    onUpdateColumns(updatedCols);
    onUpdateRows(
      rows,
      'SPLIT_COLUMN',
      `Split kolom ${columnName} dengan pemisah "${activeDelimiter}" menjadi [${newColNames.join(', ')}]`
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Scissors size={18} color="var(--pastel-indigo)" />
            <span>Split Kolom: "{columnName}"</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Karakter Pemisah (Delimiter):</label>
            <select
              className="form-control form-select"
              value={delimiter}
              onChange={(e) => setDelimiter(e.target.value)}
            >
              <option value=",">Koma (,)</option>
              <option value=";">Titik Koma (;)</option>
              <option value=" ">Spasi ( )</option>
              <option value="-">Tanda Hubung (-)</option>
              <option value="|">Garis Tegak (|)</option>
              <option value="CUSTOM">Karakter Kustom...</option>
            </select>
          </div>

          {delimiter === 'CUSTOM' && (
            <div className="form-group">
              <label className="form-label">Masukkan Karakter Kustom:</label>
              <input
                type="text"
                className="form-control"
                value={customDelimiter}
                onChange={(e) => setCustomDelimiter(e.target.value)}
                placeholder="Contoh: #, /, _, dsb."
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nama Kolom Bagian 1:</label>
              <input
                type="text"
                className="form-control"
                value={col1Name}
                onChange={(e) => setCol1Name(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nama Kolom Bagian 2:</label>
              <input
                type="text"
                className="form-control"
                value={col2Name}
                onChange={(e) => setCol2Name(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExecute}
            disabled={!activeDelimiter || !col1Name || !col2Name}
          >
            <Check size={14} />
            <span>Pisahkan Kolom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
