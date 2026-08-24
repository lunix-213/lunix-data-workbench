import React, { useState } from 'react';
import { Layers, GitMerge, X, Check, FileSpreadsheet } from 'lucide-react';
import { DataTable, AppendConfig, JoinConfig } from '../../types/dataset';

interface MergeJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: DataTable[];
  onAppendTables: (config: AppendConfig) => void;
  onJoinTables: (config: JoinConfig) => void;
}

export const MergeJoinModal: React.FC<MergeJoinModalProps> = ({
  isOpen,
  onClose,
  tables,
  onAppendTables,
  onJoinTables,
}) => {
  const [mode, setMode] = useState<'APPEND' | 'JOIN'>('APPEND');

  // Append State
  const [selectedTableIdsForAppend, setSelectedTableIdsForAppend] = useState<string[]>(() =>
    tables.slice(0, 2).map(t => t.id)
  );
  const [appendTableName, setAppendTableName] = useState<string>('Combined_Master_Table');
  const [addSourceColumn, setAddSourceColumn] = useState<boolean>(true);

  // Join State
  const [leftTableId, setLeftTableId] = useState<string>(() => tables[0]?.id || '');
  const [rightTableId, setRightTableId] = useState<string>(() => (tables.length > 1 ? tables[1]?.id : tables[0]?.id || ''));

  const leftTable = tables.find(t => t.id === leftTableId);
  const rightTable = tables.find(t => t.id === rightTableId);

  const [leftKey, setLeftKey] = useState<string>(() => leftTable?.columns[0]?.name || '');
  const [rightKey, setRightKey] = useState<string>(() => rightTable?.columns[0]?.name || '');
  const [joinType, setJoinType] = useState<'LEFT' | 'INNER' | 'FULL'>('LEFT');
  const [joinTableName, setJoinTableName] = useState<string>('Joined_Relational_Table');

  if (!isOpen) return null;

  const toggleAppendTable = (id: string) => {
    setSelectedTableIdsForAppend(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleExecuteAppend = () => {
    if (selectedTableIdsForAppend.length < 2) return;
    onAppendTables({
      tableIdsToAppend: selectedTableIdsForAppend,
      newTableName: appendTableName.trim() || 'Appended_Table',
      addSourceFileColumn: addSourceColumn,
    });
    onClose();
  };

  const handleExecuteJoin = () => {
    if (!leftTableId || !rightTableId || !leftKey || !rightKey) return;
    onJoinTables({
      leftTableId,
      rightTableId,
      leftKey,
      rightKey,
      joinType,
      resultTableName: joinTableName.trim() || 'Joined_Table',
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <GitMerge size={18} color="var(--pastel-indigo)" />
            <span>Table Combiner & Relational Join Wizard</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn ${mode === 'APPEND' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setMode('APPEND')}
            >
              <Layers size={14} />
              <span>1. Append / Stack (Tumpuk Baris)</span>
            </button>
            <button
              className={`btn ${mode === 'JOIN' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => setMode('JOIN')}
            >
              <GitMerge size={14} />
              <span>2. Relational JOIN (Hubungkan Kolom)</span>
            </button>
          </div>

          {mode === 'APPEND' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Menggabungkan data dari beberapa file/tabel (contoh: file laporan bulanan Jan + Feb + Mar) menjadi 1 tabel besar.
              </div>

              <div>
                <label className="form-label">Pilih Tabel yang Ingin Ditumpuk (Minimal 2):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {tables.map(t => {
                    const isChecked = selectedTableIdsForAppend.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          backgroundColor: isChecked ? 'var(--pastel-blue-bg)' : 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid',
                          borderColor: isChecked ? 'var(--pastel-blue-border)' : 'var(--border-subtle)',
                          cursor: 'pointer',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAppendTable(t.id)}
                          />
                          <span>{t.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.rows.length} baris</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="chkSource"
                  checked={addSourceColumn}
                  onChange={(e) => setAddSourceColumn(e.target.checked)}
                />
                <label htmlFor="chkSource" style={{ cursor: 'pointer' }}>
                  Tambahkan kolom <code>_source_table</code> agar tahu baris berasal dari file yang mana.
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Nama Tabel Hasil Penggabungan:</label>
                <input
                  type="text"
                  className="form-control"
                  value={appendTableName}
                  onChange={(e) => setAppendTableName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Menghubungkan 2 tabel berdasarkan kolom kunci yang sama (seperti fungsi VLOOKUP / SQL JOIN).
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Tabel Kiri (Utama):</label>
                  <select
                    className="form-control form-select"
                    value={leftTableId}
                    onChange={(e) => {
                      setLeftTableId(e.target.value);
                      const t = tables.find(item => item.id === e.target.value);
                      if (t) setLeftKey(t.columns[0]?.name || '');
                    }}
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <label className="form-label" style={{ marginTop: '8px' }}>Kolom Kunci Kiri:</label>
                  <select
                    className="form-control form-select"
                    value={leftKey}
                    onChange={(e) => setLeftKey(e.target.value)}
                  >
                    {leftTable?.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Tabel Kanan (Relasi):</label>
                  <select
                    className="form-control form-select"
                    value={rightTableId}
                    onChange={(e) => {
                      setRightTableId(e.target.value);
                      const t = tables.find(item => item.id === e.target.value);
                      if (t) setRightKey(t.columns[0]?.name || '');
                    }}
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <label className="form-label" style={{ marginTop: '8px' }}>Kolom Kunci Kanan:</label>
                  <select
                    className="form-control form-select"
                    value={rightKey}
                    onChange={(e) => setRightKey(e.target.value)}
                  >
                    {rightTable?.columns.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tipe Relasi (Join Type):</label>
                <select
                  className="form-control form-select"
                  value={joinType}
                  onChange={(e) => setJoinType(e.target.value as any)}
                >
                  <option value="LEFT">LEFT JOIN (Pertahankan semua data tabel kiri)</option>
                  <option value="INNER">INNER JOIN (Hanya data yang cocok di kedua tabel)</option>
                  <option value="FULL">FULL OUTER JOIN (Pertahankan semua data dari kedua tabel)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Tabel Hasil Join:</label>
                <input
                  type="text"
                  className="form-control"
                  value={joinTableName}
                  onChange={(e) => setJoinTableName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={mode === 'APPEND' ? handleExecuteAppend : handleExecuteJoin}
            disabled={mode === 'APPEND' ? selectedTableIdsForAppend.length < 2 : !leftKey || !rightKey}
          >
            <Check size={14} />
            <span>Eksekusi Penggabungan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
