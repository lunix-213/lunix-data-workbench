import React, { useState, useMemo } from 'react';
import { 
  CopyCheck, 
  Sparkles, 
  Sliders, 
  Trash2, 
  Check, 
  ArrowRight, 
  TableProperties, 
  Layers,
  AlertCircle
} from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { DeduplicationRule, DuplicateMatchMode } from '../../types/duplicates';
import { analyzeDuplicates, cleanDuplicatesByRule } from '../../services/dataCleaner';

interface DuplicateManagerProps {
  table: DataTable;
  onUpdateRows: (rows: any[], actionType: any, description: string) => void;
  onAddTable: (table: DataTable) => void;
}

export const DuplicateManager: React.FC<DuplicateManagerProps> = ({
  table,
  onUpdateRows,
  onAddTable,
}) => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    // Default pick first 1-2 string columns
    const textCols = table.columns.filter(c => c.type === 'TEXT').map(c => c.name);
    return textCols.slice(0, 2);
  });

  const [matchMode, setMatchMode] = useState<DuplicateMatchMode>('EXACT');
  const [fuzzyThreshold, setFuzzyThreshold] = useState<number>(0.85);
  const [ignoreCase, setIgnoreCase] = useState<boolean>(true);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(true);
  const [ignoreSpecialChars, setIgnoreSpecialChars] = useState<boolean>(false);

  // Run analysis
  const analysisResult = useMemo(() => {
    return analyzeDuplicates(
      table.rows,
      selectedColumns,
      matchMode,
      fuzzyThreshold,
      ignoreCase,
      ignoreWhitespace,
      ignoreSpecialChars
    );
  }, [table.rows, selectedColumns, matchMode, fuzzyThreshold, ignoreCase, ignoreWhitespace, ignoreSpecialChars]);

  // Toggle selected column
  const toggleColumn = (colName: string) => {
    setSelectedColumns(prev =>
      prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]
    );
  };

  // Select all / clear columns
  const selectAllColumns = () => setSelectedColumns(table.columns.map(c => c.name));
  const clearAllColumns = () => setSelectedColumns([]);

  // Clean by Rule Action
  const handleExecuteRule = (rule: DeduplicationRule) => {
    const { cleanedRows, removedCount } = cleanDuplicatesByRule(table.rows, analysisResult, rule);
    let desc = `Pembersihan duplikat (${rule}): ${removedCount} baris dihapus`;
    onUpdateRows(cleanedRows, 'DEDUPLICATE', desc);
  };

  // Extract duplicates to a new temporary table
  const handleExtractToNewTable = () => {
    if (analysisResult.clusters.length === 0) return;

    const duplicateRows: any[] = [];
    analysisResult.clusters.forEach(c => {
      c.rows.forEach(r => duplicateRows.push({ ...r }));
    });

    const newTable: DataTable = {
      id: `tbl_duplicates_${Date.now()}`,
      name: `Duplikat_${table.name}`,
      columns: [...table.columns],
      rows: duplicateRows.map((r, i) => ({ ...r, _rowIndex: i + 1 })),
      totalRows: duplicateRows.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memorySizeBytes: JSON.stringify(duplicateRows).length,
    };

    onAddTable(newTable);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* Top Header & Settings Panel */}
      <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CopyCheck size={18} color="var(--pastel-rose)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Duplicate Detector & Smart Cleaner
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              (Tabel Aktif: <strong>{table.name}</strong>)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {analysisResult.duplicateRowsCount > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleExtractToNewTable}
                title="Simpan baris duplikat ke tabel baru untuk diperiksa"
              >
                <TableProperties size={13} color="var(--pastel-blue)" />
                <span>Ekstrak ke Tabel Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Header Columns Selector */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
              1. Pilih Kolom Penentu Duplikasi ({selectedColumns.length} kolom terpilih):
            </label>
            <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px' }}>
              <span style={{ cursor: 'pointer', color: 'var(--pastel-blue)' }} onClick={selectAllColumns}>Pilih Semua</span>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <span style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={clearAllColumns}>Hapus Pilihan</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '70px', overflowY: 'auto' }}>
            {table.columns.map(col => {
              const isSelected = selectedColumns.includes(col.name);
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => toggleColumn(col.name)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    border: '1px solid',
                    backgroundColor: isSelected ? 'var(--pastel-blue-bg)' : 'var(--bg-surface)',
                    borderColor: isSelected ? 'var(--pastel-blue-border)' : 'var(--border-subtle)',
                    color: isSelected ? 'var(--pastel-blue)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && <Check size={11} />}
                  <span>{col.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Match Mode & Normalization Options */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', backgroundColor: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode:</span>
              <button
                className={`btn btn-sm ${matchMode === 'EXACT' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMatchMode('EXACT')}
              >
                Exact Match (Persis)
              </button>
              <button
                className={`btn btn-sm ${matchMode === 'FUZZY' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMatchMode('FUZZY')}
              >
                <Sparkles size={12} />
                <span>Fuzzy (Typo / Mirip)</span>
              </button>
            </div>

            {matchMode === 'FUZZY' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Threshold:</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={fuzzyThreshold}
                  onChange={(e) => setFuzzyThreshold(parseFloat(e.target.value))}
                  style={{ width: '90px' }}
                />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pastel-purple)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(fuzzyThreshold * 100)}%
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />
              <span>Abaikan Huruf Besar/Kecil</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              />
              <span>Abaikan Spasi Ganda</span>
            </label>
          </div>
        </div>
      </div>

      {/* Analysis Result Banner & Action Rules */}
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: analysisResult.duplicateRowsCount > 0 ? 'var(--pastel-rose)' : 'var(--pastel-emerald)' }}>
            {analysisResult.duplicateRowsCount > 0 ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>
              {analysisResult.duplicateRowsCount > 0
                ? `Ditemukan ${analysisResult.duplicateRowsCount} baris duplikat (${analysisResult.uniqueClustersCount} kelompok)`
                : 'Tidak ditemukan data duplikat pada kolom terpilih.'}
            </span>
          </div>
        </div>

        {/* 1-Click Action Rules */}
        {analysisResult.duplicateRowsCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Aksi 1-Klik:</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExecuteRule('KEEP_FIRST')}
              title="Simpan baris kemunculan pertama, hapus duplikat sisanya"
            >
              <span>Keep First</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleExecuteRule('KEEP_LAST')}
              title="Simpan baris kemunculan terakhir"
            >
              <span>Keep Last</span>
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={() => handleExecuteRule('KEEP_MOST_COMPLETE')}
              title="Otomatis simpan baris yang kolomnya terisi paling lengkap"
            >
              <Sparkles size={12} />
              <span>Keep Most Complete</span>
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => handleExecuteRule('REMOVE_ALL_DUPLICATES')}
              title="Hapus SEMUA baris yang memiliki duplikat"
            >
              <Trash2 size={12} />
              <span>Remove All</span>
            </button>
          </div>
        )}
      </div>

      {/* Duplicate Clusters Inspector View */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {selectedColumns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Pilih minimal 1 kolom penentu duplikasi di atas untuk memulai analisis.
          </div>
        ) : analysisResult.clusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Check size={32} color="var(--pastel-emerald)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Data Bersih!</div>
            <div style={{ fontSize: '12px' }}>Tidak ada duplikat berdasarkan kolom yang dipilih.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {analysisResult.clusters.map((cluster, cIdx) => (
              <div key={cluster.clusterId} className="cluster-card">
                <div className="cluster-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ backgroundColor: 'var(--pastel-rose-bg)', color: 'var(--pastel-rose)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600 }}>
                      Grup #{cIdx + 1} ({cluster.count} Baris Duplikat)
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      Kunci: "{cluster.key}"
                    </span>
                  </div>

                  {cluster.similarityScore && cluster.similarityScore < 1.0 && (
                    <span style={{ fontSize: '11px', color: 'var(--pastel-purple)' }}>
                      Kemiripan: ~{Math.round(cluster.similarityScore * 100)}%
                    </span>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th className="row-index-cell" style={{ width: '50px' }}>Row #</th>
                        {table.columns.map(col => (
                          <th key={col.name} style={{ color: selectedColumns.includes(col.name) ? 'var(--pastel-rose)' : 'inherit' }}>
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cluster.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td className="row-index-cell">{cluster.rowIndices[rIdx] + 1}</td>
                          {table.columns.map(col => (
                            <td key={col.name} style={{ fontWeight: selectedColumns.includes(col.name) ? 600 : 400 }}>
                              {row[col.name] !== null && row[col.name] !== undefined ? String(row[col.name]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
