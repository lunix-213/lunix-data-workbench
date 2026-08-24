import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Terminal, 
  Save, 
  Clock, 
  AlertTriangle, 
  Database, 
  Code2, 
  Copy, 
  Check,
  Plus,
  Trash2,
  SlidersHorizontal,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  ArrowUpDown,
  BookOpen,
  Eraser,
  RotateCcw,
  ChevronDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { QueryResult } from '../../types/query';
import { executeSqlQuery, sanitizeTableName } from '../../services/sqlEngine';

interface SqlConsoleProps {
  tables: DataTable[];
  activeTable: DataTable | null;
  onAddTable: (table: DataTable) => void;
}

interface VisualJoin {
  id: string;
  type: 'LEFT JOIN' | 'INNER JOIN' | 'RIGHT JOIN';
  table: string;
  leftCol: string;
  rightCol: string;
}

interface VisualFilter {
  id: string;
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'NOT LIKE' | 'IS NULL' | 'IS NOT NULL';
  value: string;
  conjunction: 'AND' | 'OR';
}

export const SqlConsole: React.FC<SqlConsoleProps> = ({
  tables,
  activeTable,
  onAddTable,
}) => {
  // Mode: Visual No-Code Builder vs Raw SQL Editor
  const [editorMode, setEditorMode] = useState<'VISUAL' | 'RAW'>('VISUAL');

  // Visual Builder State
  const [selectedTable, setSelectedTable] = useState<string>(() => 
    activeTable ? sanitizeTableName(activeTable.name) : tables[0] ? sanitizeTableName(tables[0].name) : ''
  );
  const currentTableObj = tables.find(t => sanitizeTableName(t.name) === selectedTable) || tables[0] || null;

  const [selectedColumns, setSelectedColumns] = useState<string[]>(['*']);
  const [columnAggregations, setColumnAggregations] = useState<Record<string, string>>({});
  const [joins, setJoins] = useState<VisualJoin[]>([]);
  const [filters, setFilters] = useState<VisualFilter[]>([]);
  const [groupByCols, setGroupByCols] = useState<string[]>([]);
  const [orderByCol, setOrderByCol] = useState<string>('');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('ASC');
  const [limitCount, setLimitCount] = useState<number>(100);

  // Column Dropdown Popover State
  const [isColDropdownOpen, setIsColDropdownOpen] = useState<boolean>(false);
  const [colSearch, setColSearch] = useState<string>('');
  const colDropdownRef = React.useRef<HTMLDivElement>(null);

  // Click outside to close column dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target as Node)) {
        setIsColDropdownOpen(false);
      }
    };
    if (isColDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isColDropdownOpen]);

  // Raw SQL State
  const [rawSql, setRawSql] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [newTableName, setNewTableName] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sync selected table when activeTable changes
  useEffect(() => {
    if (activeTable) {
      setSelectedTable(sanitizeTableName(activeTable.name));
    }
  }, [activeTable?.id]);

  // List all tables participating in the query (Main Table + Joined Tables)
  const participatingTables = useMemo(() => {
    const list: { table: DataTable; safeName: string; isMain: boolean }[] = [];
    if (currentTableObj) {
      list.push({ table: currentTableObj, safeName: selectedTable, isMain: true });
    }
    joins.forEach(j => {
      const joinedTbl = tables.find(t => sanitizeTableName(t.name) === j.table);
      if (joinedTbl && !list.some(item => item.safeName === j.table)) {
        list.push({ table: joinedTbl, safeName: j.table, isMain: false });
      }
    });
    return list;
  }, [currentTableObj, joins, tables, selectedTable]);

  // Generate SQL dynamically from Visual Builder
  const generatedSql = useMemo(() => {
    if (!selectedTable) return '';

    // 1. SELECT clause
    let selectClause = '*';
    if (selectedColumns.length > 0 && !selectedColumns.includes('*')) {
      selectClause = selectedColumns.map(colRef => {
        if (colRef.includes('.')) {
          const [tName, cName] = colRef.split('.');
          const agg = columnAggregations[colRef] || columnAggregations[cName];
          if (agg && agg !== 'NONE') {
            return `${agg}(\`${tName}\`.\`${cName}\`) AS \`${agg.toLowerCase()}_${cName}\``;
          }
          return `\`${tName}\`.\`${cName}\``;
        } else {
          const agg = columnAggregations[colRef];
          if (agg && agg !== 'NONE') {
            return `${agg}(\`${selectedTable}\`.\`${colRef}\`) AS \`${agg.toLowerCase()}_${colRef}\``;
          }
          return `\`${selectedTable}\`.\`${colRef}\``;
        }
      }).join(', ');
    }

    let sql = `SELECT ${selectClause}\nFROM \`${selectedTable}\``;

    // 2. JOINs
    if (joins.length > 0) {
      joins.forEach(j => {
        if (j.table && j.leftCol && j.rightCol) {
          sql += `\n${j.type} \`${j.table}\` ON \`${selectedTable}\`.\`${j.leftCol}\` = \`${j.table}\`.\`${j.rightCol}\``;
        }
      });
    }

    // 3. WHERE clause
    if (filters.length > 0) {
      const filterStrings = filters.map((f, idx) => {
        let colIdentifier = `\`${f.column}\``;
        if (f.column.includes('.')) {
          const [tName, cName] = f.column.split('.');
          colIdentifier = `\`${tName}\`.\`${cName}\``;
        }

        let cond = '';
        if (f.operator === 'IS NULL' || f.operator === 'IS NOT NULL') {
          cond = `${colIdentifier} ${f.operator}`;
        } else if (f.operator === 'LIKE' || f.operator === 'NOT LIKE') {
          cond = `${colIdentifier} ${f.operator} '%${f.value.replace(/'/g, "''")}%'`;
        } else {
          const isNum = !isNaN(Number(f.value)) && f.value.trim() !== '';
          const valFormatted = isNum ? f.value : `'${f.value.replace(/'/g, "''")}'`;
          cond = `${colIdentifier} ${f.operator} ${valFormatted}`;
        }
        return idx === 0 ? cond : `${f.conjunction} ${cond}`;
      });
      sql += `\nWHERE ${filterStrings.join(' ')}`;
    }

    // 4. GROUP BY clause
    if (groupByCols.length > 0) {
      sql += `\nGROUP BY ${groupByCols.map(c => c.includes('.') ? `\`${c.split('.')[0]}\`.\`${c.split('.')[1]}\`` : `\`${c}\``).join(', ')}`;
    }

    // 5. ORDER BY clause
    if (orderByCol) {
      const orderIdentifier = orderByCol.includes('.')
        ? `\`${orderByCol.split('.')[0]}\`.\`${orderByCol.split('.')[1]}\``
        : `\`${orderByCol}\``;
      sql += `\nORDER BY ${orderIdentifier} ${orderDir}`;
    }

    // 6. LIMIT
    if (limitCount > 0) {
      sql += `\nLIMIT ${limitCount}`;
    }

    return `${sql};`;
  }, [selectedTable, selectedColumns, columnAggregations, joins, filters, groupByCols, orderByCol, orderDir, limitCount]);

  // Keep rawSql in sync when in Visual mode
  useEffect(() => {
    if (editorMode === 'VISUAL') {
      setRawSql(generatedSql);
    }
  }, [generatedSql, editorMode]);

  // Execute Query
  const handleExecute = () => {
    const activeSql = editorMode === 'VISUAL' ? generatedSql : rawSql;
    if (!activeSql.trim()) return;
    const result = executeSqlQuery(activeSql, tables);
    setQueryResult(result);
  };

  // Keyboard shortcut Ctrl+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  // Smart Query Preset Wizards (Pertanyaan Bisnis Populer)
  const handleApplyPresetWizard = (preset: string) => {
    if (!currentTableObj) return;
    const cols = currentTableObj.columns;
    const numCol = cols.find(c => c.type === 'NUMBER')?.name || cols[0]?.name;
    const textCol = cols.find(c => c.type === 'TEXT')?.name || cols[0]?.name;

    switch (preset) {
      case 'TOP_10_HIGHEST':
        setSelectedColumns(['*']);
        setFilters([]);
        setOrderByCol(numCol);
        setOrderDir('DESC');
        setLimitCount(10);
        break;
      case 'GROUP_SUMMARY':
        setSelectedColumns([textCol, numCol]);
        setColumnAggregations({ [numCol]: 'SUM' });
        setGroupByCols([textCol]);
        setFilters([]);
        setOrderByCol(`sum_${numCol}`);
        setOrderDir('DESC');
        setLimitCount(100);
        break;
      case 'FIND_EMPTY_CELLS':
        setSelectedColumns(['*']);
        setFilters([{
          id: `f_${Date.now()}`,
          column: textCol,
          operator: 'IS NULL',
          value: '',
          conjunction: 'AND',
        }]);
        break;
      case 'JOIN_CUSTOMER_TRANSACTION': {
        const salesTbl = tables.find(t => t.name.toLowerCase().includes('penjualan') || t.name.toLowerCase().includes('transaksi')) || tables[0];
        const custTbl = tables.find(t => t.id !== salesTbl.id) || tables[1];
        if (salesTbl && custTbl) {
          const sName = sanitizeTableName(salesTbl.name);
          const cName = sanitizeTableName(custTbl.name);
          const commonKey = salesTbl.columns.find(sc => custTbl.columns.some(cc => cc.name.toLowerCase() === sc.name.toLowerCase()))?.name || salesTbl.columns[0]?.name || 'ID';
          setSelectedTable(sName);
          setSelectedColumns([
            ...salesTbl.columns.slice(0, 3).map(c => `${sName}.${c.name}`),
            ...custTbl.columns.slice(0, 2).filter(c => c.name !== commonKey).map(c => `${cName}.${c.name}`)
          ]);
          setJoins([{
            id: `join_${Date.now()}`,
            type: 'LEFT JOIN',
            table: cName,
            leftCol: commonKey,
            rightCol: commonKey,
          }]);
          setFilters([]);
          setOrderByCol('');
        }
        break;
      }
      case 'FILTER_GREATER_THAN': {
        const numValues = currentTableObj.rows.map(r => Number(r[numCol])).filter(n => !isNaN(n));
        const medianVal = numValues.length > 0 ? Math.round(numValues.reduce((a, b) => a + b, 0) / numValues.length) : 1000;
        setSelectedColumns(['*']);
        setFilters([{
          id: `f_${Date.now()}`,
          column: numCol,
          operator: '>',
          value: String(medianVal),
          conjunction: 'AND',
        }]);
        break;
      }
    }
  };

  // Move Column Position Left / Right
  const handleMoveColumn = (index: number, direction: 'LEFT' | 'RIGHT') => {
    const targetIndex = direction === 'LEFT' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedColumns.length) return;
    const newCols = [...selectedColumns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    setSelectedColumns(newCols);
  };

  // Reorder Column via Drag and Drop
  const handleReorderColumns = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= selectedColumns.length || toIndex >= selectedColumns.length) return;
    const newCols = [...selectedColumns];
    const [movedItem] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, movedItem);
    setSelectedColumns(newCols);
  };

  // Add Visual Filter Row
  const handleAddFilter = () => {
    if (!currentTableObj || currentTableObj.columns.length === 0) return;
    const firstCol = currentTableObj.columns[0].name;
    setFilters(prev => [
      ...prev,
      {
        id: `filter_${Date.now()}_${Math.random()}`,
        column: firstCol,
        operator: '=',
        value: '',
        conjunction: 'AND',
      },
    ]);
  };

  // Remove Visual Filter Row
  const handleRemoveFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  // Add Visual Join Row
  const handleAddJoin = () => {
    const otherTables = tables.filter(t => sanitizeTableName(t.name) !== selectedTable);
    if (otherTables.length === 0) return;
    const target = otherTables[0];

    setJoins(prev => [
      ...prev,
      {
        id: `join_${Date.now()}`,
        type: 'LEFT JOIN',
        table: sanitizeTableName(target.name),
        leftCol: currentTableObj?.columns[0]?.name || '',
        rightCol: target.columns[0]?.name || '',
      },
    ]);
  };

  // Remove Join Row
  const handleRemoveJoin = (id: string) => {
    setJoins(prev => prev.filter(j => j.id !== id));
  };

  // Save Query Result as New Table
  const handleSaveAsTable = () => {
    if (!queryResult || queryResult.rows.length === 0) return;

    const tableName = newTableName.trim() || `SQL_Result_${Date.now().toString().slice(-4)}`;
    const columns = queryResult.columns.map(c => ({
      name: c,
      originalName: c,
      type: 'TEXT' as const,
      inferredType: 'TEXT' as const,
    }));

    const newTable: DataTable = {
      id: `tbl_sql_${Date.now()}`,
      name: tableName,
      columns,
      rows: queryResult.rows,
      totalRows: queryResult.rows.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memorySizeBytes: JSON.stringify(queryResult.rows).length,
    };

    onAddTable(newTable);
    setNewTableName('');
  };

  // Copy SQL to Clipboard
  const handleCopySql = () => {
    const sqlToCopy = editorMode === 'VISUAL' ? generatedSql : rawSql;
    navigator.clipboard.writeText(sqlToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Clean / Reset all SQL states to fresh start
  const handleCleanResetSql = () => {
    setSelectedColumns(['*']);
    setColumnAggregations({});
    setJoins([]);
    setFilters([]);
    setGroupByCols([]);
    setOrderByCol('');
    setOrderDir('ASC');
    setLimitCount(100);
    setQueryResult(null);
    setNewTableName('');
    if (currentTableObj) {
      setRawSql(`SELECT * FROM \`${sanitizeTableName(currentTableObj.name)}\` LIMIT 100;`);
    } else {
      setRawSql('');
    }
  };

  // Completely clear editor
  const handleClearText = () => {
    setSelectedColumns([]);
    setColumnAggregations({});
    setFilters([]);
    setJoins([]);
    setGroupByCols([]);
    setOrderByCol('');
    setRawSql('');
    setQueryResult(null);
  };

  // Plain-Language Query Explanation (Terjemahan Bahasa Manusia)
  const humanReadableExplanation = useMemo(() => {
    if (!selectedTable) return '';
    let explanation = `Mengambil data dari tabel "${selectedTable}"`;

    if (selectedColumns.includes('*')) {
      explanation += ', menampilkan semua kolom';
    } else {
      explanation += `, menampilkan kolom (${selectedColumns.join(', ')})`;
    }

    if (filters.length > 0) {
      explanation += ', hanya baris di mana: ' + filters.map(f => `[${f.column} ${f.operator} ${f.value || 'kosong'}]`).join(' dan ');
    }

    if (groupByCols.length > 0) {
      explanation += `, dikelompokkan berdasarkan [${groupByCols.join(', ')}]`;
    }

    if (orderByCol) {
      explanation += `, diurutkan berdasarkan [${orderByCol}] secara ${orderDir === 'ASC' ? 'menaik (A-Z / 0-9)' : 'menurun (Z-A / 9-0)'}`;
    }

    if (limitCount) {
      explanation += `, dibatasi maksimal ${limitCount} baris.`;
    }

    return explanation;
  }, [selectedTable, selectedColumns, filters, groupByCols, orderByCol, orderDir, limitCount]);

  return (
    <div className="sql-workspace">
      {/* Top Header & Mode Switcher */}
      <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Terminal size={18} color="var(--pastel-emerald)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              SQL Studio & No-Code Query Builder
            </h2>

            {/* Mode Switcher Buttons */}
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                className={`btn btn-sm ${editorMode === 'VISUAL' ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: '24px', fontSize: '11px', border: 'none' }}
                onClick={() => setEditorMode('VISUAL')}
              >
                <SlidersHorizontal size={12} />
                <span>Visual Builder (No-Code)</span>
              </button>
              <button
                className={`btn btn-sm ${editorMode === 'RAW' ? 'btn-primary' : 'btn-outline'}`}
                style={{ height: '24px', fontSize: '11px', border: 'none' }}
                onClick={() => {
                  setRawSql(generatedSql);
                  setEditorMode('RAW');
                }}
              >
                <Code2 size={12} />
                <span>Raw SQL Code</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Reset / Clean SQL Button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={handleCleanResetSql}
              title="Bersihkan dan reset semua filter/query ke kondisi awal bersih"
            >
              <RotateCcw size={13} color="var(--pastel-amber)" />
              <span>Reset Query</span>
            </button>

            {/* Clear All Text Button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={handleClearText}
              title="Kosongkan seluruh kode/filter"
            >
              <Eraser size={13} color="var(--pastel-rose)" />
              <span>Kosongkan</span>
            </button>

            <button
              className="btn btn-outline btn-sm"
              onClick={handleCopySql}
              title="Salin query SQL ke clipboard"
            >
              {isCopied ? <Check size={13} color="var(--pastel-emerald)" /> : <Copy size={13} />}
              <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleExecute}
              title="Jalankan Query (Shortcut: Ctrl + Enter)"
            >
              <Play size={14} />
              <span>Jalankan (Ctrl+Enter)</span>
            </button>
          </div>
        </div>

        {/* Guided Business Query Presets (Pertanyaan Cepat untuk User Awam) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={13} color="var(--pastel-amber)" />
            <span>Wizard Cepat:</span>
          </span>
          <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={() => handleApplyPresetWizard('TOP_10_HIGHEST')}>
            🏆 Top 10 Nilai Tertinggi
          </button>
          <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={() => handleApplyPresetWizard('GROUP_SUMMARY')}>
            📊 Total & Ringkasan per Kategori
          </button>
          <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={() => handleApplyPresetWizard('FIND_EMPTY_CELLS')}>
            ⚠️ Cari Baris Kosong (Null)
          </button>
          <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={() => handleApplyPresetWizard('FILTER_GREATER_THAN')}>
            📈 Filter Di Atas Rata-rata
          </button>
          <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px', color: 'var(--pastel-indigo)' }} onClick={() => handleApplyPresetWizard('JOIN_CUSTOMER_TRANSACTION')}>
            🔗 Gabung Data Lintas Tabel (JOIN)
          </button>
        </div>
      </div>

      {/* Main Workspace Area (Visual Builder or Raw Code) */}
      {editorMode === 'VISUAL' ? (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '340px', backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border-medium)', overflowY: 'auto', padding: '14px', gap: '12px' }}>
          {/* Main Table Card (FROM) */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 160px', gap: '12px', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--pastel-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>1. Pilih Tabel Utama (FROM):</span>
                </label>
                <select
                  className="form-control form-select"
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setSelectedColumns(['*']);
                    setFilters([]);
                    setGroupByCols([]);
                    setOrderByCol('');
                  }}
                >
                  {tables.map(t => (
                    <option key={t.id} value={sanitizeTableName(t.name)}>
                      {t.name} ({t.rows.length} baris)
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick column checklist for Main Table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '11.5px', marginBottom: 0 }}>
                    Kolom dari Tabel Utama ({currentTableObj?.name}):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px' }}>
                    <span
                      style={{ color: 'var(--pastel-blue)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => {
                        const allMain = currentTableObj?.columns.map(c => `${selectedTable}.${c.name}`) || [];
                        const withoutMain = selectedColumns.filter(c => !c.startsWith(`${selectedTable}.`) && c !== '*');
                        setSelectedColumns([...withoutMain, ...allMain]);
                      }}
                    >
                      Pilih Semua
                    </span>
                    <span
                      style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={() => {
                        const withoutMain = selectedColumns.filter(c => !c.startsWith(`${selectedTable}.`) && c !== '*');
                        setSelectedColumns(withoutMain.length === 0 ? ['*'] : withoutMain);
                      }}
                    >
                      Kosongkan
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '60px', overflowY: 'auto' }}>
                  {currentTableObj?.columns.map(col => {
                    const fullRef = `${selectedTable}.${col.name}`;
                    const isChecked = selectedColumns.includes('*') || selectedColumns.includes(fullRef) || selectedColumns.includes(col.name);

                    return (
                      <button
                        key={col.name}
                        type="button"
                        className={`btn btn-sm ${isChecked && !selectedColumns.includes('*') ? 'btn-primary' : 'btn-outline'}`}
                        style={{
                          height: '24px',
                          fontSize: '11px',
                          padding: '0 8px',
                          backgroundColor: selectedColumns.includes('*') ? 'var(--bg-card)' : undefined,
                          borderColor: isChecked && !selectedColumns.includes('*') ? 'var(--pastel-blue)' : undefined,
                        }}
                        onClick={() => {
                          if (selectedColumns.includes('*')) {
                            setSelectedColumns([fullRef]);
                          } else if (selectedColumns.includes(fullRef) || selectedColumns.includes(col.name)) {
                            const next = selectedColumns.filter(c => c !== fullRef && c !== col.name);
                            setSelectedColumns(next.length === 0 ? ['*'] : next);
                          } else {
                            setSelectedColumns([...selectedColumns, fullRef]);
                          }
                        }}
                      >
                        {col.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '11.5px' }}>Batas Baris (LIMIT):</label>
                <select
                  className="form-control form-select"
                  value={limitCount}
                  onChange={(e) => setLimitCount(Number(e.target.value))}
                  style={{ height: '30px', fontSize: '11.5px' }}
                >
                  <option value={25}>25 Baris</option>
                  <option value={100}>100 Baris</option>
                  <option value={500}>500 Baris</option>
                  <option value={1000}>1000 Baris</option>
                  <option value={0}>Semua (Tanpa Limit)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Visual JOIN Relations with Direct Column Selectors */}
          {tables.length > 1 && (
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: 'var(--pastel-indigo)' }}>
                  <Layers size={14} />
                  <span>2. Hubungkan Tabel Lain (JOIN Relasi / VLOOKUP) ({joins.length}):</span>
                </div>
                <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={handleAddJoin}>
                  <Plus size={12} />
                  <span>+ Tambah JOIN Tabel</span>
                </button>
              </div>

              {joins.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Tidak ada tabel yang dihubungkan. Klik <strong>+ Tambah JOIN Tabel</strong> jika ingin mengambil kolom dari tabel lain berdasarkan kesamaan ID / Kunci.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {joins.map(j => {
                    const joinTableObj = tables.find(t => sanitizeTableName(t.name) === j.table);
                    return (
                      <div
                        key={j.id}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          padding: '10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {/* Top: Join condition controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <select
                            className="form-control form-select"
                            style={{ width: '130px', height: '28px', fontSize: '11.5px' }}
                            value={j.type}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setJoins(prev => prev.map(item => item.id === j.id ? { ...item, type: val } : item));
                            }}
                          >
                            <option value="LEFT JOIN">LEFT JOIN (Semua Baris)</option>
                            <option value="INNER JOIN">INNER JOIN (Hanya Cocok)</option>
                          </select>

                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--pastel-indigo)' }}>ke Tabel:</span>

                          <select
                            className="form-control form-select"
                            style={{ width: '180px', height: '28px', fontSize: '11.5px' }}
                            value={j.table}
                            onChange={(e) => {
                              const val = e.target.value;
                              const target = tables.find(t => sanitizeTableName(t.name) === val);
                              setJoins(prev => prev.map(item => item.id === j.id ? {
                                ...item,
                                table: val,
                                rightCol: target?.columns[0]?.name || '',
                              } : item));
                            }}
                          >
                            {tables.filter(t => sanitizeTableName(t.name) !== selectedTable).map(t => (
                              <option key={t.id} value={sanitizeTableName(t.name)}>{t.name}</option>
                            ))}
                          </select>

                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ON Kondisi:</span>

                          <select
                            className="form-control form-select"
                            style={{ width: '150px', height: '28px', fontSize: '11.5px' }}
                            value={j.leftCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJoins(prev => prev.map(item => item.id === j.id ? { ...item, leftCol: val } : item));
                            }}
                          >
                            {currentTableObj?.columns.map(c => (
                              <option key={c.name} value={c.name}>{selectedTable}.{c.name}</option>
                            ))}
                          </select>

                          <span style={{ fontSize: '12px', fontWeight: 700 }}>=</span>

                          <select
                            className="form-control form-select"
                            style={{ width: '150px', height: '28px', fontSize: '11.5px' }}
                            value={j.rightCol}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJoins(prev => prev.map(item => item.id === j.id ? { ...item, rightCol: val } : item));
                            }}
                          >
                            {joinTableObj?.columns.map(c => (
                              <option key={c.name} value={c.name}>{j.table}.{c.name}</option>
                            ))}
                          </select>

                          <button
                            className="btn btn-icon btn-sm"
                            style={{ height: '26px', width: '26px' }}
                            onClick={() => handleRemoveJoin(j.id)}
                            title="Hapus relasi JOIN ini"
                          >
                            <Trash2 size={12} color="var(--pastel-rose)" />
                          </button>
                        </div>

                        {/* Bottom: Direct column checklist from this joined table */}
                        <div style={{ backgroundColor: 'var(--bg-app)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--pastel-indigo)' }}>
                              Pilih Kolom dari Tabel {joinTableObj?.name} yang Ingin Ditampilkan:
                            </span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px' }}>
                              <span
                                style={{ color: 'var(--pastel-indigo)', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => {
                                  const thisCols = joinTableObj?.columns.map(c => `${j.table}.${c.name}`) || [];
                                  const withoutThis = selectedColumns.filter(c => !c.startsWith(`${j.table}.`) && c !== '*');
                                  setSelectedColumns([...withoutThis, ...thisCols]);
                                }}
                              >
                                + Ambil Semua Kolom Ini
                              </span>
                              <span
                                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                                onClick={() => {
                                  const withoutThis = selectedColumns.filter(c => !c.startsWith(`${j.table}.`) && c !== '*');
                                  setSelectedColumns(withoutThis.length === 0 ? ['*'] : withoutThis);
                                }}
                              >
                                Hapus
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {joinTableObj?.columns.map(col => {
                              const fullRef = `${j.table}.${col.name}`;
                              const isChecked = !selectedColumns.includes('*') && selectedColumns.includes(fullRef);

                              return (
                                <button
                                  key={col.name}
                                  type="button"
                                  className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-outline'}`}
                                  style={{
                                    height: '22px',
                                    fontSize: '10.5px',
                                    padding: '0 6px',
                                    backgroundColor: isChecked ? 'var(--pastel-indigo)' : undefined,
                                    borderColor: isChecked ? 'var(--pastel-indigo)' : undefined,
                                    color: isChecked ? '#fff' : undefined,
                                  }}
                                  onClick={() => {
                                    if (selectedColumns.includes('*')) {
                                      // Start picking specific
                                      setSelectedColumns([fullRef]);
                                    } else if (selectedColumns.includes(fullRef)) {
                                      const next = selectedColumns.filter(c => c !== fullRef);
                                      setSelectedColumns(next.length === 0 ? ['*'] : next);
                                    } else {
                                      setSelectedColumns([...selectedColumns, fullRef]);
                                    }
                                  }}
                                >
                                  + {col.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Row 3: Output Columns Strip Preview with Interactive Reordering */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '11.5px', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--pastel-emerald)', flexShrink: 0 }}>
                <span>3. Urutan Kolom Output ({selectedColumns.includes('*') ? 'Semua' : `${selectedColumns.length} Kolom`}):</span>
              </div>

              {selectedColumns.includes('*') ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--pastel-blue)', fontWeight: 600 }}>
                    * (Seluruh Kolom dari Semua Tabel Ditampilkan Sesuai Urutan Asli)
                  </span>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    — Pilih kolom di atas untuk mengatur urutan posisi spesifik.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {selectedColumns.map((colRef, idx) => {
                    const isJoined = colRef.includes('.') && !colRef.startsWith(`${selectedTable}.`);
                    const displayName = colRef.includes('.') ? colRef.split('.')[1] : colRef;
                    const tableName = colRef.includes('.') ? colRef.split('.')[0] : selectedTable;

                    return (
                      <div
                        key={colRef}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                          handleReorderColumns(fromIdx, idx);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          padding: '2px 5px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isJoined ? 'var(--pastel-indigo-bg)' : 'var(--pastel-blue-bg)',
                          color: isJoined ? 'var(--pastel-indigo)' : 'var(--pastel-blue)',
                          border: '1px solid',
                          borderColor: isJoined ? 'var(--pastel-indigo-border)' : 'var(--pastel-blue-border)',
                          cursor: 'grab',
                          boxShadow: 'var(--shadow-xs)',
                          userSelect: 'none',
                        }}
                        title={`Posisi ke-${idx + 1}. Geser atau klik ◀ ▶ untuk memindahkan posisi`}
                      >
                        {/* Drag Handle */}
                        <GripVertical size={11} style={{ opacity: 0.5, marginRight: '-2px' }} />

                        {/* Move Left Button */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            opacity: idx === 0 ? 0.2 : 0.7,
                            padding: '0 1px',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'inherit',
                          }}
                          onClick={() => handleMoveColumn(idx, 'LEFT')}
                          title="Geser ke kiri (Urutan sebelumnya)"
                        >
                          <ChevronLeft size={12} />
                        </button>

                        <span style={{ opacity: 0.8, fontSize: '10px', fontWeight: 600 }}>
                          #{idx + 1}
                        </span>

                        <span style={{ opacity: 0.65, fontSize: '9.5px', marginLeft: '1px' }}>
                          {tableName}:
                        </span>

                        <strong style={{ margin: '0 2px' }}>{displayName}</strong>

                        {/* Move Right Button */}
                        <button
                          type="button"
                          disabled={idx === selectedColumns.length - 1}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: idx === selectedColumns.length - 1 ? 'not-allowed' : 'pointer',
                            opacity: idx === selectedColumns.length - 1 ? 0.2 : 0.7,
                            padding: '0 1px',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'inherit',
                          }}
                          onClick={() => handleMoveColumn(idx, 'RIGHT')}
                          title="Geser ke kanan (Urutan berikutnya)"
                        >
                          <ChevronRight size={12} />
                        </button>

                        {/* Remove Column Button */}
                        <span
                          style={{
                            cursor: 'pointer',
                            marginLeft: '3px',
                            fontWeight: 700,
                            padding: '0 2px',
                            color: 'var(--pastel-rose)',
                          }}
                          onClick={() => {
                            const next = selectedColumns.filter(c => c !== colRef);
                            setSelectedColumns(next.length === 0 ? ['*'] : next);
                          }}
                          title="Hapus kolom ini dari query"
                        >
                          ×
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ height: '24px', fontSize: '10.5px' }}
                onClick={() => setSelectedColumns(['*'])}
                title="Kembalikan ke semua kolom (*)"
              >
                Pilih Semua (*)
              </button>
            </div>
          </div>

          {/* Row 3: WHERE Filters */}
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600, color: 'var(--pastel-amber)' }}>
                <Filter size={14} />
                <span>4. Filter Kondisi (WHERE) ({filters.length}):</span>
              </div>
              <button className="btn btn-outline btn-sm" style={{ height: '24px', fontSize: '11px' }} onClick={handleAddFilter}>
                <Plus size={12} />
                <span>Tambah Filter</span>
              </button>
            </div>

            {filters.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Tidak ada filter aktif (menampilkan seluruh data tabel).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filters.map((f, idx) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx > 0 && (
                      <select
                        className="form-control form-select"
                        style={{ width: '80px', height: '28px', fontSize: '11px' }}
                        value={f.conjunction}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setFilters(prev => prev.map(item => item.id === f.id ? { ...item, conjunction: val } : item));
                        }}
                      >
                        <option value="AND">AND</option>
                        <option value="OR">OR</option>
                      </select>
                    )}

                    <select
                      className="form-control form-select"
                      style={{ width: '160px', height: '28px', fontSize: '11.5px' }}
                      value={f.column}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFilters(prev => prev.map(item => item.id === f.id ? { ...item, column: val } : item));
                      }}
                    >
                      {currentTableObj?.columns.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>

                    <select
                      className="form-control form-select"
                      style={{ width: '140px', height: '28px', fontSize: '11.5px' }}
                      value={f.operator}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFilters(prev => prev.map(item => item.id === f.id ? { ...item, operator: val } : item));
                      }}
                    >
                      <option value="=">= (Sama Dengan)</option>
                      <option value="!=">!= (Tidak Sama Dengan)</option>
                      <option value="LIKE">Contains (Mengandung Kata)</option>
                      <option value="NOT LIKE">Not Contains</option>
                      <option value=">">&gt; (Lebih Besar)</option>
                      <option value="<">&lt; (Lebih Kecil)</option>
                      <option value=">=">&gt;= (Lebih Besar Sama Dengan)</option>
                      <option value="<=">&lt;= (Lebih Kecil Sama Dengan)</option>
                      <option value="IS NULL">IS NULL (Sel Kosong)</option>
                      <option value="IS NOT NULL">IS NOT NULL (Sel Terisi)</option>
                    </select>

                    {f.operator !== 'IS NULL' && f.operator !== 'IS NOT NULL' && (
                      <input
                        type="text"
                        className="form-control"
                        style={{ flex: 1, height: '28px', fontSize: '11.5px' }}
                        placeholder="Nilai yang dicari..."
                        value={f.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFilters(prev => prev.map(item => item.id === f.id ? { ...item, value: val } : item));
                        }}
                      />
                    )}

                    <button
                      className="btn btn-icon btn-sm"
                      style={{ height: '26px', width: '26px' }}
                      onClick={() => handleRemoveFilter(f.id)}
                    >
                      <Trash2 size={12} color="var(--pastel-rose)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 3: Sorting (ORDER BY) & Live Explanation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pastel-purple)' }}>4. Urutkan (ORDER BY):</span>
              <select
                className="form-control form-select"
                style={{ flex: 1, height: '28px', fontSize: '11.5px' }}
                value={orderByCol}
                onChange={(e) => setOrderByCol(e.target.value)}
              >
                <option value="">(Tanpa Pengurutan)</option>
                {currentTableObj?.columns.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>

              {orderByCol && (
                <button
                  className="btn btn-outline btn-sm"
                  style={{ height: '28px', fontSize: '11px' }}
                  onClick={() => setOrderDir(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                >
                  <ArrowUpDown size={12} />
                  <span>{orderDir === 'ASC' ? 'Menaik (A-Z)' : 'Menurun (Z-A)'}</span>
                </button>
              )}
            </div>

            {/* Human Readable Explanation Box */}
            <div style={{ backgroundColor: 'var(--pastel-blue-bg)', border: '1px solid var(--pastel-blue-border)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--pastel-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={13} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong>Terjemahan:</strong> {humanReadableExplanation}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Raw SQL Editor Area */
        <div className="sql-editor-container" style={{ height: '210px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <span>Sisipkan Tabel:</span>
              {tables.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ height: '22px', fontSize: '11px', padding: '0 6px', fontFamily: 'var(--font-mono)' }}
                  onClick={() => setRawSql(`SELECT * FROM \`${sanitizeTableName(t.name)}\` LIMIT 100;`)}
                  title={`Ganti query ke SELECT * FROM \`${sanitizeTableName(t.name)}\``}
                >
                  `{sanitizeTableName(t.name)}`
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ height: '22px', fontSize: '11px', color: 'var(--pastel-rose)' }}
                onClick={() => setRawSql('')}
                title="Hapus dan kosongkan seluruh teks di editor"
              >
                <Eraser size={11} />
                <span>Kosongkan Editor</span>
              </button>
            </div>
          </div>

          <textarea
            className="sql-editor-textarea"
            value={rawSql}
            onChange={(e) => setRawSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis query SQL di sini (contoh: SELECT * FROM `tabel` WHERE ...)"
            spellCheck={false}
          />
        </div>
      )}

      {/* Results Header / Stats */}
      <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
            <Code2 size={14} color="var(--pastel-blue)" />
            <span>Hasil Eksekusi Query</span>
          </div>

          {queryResult && !queryResult.error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
              <span>{queryResult.totalRows.toLocaleString()} baris ditemukan</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--pastel-emerald)' }}>
                <Clock size={12} />
                <span>{queryResult.executionTimeMs} ms</span>
              </div>
            </div>
          )}
        </div>

        {/* Save as new in-memory table */}
        {queryResult && queryResult.rows.length > 0 && !queryResult.error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Nama tabel baru..."
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              style={{ height: '26px', fontSize: '11.5px', width: '150px' }}
            />
            <button
              className="btn btn-secondary btn-sm"
              style={{ height: '26px', fontSize: '11.5px' }}
              onClick={handleSaveAsTable}
              title="Simpan hasil query ke tabel baru"
            >
              <Save size={12} color="var(--pastel-emerald)" />
              <span>Simpan Jadi Tabel</span>
            </button>
          </div>
        )}
      </div>

      {/* Error or Results Grid */}
      <div style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-app)' }}>
        {queryResult?.error ? (
          <div style={{ padding: '24px', margin: '16px', backgroundColor: 'var(--pastel-rose-bg)', border: '1px solid var(--pastel-rose-border)', borderRadius: 'var(--radius-md)', color: 'var(--pastel-rose)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>SQL Execution Error</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{queryResult.error}</div>
            </div>
          </div>
        ) : !queryResult ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Pilih filter di atas atau gunakan wizard cepat, lalu tekan tombol <strong>Jalankan (Ctrl+Enter)</strong>.
          </div>
        ) : queryResult.rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Query berhasil dijalankan, 0 baris data dikembalikan.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="row-index-cell" style={{ width: '48px' }}>#</th>
                {queryResult.columns.map(col => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queryResult.rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="row-index-cell">{idx + 1}</td>
                  {queryResult.columns.map(col => (
                    <td key={col}>
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
