import React, { useState } from 'react';
import { SearchCode, X, Check } from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { findAndReplaceData } from '../../services/dataCleaner';

interface FindReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DataTable;
  onUpdateRows: (rows: any[], actionType: any, description: string) => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  isOpen,
  onClose,
  table,
  onUpdateRows,
}) => {
  const [targetColumn, setTargetColumn] = useState<string>('ALL');
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [useRegex, setUseRegex] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExecute = () => {
    if (!findText) return;
    const { rows, count } = findAndReplaceData(
      table.rows,
      targetColumn,
      findText,
      replaceText,
      matchCase,
      useRegex
    );

    onUpdateRows(
      rows,
      'FIND_AND_REPLACE',
      `Find & Replace: "${findText}" -> "${replaceText}" (${count} sel diubah)`
    );
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <SearchCode size={18} color="var(--pastel-blue)" />
            <span>Cari & Ganti Teks (Find & Replace)</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Target Kolom:</label>
            <select
              className="form-control form-select"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
            >
              <option value="ALL">Semua Kolom</option>
              {table.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Teks yang Dicari (Find):</label>
            <input
              type="text"
              className="form-control"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Ketik teks yang ingin dicari..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ganti Menjadi (Replace With):</label>
            <input
              type="text"
              className="form-control"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Teks pengganti..."
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
              />
              <span>Match Case (Sensitif Huruf Besar/Kecil)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              />
              <span>Gunakan Regex (Regular Expression)</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExecute}
            disabled={!findText}
          >
            <Check size={14} />
            <span>Ganti Semua (Replace All)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
