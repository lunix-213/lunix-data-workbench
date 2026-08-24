import { useState, useCallback, useMemo, useEffect } from 'react';
import { ColumnSchema, ColumnType, DataRow, DataTable, AppendConfig, JoinConfig } from '../types/dataset';
import { TransformationActionType } from '../types/history';
import { getSampleDatasets } from '../services/sampleData';
import { isLongDigitCodeOrLeadingZero } from '../services/fileParser';
import { downloadBlob } from '../services/exporter';

export function useDatabase() {
  const [tables, setTables] = useState<DataTable[]>(() => {
    // Initial state: load sample datasets on first launch so user has immediate data to test
    return getSampleDatasets();
  });

  const [activeTableId, setActiveTableId] = useState<string | null>(() => {
    const samples = getSampleDatasets();
    return samples.length > 0 ? samples[0].id : null;
  });

  // Calculate active table
  const activeTable = useMemo(() => {
    return tables.find(t => t.id === activeTableId) || (tables.length > 0 ? tables[0] : null);
  }, [tables, activeTableId]);

  // Keep activeTableId synchronized if table list changes
  useEffect(() => {
    if (tables.length > 0 && (!activeTableId || !tables.some(t => t.id === activeTableId))) {
      setActiveTableId(tables[0].id);
    } else if (tables.length === 0) {
      setActiveTableId(null);
    }
  }, [tables, activeTableId]);

  // Add new table
  const addTable = useCallback((newTable: DataTable) => {
    setTables(prev => [...prev, newTable]);
    setActiveTableId(newTable.id);
  }, []);

  // Add multiple tables
  const addMultipleTables = useCallback((newTables: DataTable[]) => {
    if (newTables.length === 0) return;
    setTables(prev => [...prev, ...newTables]);
    setActiveTableId(newTables[0].id);
  }, []);

  // Update table rows
  const updateTableRows = useCallback((
    tableId: string,
    newRows: DataRow[],
    _actionType?: TransformationActionType,
    _description?: string
  ) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      const sizeBytes = JSON.stringify(newRows).length;
      return {
        ...t,
        rows: newRows,
        totalRows: newRows.length,
        updatedAt: Date.now(),
        memorySizeBytes: sizeBytes,
      };
    }));
  }, []);

  // Update table columns
  const updateTableColumns = useCallback((tableId: string, newColumns: ColumnSchema[]) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;
      return {
        ...t,
        columns: newColumns,
        updatedAt: Date.now(),
      };
    }));
  }, []);

  // Delete table
  const deleteTable = useCallback((tableId: string) => {
    setTables(prev => {
      const filtered = prev.filter(t => t.id !== tableId);
      return filtered;
    });
  }, []);

  // Rename table
  const renameTable = useCallback((tableId: string, newName: string) => {
    const cleanName = newName.trim() || 'Untitled_Table';
    setTables(prev => prev.map(t => (t.id === tableId ? { ...t, name: cleanName, updatedAt: Date.now() } : t)));
  }, []);

  // Clone table
  const cloneTable = useCallback((tableId: string) => {
    const target = tables.find(t => t.id === tableId);
    if (!target) return;

    const cloned: DataTable = {
      ...target,
      id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name}_Copy`,
      rows: target.rows.map(r => ({ ...r })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setTables(prev => [...prev, cloned]);
    setActiveTableId(cloned.id);
  }, [tables]);

  // Cast column type
  const castColumnType = useCallback((tableId: string, columnName: string, newType: ColumnType) => {
    setTables(prev => prev.map(t => {
      if (t.id !== tableId) return t;

      const updatedColumns = t.columns.map(c => {
        if (c.name === columnName) {
          return { ...c, type: newType };
        }
        return c;
      });

      // Recast values safely
      const updatedRows = t.rows.map(r => {
        const val = r[columnName];
        if (val === null || val === undefined || String(val).trim() === '') {
          return r;
        }

        const strVal = String(val).trim();
        let formattedVal = val;

        if (newType === 'NUMBER') {
          if (isLongDigitCodeOrLeadingZero(strVal)) {
            formattedVal = strVal; // Safety protection
          } else {
            const num = Number(strVal.replace(/,/g, ''));
            formattedVal = isNaN(num) ? strVal : num;
          }
        } else if (newType === 'BOOLEAN') {
          formattedVal = strVal.toLowerCase() === 'true' || strVal === '1';
        } else if (newType === 'TEXT') {
          formattedVal = strVal;
        }

        return { ...r, [columnName]: formattedVal };
      });

      return {
        ...t,
        columns: updatedColumns,
        rows: updatedRows,
        updatedAt: Date.now(),
      };
    }));
  }, []);

  // Append (Stack) Tables
  const appendTables = useCallback((config: AppendConfig) => {
    const selectedTables = tables.filter(t => config.tableIdsToAppend.includes(t.id));
    if (selectedTables.length === 0) return;

    // Collect union of columns
    const columnMap = new Map<string, ColumnSchema>();
    selectedTables.forEach(t => {
      t.columns.forEach(c => {
        if (!columnMap.has(c.name)) {
          columnMap.set(c.name, { ...c });
        }
      });
    });

    if (config.addSourceFileColumn && !columnMap.has('_source_table')) {
      columnMap.set('_source_table', {
        name: '_source_table',
        originalName: '_source_table',
        type: 'TEXT',
        inferredType: 'TEXT',
      });
    }

    const columns = Array.from(columnMap.values());
    const combinedRows: DataRow[] = [];

    selectedTables.forEach(t => {
      t.rows.forEach(r => {
        const rowCopy: DataRow = { ...r };
        if (config.addSourceFileColumn) {
          rowCopy['_source_table'] = t.name;
        }
        combinedRows.push(rowCopy);
      });
    });

    // Re-index rows
    const finalRows = combinedRows.map((r, idx) => ({ ...r, _rowIndex: idx + 1 }));

    const newTable: DataTable = {
      id: `tbl_appended_${Date.now()}`,
      name: config.newTableName || `Appended_Data_${Date.now().toString().slice(-4)}`,
      columns,
      rows: finalRows,
      totalRows: finalRows.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memorySizeBytes: JSON.stringify(finalRows).length,
    };

    setTables(prev => [...prev, newTable]);
    setActiveTableId(newTable.id);
  }, [tables]);

  // Join Tables (Relational Join)
  const joinTables = useCallback((config: JoinConfig) => {
    const leftTable = tables.find(t => t.id === config.leftTableId);
    const rightTable = tables.find(t => t.id === config.rightTableId);
    if (!leftTable || !rightTable) return;

    const leftKey = config.leftKey;
    const rightKey = config.rightKey;

    // Build right table lookup map
    const rightMap = new Map<string, DataRow[]>();
    rightTable.rows.forEach(r => {
      const keyVal = String(r[rightKey] || '').trim();
      if (!keyVal) return;
      if (!rightMap.has(keyVal)) {
        rightMap.set(keyVal, [r]);
      } else {
        rightMap.get(keyVal)!.push(r);
      }
    });

    // Result columns: Left columns + Right columns (with prefix if collisions)
    const resultColumns: ColumnSchema[] = [...leftTable.columns];
    rightTable.columns.forEach(rc => {
      let colName = rc.name;
      if (leftTable.columns.some(lc => lc.name === colName)) {
        colName = `${rightTable.name}_${colName}`;
      }
      resultColumns.push({
        ...rc,
        name: colName,
        originalName: rc.originalName,
      });
    });

    const resultRows: DataRow[] = [];
    const matchedRightKeys = new Set<string>();

    leftTable.rows.forEach(lr => {
      const leftVal = String(lr[leftKey] || '').trim();
      const matchingRightRows = rightMap.get(leftVal);

      if (matchingRightRows && matchingRightRows.length > 0) {
        matchedRightKeys.add(leftVal);
        matchingRightRows.forEach(rr => {
          const mergedRow: DataRow = { ...lr };
          rightTable.columns.forEach(rc => {
            let colName = rc.name;
            if (leftTable.columns.some(lc => lc.name === colName)) {
              colName = `${rightTable.name}_${colName}`;
            }
            mergedRow[colName] = rr[rc.name];
          });
          resultRows.push(mergedRow);
        });
      } else if (config.joinType === 'LEFT' || config.joinType === 'FULL') {
        // Keep left row with nulls for right columns
        const mergedRow: DataRow = { ...lr };
        rightTable.columns.forEach(rc => {
          let colName = rc.name;
          if (leftTable.columns.some(lc => lc.name === colName)) {
            colName = `${rightTable.name}_${colName}`;
          }
          mergedRow[colName] = null;
        });
        resultRows.push(mergedRow);
      }
    });

    // Handle FULL outer join missing right rows
    if (config.joinType === 'FULL') {
      rightTable.rows.forEach(rr => {
        const rightVal = String(rr[rightKey] || '').trim();
        if (!matchedRightKeys.has(rightVal)) {
          const mergedRow: DataRow = {};
          leftTable.columns.forEach(lc => {
            mergedRow[lc.name] = null;
          });
          rightTable.columns.forEach(rc => {
            let colName = rc.name;
            if (leftTable.columns.some(lc => lc.name === colName)) {
              colName = `${rightTable.name}_${colName}`;
            }
            mergedRow[colName] = rr[rc.name];
          });
          resultRows.push(mergedRow);
        }
      });
    }

    const indexedRows = resultRows.map((r, i) => ({ ...r, _rowIndex: i + 1 }));

    const joinedTable: DataTable = {
      id: `tbl_joined_${Date.now()}`,
      name: config.resultTableName || `Join_${leftTable.name}_${rightTable.name}`,
      columns: resultColumns,
      rows: indexedRows,
      totalRows: indexedRows.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memorySizeBytes: JSON.stringify(indexedRows).length,
    };

    setTables(prev => [...prev, joinedTable]);
    setActiveTableId(joinedTable.id);
  }, [tables]);

  // Load Sample Datasets
  const loadSampleData = useCallback(() => {
    const samples = getSampleDatasets();
    setTables(samples);
    setActiveTableId(samples[0].id);
  }, []);

  // Save Project Session as .lunix / .json
  const saveProjectSession = useCallback((sessionName: string = 'Lunix_Project_Session') => {
    const sessionData = {
      version: '1.0.0',
      timestamp: Date.now(),
      sessionName,
      tables,
    };
    const jsonStr = JSON.stringify(sessionData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    downloadBlob(blob, `${sessionName.replace(/\s+/g, '_')}.lunix`);
  }, [tables]);

  // Load Project Session from file
  const loadProjectSession = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const session = JSON.parse(text);
      if (session && Array.isArray(session.tables) && session.tables.length > 0) {
        setTables(session.tables);
        setActiveTableId(session.tables[0].id);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to load session', e);
      return false;
    }
  }, []);

  return {
    tables,
    activeTable,
    activeTableId,
    setActiveTableId,
    addTable,
    addMultipleTables,
    updateTableRows,
    updateTableColumns,
    deleteTable,
    renameTable,
    cloneTable,
    castColumnType,
    appendTables,
    joinTables,
    loadSampleData,
    saveProjectSession,
    loadProjectSession,
  };
}
