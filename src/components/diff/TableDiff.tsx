import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  CheckCircle2, 
  AlertTriangle, 
  MinusCircle, 
  PlusCircle, 
  Download, 
  Plus, 
  Trash2, 
  Layers, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { MultiDiffAnalysisResult, MultiDiffRowResult, MultiDiffStatus, ReconTargetTable } from '../../types/diff';
import { exportToExcel } from '../../services/exporter';

interface TableDiffProps {
  tables: DataTable[];
}

export const TableDiff: React.FC<TableDiffProps> = ({ tables }) => {
  // Configured tables for multi-way reconciliation
  const [reconTargets, setReconTargets] = useState<ReconTargetTable[]>(() => {
    const initial: ReconTargetTable[] = [];
    if (tables.length > 0) {
      initial.push({
        id: 'target_1',
        tableId: tables[0].id,
        keyColumn: tables[0].columns[0]?.name || '',
        alias: 'Tabel_A',
      });
    }
    if (tables.length > 1) {
      initial.push({
        id: 'target_2',
        tableId: tables[1].id,
        keyColumn: tables[1].columns[0]?.name || '',
        alias: 'Tabel_B',
      });
    }
    if (tables.length > 2) {
      initial.push({
        id: 'target_3',
        tableId: tables[2].id,
        keyColumn: tables[2].columns[0]?.name || '',
        alias: 'Tabel_C',
      });
    }
    return initial;
  });

  const [activeFilterStatus, setActiveFilterStatus] = useState<MultiDiffStatus | 'ALL'>('ALL');

  // Add another table target (Table C, D, E...)
  const handleAddTableTarget = () => {
    const usedIds = new Set(reconTargets.map(t => t.tableId));
    const available = tables.find(t => !usedIds.has(t.id)) || tables[0];
    if (!available) return;

    const nextIndex = reconTargets.length;
    const charAlias = String.fromCharCode(65 + nextIndex); // A, B, C, D...

    setReconTargets(prev => [
      ...prev,
      {
        id: `target_${Date.now()}`,
        tableId: available.id,
        keyColumn: available.columns[0]?.name || '',
        alias: `Tabel_${charAlias}`,
      },
    ]);
  };

  // Remove a table target
  const handleRemoveTableTarget = (targetId: string) => {
    if (reconTargets.length <= 2) return; // Keep at least 2 tables
    setReconTargets(prev => prev.filter(t => t.id !== targetId));
  };

  // Update target config
  const handleUpdateTarget = (targetId: string, field: 'tableId' | 'keyColumn', value: string) => {
    setReconTargets(prev => prev.map(t => {
      if (t.id !== targetId) return t;
      if (field === 'tableId') {
        const found = tables.find(item => item.id === value);
        return {
          ...t,
          tableId: value,
          keyColumn: found?.columns[0]?.name || '',
        };
      }
      return { ...t, [field]: value };
    }));
  };

  // Multi-Table Reconciliation Engine
  const diffResult: MultiDiffAnalysisResult | null = useMemo(() => {
    if (reconTargets.length < 2) return null;

    // Collect all table objects and build key maps
    const activeTargets = reconTargets.map(target => {
      const tableObj = tables.find(t => t.id === target.tableId);
      const rowMap = new Map<string, any>();
      if (tableObj && target.keyColumn) {
        tableObj.rows.forEach(r => {
          const k = String(r[target.keyColumn] || '').trim();
          if (k) rowMap.set(k, r);
        });
      }
      return {
        ...target,
        tableObj,
        rowMap,
      };
    });

    // Gather all unique keys across all tables
    const allKeysSet = new Set<string>();
    activeTargets.forEach(at => {
      at.rowMap.forEach((_, key) => allKeysSet.add(key));
    });

    const diffRows: MultiDiffRowResult[] = [];
    let matchedAllCount = 0;
    let mismatchCount = 0;
    let partialCount = 0;
    let exclusiveCount = 0;

    allKeysSet.forEach(keyVal => {
      const presentInTables: string[] = [];
      const missingInTables: string[] = [];
      const tableRows: Record<string, any> = {};

      activeTargets.forEach(at => {
        const row = at.rowMap.get(keyVal);
        if (row) {
          presentInTables.push(at.alias);
          tableRows[at.alias] = row;
        } else {
          missingInTables.push(at.alias);
        }
      });

      // Determine Status
      let status: MultiDiffStatus = 'EXCLUSIVE';
      const differingColumns: string[] = [];

      if (presentInTables.length === activeTargets.length) {
        // Exists in ALL tables! Now check if shared column values match
        const firstRow = tableRows[activeTargets[0].alias];
        let hasMismatch = false;

        // Check common keys
        Object.keys(firstRow).forEach(colName => {
          if (colName === '_rowIndex') return;
          const val0 = String(firstRow[colName] ?? '').trim();

          for (let i = 1; i < activeTargets.length; i++) {
            const otherRow = tableRows[activeTargets[i].alias];
            if (otherRow && colName in otherRow) {
              const otherVal = String(otherRow[colName] ?? '').trim();
              if (val0 !== otherVal) {
                hasMismatch = true;
                differingColumns.push(colName);
              }
            }
          }
        });

        if (hasMismatch) {
          status = 'MISMATCH';
          mismatchCount++;
        } else {
          status = 'MATCHED_ALL';
          matchedAllCount++;
        }
      } else if (presentInTables.length > 1) {
        // Exists in some tables (e.g. 2 of 3)
        status = 'PARTIAL_MATCH';
        partialCount++;
      } else {
        // Exists in only 1 table
        status = 'EXCLUSIVE';
        exclusiveCount++;
      }

      diffRows.push({
        key: keyVal,
        status,
        presentInTables,
        missingInTables,
        tableRows,
        differingColumns,
      });
    });

    return {
      targets: reconTargets,
      totalUniqueKeys: allKeysSet.size,
      matchedAllCount,
      mismatchCount,
      partialCount,
      exclusiveCount,
      diffRows,
    };
  }, [reconTargets, tables]);

  // Filtered rows by status tab
  const visibleRows = useMemo(() => {
    if (!diffResult) return [];
    if (activeFilterStatus === 'ALL') return diffResult.diffRows;
    return diffResult.diffRows.filter(r => r.status === activeFilterStatus);
  }, [diffResult, activeFilterStatus]);

  // Export Multi-Table Reconciliation Report to Excel
  const handleExportReconciliation = () => {
    if (!diffResult) return;

    const exportRows = diffResult.diffRows.map(dr => {
      const rowObj: any = {
        Key_Identifier: dr.key,
        Status_Rekonsiliasi: dr.status,
        Hadir_di_Tabel: dr.presentInTables.join(', '),
        Hilang_di_Tabel: dr.missingInTables.join(', '),
        Kolom_Beda_Nilai: dr.differingColumns.join(', '),
      };

      reconTargets.forEach(target => {
        const row = dr.tableRows[target.alias];
        if (row) {
          Object.keys(row).forEach(k => {
            if (k !== '_rowIndex') {
              rowObj[`[${target.alias}]_${k}`] = row[k];
            }
          });
        }
      });

      return rowObj;
    });

    const columns = Object.keys(exportRows[0] || {}).map(k => ({
      name: k,
      originalName: k,
      type: 'TEXT' as const,
      inferredType: 'TEXT' as const,
    }));

    const tableNames = reconTargets.map(t => t.alias).join('_vs_');
    exportToExcel(exportRows, columns, `Reconciliation_${reconTargets.length}_Tables_${tableNames}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* Configuration Header */}
      <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCompare size={18} color="var(--pastel-amber)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Multi-Table Reconciliation & 3-Way Diff Inspector
            </h2>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              (Bandingkan 2, 3, atau lebih tabel sekaligus secara simultan)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAddTableTarget}
              title="Tambah tabel pembanding ketiga atau keempat (3-Way / N-Way Match)"
            >
              <Plus size={13} />
              <span>+ Tambah Tabel ({reconTargets.length + 1})</span>
            </button>

            <button
              className="btn btn-success btn-sm"
              onClick={handleExportReconciliation}
              disabled={!diffResult}
              title="Download laporan rekonsiliasi lengkap ke Excel"
            >
              <Download size={13} />
              <span>Download Laporan Excel</span>
            </button>
          </div>
        </div>

        {/* Dynamic Targets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(240px, 1fr))`, gap: '12px' }}>
          {reconTargets.map((target, idx) => {
            const tableObj = tables.find(t => t.id === target.tableId);
            const aliasColors = ['var(--pastel-blue)', 'var(--pastel-purple)', 'var(--pastel-emerald)', 'var(--pastel-amber)'];
            const color = aliasColors[idx % aliasColors.length];

            return (
              <div
                key={target.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color, backgroundColor: 'var(--bg-app)', padding: '1px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      {target.alias}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Tabel #{idx + 1}
                    </span>
                  </div>

                  {reconTargets.length > 2 && (
                    <button
                      className="btn btn-icon btn-sm"
                      style={{ width: '22px', height: '22px', padding: 0 }}
                      onClick={() => handleRemoveTableTarget(target.id)}
                      title="Hapus tabel ini dari rekonsiliasi"
                    >
                      <Trash2 size={12} color="var(--pastel-rose)" />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Pilih Tabel:</label>
                    <select
                      className="form-control form-select"
                      style={{ height: '30px', fontSize: '12px' }}
                      value={target.tableId}
                      onChange={(e) => handleUpdateTarget(target.id, 'tableId', e.target.value)}
                    >
                      {tables.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.rows.length} baris)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px' }}>Kolom Kunci (Primary Key):</label>
                    <select
                      className="form-control form-select"
                      style={{ height: '30px', fontSize: '12px' }}
                      value={target.keyColumn}
                      onChange={(e) => handleUpdateTarget(target.id, 'keyColumn', e.target.value)}
                    >
                      {tableObj?.columns.map(c => (
                        <option key={c.name} value={c.name}>Key: {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Filter Tabs */}
      {diffResult && (
        <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeFilterStatus === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveFilterStatus('ALL')}
          >
            Semua Data ({diffResult.totalUniqueKeys})
          </button>
          <button
            className={`btn btn-sm ${activeFilterStatus === 'MATCHED_ALL' ? 'btn-success' : 'btn-outline'}`}
            onClick={() => setActiveFilterStatus('MATCHED_ALL')}
          >
            <CheckCircle2 size={13} />
            <span>Cocok 100% di Semua Tabel ({diffResult.matchedAllCount})</span>
          </button>
          <button
            className={`btn btn-sm ${activeFilterStatus === 'MISMATCH' ? 'btn-primary' : 'btn-outline'}`}
            style={activeFilterStatus === 'MISMATCH' ? { backgroundColor: 'var(--pastel-amber)', color: '#000' } : {}}
            onClick={() => setActiveFilterStatus('MISMATCH')}
          >
            <AlertTriangle size={13} />
            <span>Beda Nilai Kolom ({diffResult.mismatchCount})</span>
          </button>
          <button
            className={`btn btn-sm ${activeFilterStatus === 'PARTIAL_MATCH' ? 'btn-outline' : 'btn-outline'}`}
            style={activeFilterStatus === 'PARTIAL_MATCH' ? { backgroundColor: 'var(--pastel-purple-bg)', color: 'var(--pastel-purple)', borderColor: 'var(--pastel-purple-border)' } : {}}
            onClick={() => setActiveFilterStatus('PARTIAL_MATCH')}
          >
            <Layers size={13} color="var(--pastel-purple)" />
            <span>Sebagian Tabel Saja ({diffResult.partialCount})</span>
          </button>
          <button
            className={`btn btn-sm ${activeFilterStatus === 'EXCLUSIVE' ? 'btn-danger' : 'btn-outline'}`}
            onClick={() => setActiveFilterStatus('EXCLUSIVE')}
          >
            <MinusCircle size={13} />
            <span>Hanya di 1 Tabel ({diffResult.exclusiveCount})</span>
          </button>
        </div>
      )}

      {/* Multi-Table Matrix Grid View */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {visibleRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Tidak ada baris data dengan status ini.
          </div>
        ) : (
          <table className="data-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th className="row-index-cell" style={{ width: '44px' }}>#</th>
                <th style={{ width: '130px' }}>Status Rekonsiliasi</th>
                <th style={{ width: '150px' }}>Kunci Pencocokan</th>
                <th style={{ width: '160px' }}>Keberadaan di Tabel</th>
                {reconTargets.map(target => (
                  <th key={target.id} style={{ minWidth: '220px' }}>
                    Data {target.alias} ({tables.find(t => t.id === target.tableId)?.name})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((diffRow, idx) => {
                let badgeBg = 'var(--pastel-blue-bg)';
                let badgeColor = 'var(--pastel-blue)';
                let badgeText = 'MATCHED';

                if (diffRow.status === 'MATCHED_ALL') {
                  badgeBg = 'var(--pastel-emerald-bg)';
                  badgeColor = 'var(--pastel-emerald)';
                  badgeText = `COCOK SEMUA (${reconTargets.length} TABEL)`;
                } else if (diffRow.status === 'MISMATCH') {
                  badgeBg = 'var(--pastel-amber-bg)';
                  badgeColor = 'var(--pastel-amber)';
                  badgeText = 'BEDA NILAI KOLOM';
                } else if (diffRow.status === 'PARTIAL_MATCH') {
                  badgeBg = 'var(--pastel-purple-bg)';
                  badgeColor = 'var(--pastel-purple)';
                  badgeText = `SEBAGIAN (${diffRow.presentInTables.length}/${reconTargets.length} TABEL)`;
                } else if (diffRow.status === 'EXCLUSIVE') {
                  badgeBg = 'var(--pastel-rose-bg)';
                  badgeColor = 'var(--pastel-rose)';
                  badgeText = `HANYA DI ${diffRow.presentInTables[0] || '1 TABEL'}`;
                }

                return (
                  <tr key={idx}>
                    <td className="row-index-cell">{idx + 1}</td>
                    <td>
                      <span
                        style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10px',
                          fontWeight: 700,
                          border: '1px solid currentColor',
                          display: 'inline-block',
                        }}
                      >
                        {badgeText}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {diffRow.key}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {reconTargets.map(target => {
                          const isPresent = diffRow.presentInTables.includes(target.alias);
                          return (
                            <span
                              key={target.id}
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: isPresent ? 'var(--pastel-emerald-bg)' : 'var(--bg-surface)',
                                color: isPresent ? 'var(--pastel-emerald)' : 'var(--text-muted)',
                                border: '1px solid',
                                borderColor: isPresent ? 'var(--pastel-emerald-border)' : 'var(--border-subtle)',
                              }}
                            >
                              {target.alias}: {isPresent ? '✓ Ada' : '✗ Hilang'}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Data Cells per Target Table */}
                    {reconTargets.map(target => {
                      const rowData = diffRow.tableRows[target.alias];
                      if (!rowData) {
                        return (
                          <td key={target.id} style={{ color: 'var(--text-muted)', fontStyle: 'italic', backgroundColor: 'rgba(244, 63, 94, 0.04)' }}>
                            Tidak terdaftar di {target.alias}
                          </td>
                        );
                      }

                      return (
                        <td key={target.id}>
                          <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                            {Object.entries(rowData)
                              .filter(([k]) => k !== '_rowIndex' && k !== target.keyColumn)
                              .map(([k, v]) => {
                                const isDiffCol = diffRow.differingColumns.includes(k);
                                return (
                                  <span
                                    key={k}
                                    style={{
                                      marginRight: '6px',
                                      color: isDiffCol ? 'var(--pastel-rose)' : 'inherit',
                                      fontWeight: isDiffCol ? 600 : 400,
                                    }}
                                  >
                                    {k}: <strong>{v !== null && v !== undefined ? String(v) : 'null'}</strong>
                                  </span>
                                );
                              })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
