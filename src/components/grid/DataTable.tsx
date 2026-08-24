import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ColumnSchema, ColumnType, DataRow, DataTable as IDataTable } from '../../types/dataset';
import { ColumnHeaderMenu } from './ColumnHeaderMenu';
import { TableToolbar } from './TableToolbar';

interface DataTableProps {
  table: IDataTable;
  onUpdateRows: (rows: DataRow[], actionType: any, description: string) => void;
  onUpdateColumns: (columns: ColumnSchema[]) => void;
  onCastColumnType: (columnName: string, newType: ColumnType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFillDown: (columnName: string) => void;
  onFillUp: (columnName: string) => void;
  onTrim: (columnName: string) => void;
  onChangeCasing: (columnName: string, casing: 'UPPER' | 'LOWER' | 'TITLE') => void;
  onOpenSplitModal: (columnName: string) => void;
  onOpenFormulaModal: () => void;
  onOpenFindReplaceModal: () => void;
  onOpenUnpivotModal: () => void;
  duplicateRowIndices?: Set<number>;
}

export const DataTable: React.FC<DataTableProps> = ({
  table,
  onUpdateRows,
  onUpdateColumns,
  onCastColumnType,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFillDown,
  onFillUp,
  onTrim,
  onChangeCasing,
  onOpenSplitModal,
  onOpenFormulaModal,
  onOpenFindReplaceModal,
  onOpenUnpivotModal,
  duplicateRowIndices,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('ALL');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Reset pagination when table or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [table.id, searchTerm, searchColumn, pageSize]);

  // Handle Sort
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      if (sortDirection === 'ASC') setSortDirection('DESC');
      else if (sortDirection === 'DESC') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnName);
      setSortDirection('ASC');
    }
  };

  // Filtered & Sorted Rows
  const processedRows = useMemo(() => {
    let result = [...table.rows];

    // 1. Search Filter
    if (searchTerm.trim()) {
      const termLower = searchTerm.toLowerCase();
      result = result.filter(row => {
        if (searchColumn !== 'ALL') {
          const val = row[searchColumn];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(termLower);
        }
        // Check all columns
        return Object.keys(row).some(k => {
          if (k === '_rowIndex') return false;
          const val = row[k];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(termLower);
        });
      });
    }

    // 2. Sorting
    if (sortColumn && sortDirection) {
      const targetCol = table.columns.find(c => c.name === sortColumn);
      const isNum = targetCol?.type === 'NUMBER';

      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (isNum && typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'ASC' ? valA - valB : valB - valA;
        }

        const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'ASC' ? comp : -comp;
      });
    }

    return result;
  }, [table.rows, searchTerm, searchColumn, sortColumn, sortDirection, table.columns]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, currentPage, pageSize]);

  // Handle cell edit save
  const handleSaveCell = (rowIndex: number, colName: string) => {
    if (editingCell) {
      const targetCol = table.columns.find(c => c.name === colName);
      let parsedVal: any = editingValue;

      if (targetCol?.type === 'NUMBER' && !isNaN(Number(editingValue)) && editingValue.trim() !== '') {
        parsedVal = Number(editingValue);
      } else if (targetCol?.type === 'BOOLEAN') {
        parsedVal = editingValue.toLowerCase() === 'true' || editingValue === '1';
      }

      const updatedRows = table.rows.map(r => {
        if (r._rowIndex === rowIndex) {
          return { ...r, [colName]: parsedVal };
        }
        return r;
      });

      onUpdateRows(updatedRows, 'EDIT_CELL', `Edit sel baris ${rowIndex}, kolom ${colName}`);
      setEditingCell(null);
    }
  };

  // Add a new blank row
  const handleAddRow = () => {
    const newIndex = table.rows.length + 1;
    const newRow: DataRow = { _rowIndex: newIndex };
    table.columns.forEach(c => {
      newRow[c.name] = null;
    });

    const updated = [...table.rows, newRow];
    onUpdateRows(updated, 'ADD_ROW', 'Tambah baris baru');
  };

  // Bulk delete selected rows
  const handleDeleteSelectedRows = () => {
    if (selectedRowIndices.size === 0) return;
    const updated = table.rows
      .filter(r => !selectedRowIndices.has(r._rowIndex))
      .map((r, idx) => ({ ...r, _rowIndex: idx + 1 }));

    onUpdateRows(updated, 'DELETE_ROWS', `Hapus ${selectedRowIndices.size} baris`);
    setSelectedRowIndices(new Set());
  };

  // Delete specific column
  const handleDeleteColumn = (columnName: string) => {
    const updatedCols = table.columns.filter(c => c.name !== columnName);
    const updatedRows = table.rows.map(r => {
      const copy = { ...r };
      delete copy[columnName];
      return copy;
    });
    onUpdateColumns(updatedCols);
    onUpdateRows(updatedRows, 'DELETE_COLUMN', `Hapus kolom ${columnName}`);
  };

  // Toggle select row
  const toggleSelectRow = (rowIndex: number) => {
    const newSet = new Set(selectedRowIndices);
    if (newSet.has(rowIndex)) newSet.delete(rowIndex);
    else newSet.add(rowIndex);
    setSelectedRowIndices(newSet);
  };

  // Select all visible
  const toggleSelectAll = () => {
    if (selectedRowIndices.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedRowIndices(new Set());
    } else {
      const newSet = new Set<number>();
      paginatedRows.forEach(r => newSet.add(r._rowIndex));
      setSelectedRowIndices(newSet);
    }
  };

  // Highlight search string in text
  const renderCellContent = (value: any, colName: string) => {
    if (value === null || value === undefined) {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>;
    }

    const strVal = String(value);

    if (searchTerm.trim() && (searchColumn === 'ALL' || searchColumn === colName)) {
      const parts = strVal.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="search-highlight">{part}</mark>
            ) : (
              part
            )
          )}
        </span>
      );
    }

    return strVal;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <TableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchColumn={searchColumn}
        setSearchColumn={setSearchColumn}
        columns={table.columns}
        pageSize={pageSize}
        setPageSize={setPageSize}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddRow={handleAddRow}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        selectedRowsCount={selectedRowIndices.size}
        onOpenFormulaModal={onOpenFormulaModal}
        onOpenFindReplaceModal={onOpenFindReplaceModal}
        onOpenUnpivotModal={onOpenUnpivotModal}
      />

      {/* Spreadsheet Grid */}
      <div className="table-viewport">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-index-cell" style={{ width: '38px', padding: '4px' }}>
                <input
                  type="checkbox"
                  checked={paginatedRows.length > 0 && selectedRowIndices.size === paginatedRows.length}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th className="row-index-cell" style={{ width: '48px' }}>
                #
              </th>
              {table.columns.map(col => (
                <ColumnHeaderMenu
                  key={col.name}
                  column={col}
                  sortDirection={sortColumn === col.name ? sortDirection : null}
                  onSort={handleSort}
                  onCastType={onCastColumnType}
                  onFillDown={onFillDown}
                  onFillUp={onFillUp}
                  onTrim={onTrim}
                  onChangeCasing={onChangeCasing}
                  onOpenSplitModal={onOpenSplitModal}
                  onDeleteColumn={handleDeleteColumn}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length + 2}
                  style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}
                >
                  {searchTerm ? 'Tidak ada data yang cocok dengan kata kunci pencarian.' : 'Tabel kosong.'}
                </td>
              </tr>
            ) : (
              paginatedRows.map(row => {
                const isSelected = selectedRowIndices.has(row._rowIndex);
                const isDuplicate = duplicateRowIndices?.has(row._rowIndex - 1);

                return (
                  <tr
                    key={row._rowIndex}
                    className={`${isSelected ? 'selected' : ''} ${isDuplicate ? 'duplicate' : ''}`}
                  >
                    <td className="row-index-cell" style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row._rowIndex)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td className="row-index-cell">
                      {row._rowIndex}
                    </td>

                    {table.columns.map(col => {
                      const isEditing = editingCell?.rowIndex === row._rowIndex && editingCell?.colName === col.name;
                      const cellVal = row[col.name];

                      return (
                        <td
                          key={col.name}
                          className="cell-editable"
                          onDoubleClick={() => {
                            setEditingCell({ rowIndex: row._rowIndex, colName: col.name });
                            setEditingValue(cellVal !== null && cellVal !== undefined ? String(cellVal) : '');
                          }}
                          title={`Klik ganda untuk mengedit (${col.name})`}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              className="cell-editing-input"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleSaveCell(row._rowIndex, col.name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(row._rowIndex, col.name);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            renderCellContent(cellVal, col.name)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        <div>
          Menampilkan baris <strong>{processedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{' '}
          <strong>{Math.min(currentPage * pageSize, processedRows.length)}</strong> dari{' '}
          <strong>{processedRows.length.toLocaleString()}</strong> data
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            title="Halaman Pertama"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>

          <span style={{ padding: '0 8px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Halaman {currentPage} dari {totalPages}
          </span>

          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            title="Halaman Selanjutnya"
          >
            <ChevronRight size={14} />
          </button>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Halaman Terakhir"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
