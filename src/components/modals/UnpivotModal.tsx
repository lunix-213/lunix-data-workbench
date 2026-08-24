import React, { useState, useMemo } from 'react';
import { X, ArrowDownUp, ArrowUp, ArrowDown, Check, Layers, Sparkles, Filter, Database, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { sanitizeTableName } from '../../services/sqlEngine';

interface UnpivotModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: DataTable;
  tables: DataTable[];
  onAddTable: (newTable: DataTable) => void;
}

export const UnpivotModal: React.FC<UnpivotModalProps> = ({
  isOpen,
  onClose,
  table,
  tables,
  onAddTable,
}) => {
  // Fixed ID Columns (e.g. ['ID_Pelanggan', 'Nama_Perusahaan'])
  const [selectedIdCols, setSelectedIdCols] = useState<string[]>(() => {
    const idCol = table.columns.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('no')) || table.columns[0];
    return idCol ? [idCol.name] : [];
  });

  // Optional Cross-Table Join
  const [isJoinEnabled, setIsJoinEnabled] = useState<boolean>(false);
  const otherTables = tables.filter(t => t.id !== table.id);
  const [joinedTableId, setJoinedTableId] = useState<string>(otherTables[0]?.id || '');
  const joinedTable = tables.find(t => t.id === joinedTableId) || null;

  const [leftJoinKey, setLeftJoinKey] = useState<string>(() => {
    return table.columns.find(c => c.name.toLowerCase().includes('id'))?.name || table.columns[0]?.name || '';
  });
  const [rightJoinKey, setRightJoinKey] = useState<string>(() => {
    return joinedTable?.columns.find(c => c.name.toLowerCase().includes('id'))?.name || joinedTable?.columns[0]?.name || '';
  });

  // Selected Value Columns to Unpivot (e.g. ['Nama_Produk', 'Qty', 'Harga_Satuan'])
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    return table.columns
      .filter(c => !selectedIdCols.includes(c.name))
      .slice(0, 3)
      .map(c => c.name);
  });

  const [attributeColName, setAttributeColName] = useState<string>('Nama_Atribut');
  const [valueColName, setValueColName] = useState<string>('Nilai_Data');
  const [filterIdValue, setFilterIdValue] = useState<string>('');
  const [newTableName, setNewTableName] = useState<string>(`${table.name}_Unpivoted`);

  // Available columns from Main Table and Joined Table
  const allAvailableColumns = useMemo(() => {
    const list: { source: string; name: string; isJoined: boolean }[] = [];
    table.columns.forEach(c => {
      list.push({ source: table.name, name: c.name, isJoined: false });
    });
    if (isJoinEnabled && joinedTable) {
      joinedTable.columns.forEach(c => {
        if (!list.some(item => item.name === c.name)) {
          list.push({ source: joinedTable.name, name: c.name, isJoined: true });
        }
      });
    }
    return list;
  }, [table, isJoinEnabled, joinedTable]);

  // Compute Joined Rows + Unpivoted result
  const previewRows = useMemo(() => {
    if (selectedIdCols.length === 0 || selectedValues.length === 0) return [];

    // Build join lookup map if join is active
    const joinMap = new Map<string, any>();
    if (isJoinEnabled && joinedTable && rightJoinKey) {
      joinedTable.rows.forEach(r => {
        const k = String(r[rightJoinKey] || '').trim();
        if (k) joinMap.set(k, r);
      });
    }

    // Prepare combined rows
    let combinedRows = table.rows.map(mainRow => {
      const rowCopy = { ...mainRow };
      if (isJoinEnabled && joinedTable && leftJoinKey) {
        const keyVal = String(mainRow[leftJoinKey] || '').trim();
        const joinedRow = joinMap.get(keyVal);
        if (joinedRow) {
          Object.keys(joinedRow).forEach(k => {
            if (k !== '_rowIndex' && !(k in rowCopy)) {
              rowCopy[k] = joinedRow[k];
            }
          });
        }
      }
      return rowCopy;
    });

    // Optional Filter by specific ID value (e.g. CUST-001)
    if (filterIdValue && filterIdValue.trim() && selectedIdCols.length > 0) {
      const searchVal = filterIdValue.trim().toLowerCase();
      combinedRows = combinedRows.filter(r => {
        return selectedIdCols.some(col => String(r[col] || '').trim().toLowerCase() === searchVal);
      });
    }

    // Unpivot each combined row
    const resultRows: any[] = [];
    combinedRows.forEach((r, rowIdx) => {
      selectedValues.forEach(vCol => {
        const newRow: any = {
          _rowIndex: resultRows.length + 1,
        };
        // Populate Fixed ID Columns
        selectedIdCols.forEach(idCol => {
          newRow[idCol] = r[idCol] ?? '-';
        });
        newRow[attributeColName || 'Nama_Atribut'] = vCol;
        newRow[valueColName || 'Nilai_Data'] = r[vCol] ?? '-';
        resultRows.push(newRow);
      });
    });

    return resultRows;
  }, [
    table.rows,
    selectedIdCols,
    isJoinEnabled,
    joinedTable,
    leftJoinKey,
    rightJoinKey,
    selectedValues,
    attributeColName,
    valueColName,
    filterIdValue,
  ]);

  // Sorting state for preview & output
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  const handleHeaderSort = (colName: string) => {
    if (sortColumn === colName) {
      if (sortDirection === 'ASC') {
        setSortDirection('DESC');
      } else {
        setSortColumn(null);
        setSortDirection('ASC');
      }
    } else {
      setSortColumn(colName);
      setSortDirection('ASC');
    }
  };

  // Sorted preview rows
  const sortedPreviewRows = useMemo(() => {
    if (!sortColumn) return previewRows;
    const sorted = [...previewRows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const numA = Number(valA);
      const numB = Number(valB);
      const isNum = !isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && String(valA).trim() !== '' && String(valB).trim() !== '';

      let cmp = 0;
      if (isNum) {
        cmp = numA - numB;
      } else {
        cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortDirection === 'DESC' ? -cmp : cmp;
    });
    return sorted;
  }, [previewRows, sortColumn, sortDirection]);

  if (!isOpen) return null;

  const handleToggleIdCol = (colName: string) => {
    if (selectedIdCols.includes(colName)) {
      if (selectedIdCols.length > 1) {
        setSelectedIdCols(selectedIdCols.filter(c => c !== colName));
      }
    } else {
      setSelectedIdCols([...selectedIdCols, colName]);
      setSelectedValues(selectedValues.filter(c => c !== colName));
    }
  };

  const handleToggleValueCol = (colName: string) => {
    if (selectedValues.includes(colName)) {
      setSelectedValues(selectedValues.filter(c => c !== colName));
    } else {
      setSelectedValues([...selectedValues, colName]);
      setSelectedIdCols(selectedIdCols.filter(c => c !== colName));
    }
  };

  const handleExecuteUnpivot = () => {
    if (sortedPreviewRows.length === 0) return;

    const newColumns = [
      ...selectedIdCols.map(colName => ({
        name: colName,
        originalName: colName,
        type: 'TEXT' as const,
        inferredType: 'TEXT' as const,
      })),
      {
        name: attributeColName || 'Nama_Atribut',
        originalName: attributeColName || 'Nama_Atribut',
        type: 'TEXT' as const,
        inferredType: 'TEXT' as const,
      },
      {
        name: valueColName || 'Nilai_Data',
        originalName: valueColName || 'Nilai_Data',
        type: 'TEXT' as const,
        inferredType: 'TEXT' as const,
      },
    ];

    const newTable: DataTable = {
      id: `tbl_unpivot_${Date.now()}`,
      name: newTableName.trim() || `${table.name}_Unpivoted`,
      columns: newColumns,
      rows: sortedPreviewRows,
      totalRows: sortedPreviewRows.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memorySizeBytes: JSON.stringify(sortedPreviewRows).length,
    };

    onAddTable(newTable);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '780px', width: '96%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowDownUp size={18} color="var(--pastel-emerald)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
              Relational Unpivot (Ekstrak Atribut Kolom ke Baris Vertikal)
            </h3>
          </div>
          <button className="btn btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', overflowY: 'auto' }}>
          {/* Context Helper Alert */}
          <div style={{ backgroundColor: 'var(--pastel-emerald-bg)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--pastel-emerald-border)', color: 'var(--pastel-emerald)', fontSize: '11.5px' }}>
            💡 <strong>Kegunaan:</strong> Mengubah format kolom horizontal menjadi baris vertikal (*Key-Value Stacking*) dengan tetap mempertahankan kolom identitas utama (misal: ID & Nama Pelanggan).
          </div>

          {/* Optional Cross-Table Join Bar */}
          {otherTables.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isJoinEnabled ? '8px' : 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: 'var(--pastel-indigo)' }}>
                  <input
                    type="checkbox"
                    checked={isJoinEnabled}
                    onChange={(e) => setIsJoinEnabled(e.target.checked)}
                  />
                  <span>🔗 Hubungkan dengan Tabel Master Tambahan (Relational JOIN / VLOOKUP)</span>
                </label>
              </div>

              {isJoinEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', marginTop: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Gabung dengan:</span>
                  <select
                    className="form-control form-select"
                    style={{ width: '180px', height: '28px', fontSize: '11.5px' }}
                    value={joinedTableId}
                    onChange={(e) => {
                      setJoinedTableId(e.target.value);
                      const target = tables.find(t => t.id === e.target.value);
                      setRightJoinKey(target?.columns[0]?.name || '');
                    }}
                  >
                    {otherTables.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ON</span>

                  <select
                    className="form-control form-select"
                    style={{ width: '140px', height: '28px', fontSize: '11.5px' }}
                    value={leftJoinKey}
                    onChange={(e) => setLeftJoinKey(e.target.value)}
                  >
                    {table.columns.map(c => (
                      <option key={c.name} value={c.name}>{table.name}.{c.name}</option>
                    ))}
                  </select>

                  <span style={{ fontSize: '12px', fontWeight: 700 }}>=</span>

                  <select
                    className="form-control form-select"
                    style={{ width: '140px', height: '28px', fontSize: '11.5px' }}
                    value={rightJoinKey}
                    onChange={(e) => setRightJoinKey(e.target.value)}
                  >
                    {joinedTable?.columns.map(c => (
                      <option key={c.name} value={c.name}>{joinedTable.name}.{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Configuration Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Step 1: Fixed ID / Header Columns */}
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--pastel-blue)', marginBottom: 0 }}>
                  1. Kolom Identitas Tetap:
                </label>
              </div>

              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {allAvailableColumns.map(col => {
                  const isChecked = selectedIdCols.includes(col.name);
                  return (
                    <label key={`${col.source}_${col.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-sm)', backgroundColor: isChecked ? 'var(--pastel-blue-bg)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleIdCol(col.name)}
                        />
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{col.name}</span>
                      </div>
                      <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', opacity: 0.8 }}>({col.source})</span>
                    </label>
                  );
                })}
              </div>

              {/* Filter specific ID */}
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  Filter Nilai Kunci Tertentu (Opsional):
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Kosongkan untuk memproses seluruh data..."
                  value={filterIdValue}
                  onChange={(e) => setFilterIdValue(e.target.value)}
                  style={{ height: '26px', fontSize: '11.5px' }}
                />
              </div>
            </div>

            {/* Step 2: Value Columns to Unpivot */}
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--pastel-emerald)', marginBottom: 0 }}>
                  2. Kolom Rincian yang Ditumpuk ke Bawah:
                </label>
              </div>

              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {allAvailableColumns
                  .filter(c => !selectedIdCols.includes(c.name))
                  .map(col => {
                    const isChecked = selectedValues.includes(col.name);
                    return (
                      <label key={`${col.source}_${col.name}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', cursor: 'pointer', padding: '2px 4px', borderRadius: 'var(--radius-sm)', backgroundColor: isChecked ? 'var(--pastel-emerald-bg)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleValueCol(col.name)}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{col.name}</span>
                        </div>
                        <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', opacity: 0.8 }}>({col.source})</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Live Preview Table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                Hasil Tampilan Output ({previewRows.length} baris):
              </span>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <table className="data-table" style={{ fontSize: '11.5px' }}>
                <thead>
                  <tr>
                    <th
                      style={{ width: '44px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                      onClick={() => handleHeaderSort('_rowIndex')}
                      title="Klik untuk urutkan berdasarkan baris asli"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <span>#</span>
                        {sortColumn === '_rowIndex' && (
                          sortDirection === 'ASC' ? <ArrowUp size={11} color="var(--pastel-blue)" /> : <ArrowDown size={11} color="var(--pastel-blue)" />
                        )}
                      </div>
                    </th>

                    {selectedIdCols.map(c => (
                      <th
                        key={c}
                        style={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          backgroundColor: sortColumn === c ? 'var(--pastel-blue-bg)' : undefined,
                        }}
                        onClick={() => handleHeaderSort(c)}
                        title={`Klik untuk mengurutkan data berdasarkan kolom ${c}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ color: sortColumn === c ? 'var(--pastel-blue)' : 'inherit', fontWeight: sortColumn === c ? 700 : 600 }}>
                            {c}
                          </span>
                          {sortColumn === c ? (
                            sortDirection === 'ASC' ? <ArrowUp size={12} color="var(--pastel-blue)" /> : <ArrowDown size={12} color="var(--pastel-blue)" />
                          ) : (
                            <ArrowDownUp size={11} style={{ opacity: 0.35 }} />
                          )}
                        </div>
                      </th>
                    ))}

                    <th
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortColumn === (attributeColName || 'Nama_Atribut') ? 'var(--pastel-indigo-bg)' : undefined,
                      }}
                      onClick={() => handleHeaderSort(attributeColName || 'Nama_Atribut')}
                      title="Klik untuk mengurutkan berdasarkan nama atribut"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ color: sortColumn === (attributeColName || 'Nama_Atribut') ? 'var(--pastel-indigo)' : 'inherit', fontWeight: sortColumn === (attributeColName || 'Nama_Atribut') ? 700 : 600 }}>
                          {attributeColName || 'Nama_Atribut'}
                        </span>
                        {sortColumn === (attributeColName || 'Nama_Atribut') ? (
                          sortDirection === 'ASC' ? <ArrowUp size={12} color="var(--pastel-indigo)" /> : <ArrowDown size={12} color="var(--pastel-indigo)" />
                        ) : (
                          <ArrowDownUp size={11} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>

                    <th
                      style={{
                        cursor: 'pointer',
                        userSelect: 'none',
                        backgroundColor: sortColumn === (valueColName || 'Nilai_Data') ? 'var(--pastel-emerald-bg)' : undefined,
                      }}
                      onClick={() => handleHeaderSort(valueColName || 'Nilai_Data')}
                      title="Klik untuk mengurutkan berdasarkan nilai data"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ color: sortColumn === (valueColName || 'Nilai_Data') ? 'var(--pastel-emerald)' : 'inherit', fontWeight: sortColumn === (valueColName || 'Nilai_Data') ? 700 : 600 }}>
                          {valueColName || 'Nilai_Data'}
                        </span>
                        {sortColumn === (valueColName || 'Nilai_Data') ? (
                          sortDirection === 'ASC' ? <ArrowUp size={12} color="var(--pastel-emerald)" /> : <ArrowDown size={12} color="var(--pastel-emerald)" />
                        ) : (
                          <ArrowDownUp size={11} style={{ opacity: 0.35 }} />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPreviewRows.slice(0, 15).map((r, idx) => (
                    <tr key={idx}>
                      <td className="row-index-cell">{idx + 1}</td>
                      {selectedIdCols.map(c => (
                        <td key={c} style={{ fontWeight: 600, color: 'var(--pastel-blue)' }}>
                          {String(r[c] ?? '-')}
                        </td>
                      ))}
                      <td style={{ color: 'var(--pastel-indigo)', fontWeight: 600 }}>
                        {String(r[attributeColName || 'Nama_Atribut'])}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {String(r[valueColName || 'Nilai_Data'])}
                      </td>
                    </tr>
                  ))}
                  {sortedPreviewRows.length > 15 && (
                    <tr>
                      <td colSpan={selectedIdCols.length + 3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                        ... dan {sortedPreviewRows.length - 15} baris lainnya
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExecuteUnpivot}
            disabled={previewRows.length === 0}
          >
            <Check size={13} />
            <span>Buat Tabel Hasil Unpivot ({previewRows.length} Baris)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
