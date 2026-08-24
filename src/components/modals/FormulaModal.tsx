import React, { useState } from 'react';
import { Calculator, X, Check, Sparkles } from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { evaluateFormulaColumn } from '../../services/dataCleaner';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DataTable;
  onUpdateRows: (rows: any[], actionType: any, description: string) => void;
  onAddColumn: (colName: string) => void;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({
  isOpen,
  onClose,
  table,
  onUpdateRows,
  onAddColumn,
}) => {
  const [newColName, setNewColName] = useState<string>('');
  const [formula, setFormula] = useState<string>('');

  if (!isOpen) return null;

  const insertColumnTag = (colName: string) => {
    setFormula(prev => `${prev}[${colName}]`);
  };

  const handleApply = () => {
    if (!newColName.trim() || !formula.trim()) return;

    const name = newColName.trim();
    const updatedRows = evaluateFormulaColumn(table.rows, name, formula, table.columns);

    onAddColumn(name);
    onUpdateRows(updatedRows, 'ADD_CALCULATED_COLUMN', `Tambah kolom kalkulasi '${name}' dengan rumus: ${formula}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Calculator size={18} color="var(--pastel-purple)" />
            <span>Tambah Kolom Kalkulasi Baru (Formula)</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Nama Kolom Baru:</label>
            <input
              type="text"
              className="form-control"
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="Contoh: Total_Bersih, Nama_Lengkap..."
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Rumus / Formula Ekspresi:</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Klik kolom di bawah untuk menyisipkan</span>
            </div>

            <textarea
              className="form-control"
              style={{ height: '70px', fontFamily: 'var(--font-mono)', fontSize: '13px', paddingTop: '8px' }}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Contoh: [Harga] * [Qty] * 0.9"
            />
          </div>

          {/* Quick Column Badges */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Sisipkan Variabel Kolom:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '90px', overflowY: 'auto' }}>
              {table.columns.map(c => (
                <button
                  key={c.name}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ height: '24px', fontSize: '11px', padding: '0 8px' }}
                  onClick={() => insertColumnTag(c.name)}
                >
                  [{c.name}]
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            <div style={{ fontWeight: 600, color: 'var(--pastel-blue)', marginBottom: '4px' }}>Contoh Rumus:</div>
            <div>• Matematika: <code>[Harga] * [Qty]</code></div>
            <div>• Gabung Teks: <code>CONCAT([Nama_Depan], " ", [Nama_Belakang])</code></div>
            <div>• Logika Kondisi: <code>IF([Total_Bayar] &gt; 1000000, "VIP", "Reguler")</code></div>
            <div>• Huruf Besar: <code>UPPER([Status])</code></div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleApply}
            disabled={!newColName.trim() || !formula.trim()}
          >
            <Check size={14} />
            <span>Terapkan Kolom Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
};
