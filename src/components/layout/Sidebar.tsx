import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  CopyCheck, 
  Terminal, 
  Columns3, 
  GitCompare, 
  History, 
  Trash2, 
  Copy, 
  Edit2, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { DataTable } from '../../types/dataset';

export type ActiveView = 'GRID' | 'DUPLICATES' | 'SQL' | 'PIVOT' | 'DIFF' | 'HISTORY';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  tables: DataTable[];
  activeTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onRenameTable: (tableId: string, newName: string) => void;
  onCloneTable: (tableId: string) => void;
  transformationStepsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  tables,
  activeTableId,
  onSelectTable,
  onDeleteTable,
  onRenameTable,
  onCloneTable,
  transformationStepsCount,
}) => {
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  const handleStartRename = (table: DataTable, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTableId(table.id);
    setEditingName(table.name);
  };

  const handleSaveRename = (tableId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingName.trim()) {
      onRenameTable(tableId, editingName.trim());
    }
    setEditingTableId(null);
  };

  return (
    <aside className="app-sidebar">
      {/* Workbench Tools Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <span>Workbench Tools</span>
        </div>
        <ul className="sidebar-menu-list">
          <li
            className={`sidebar-item ${activeView === 'GRID' ? 'active' : ''}`}
            onClick={() => setActiveView('GRID')}
          >
            <TableIcon size={16} color={activeView === 'GRID' ? 'var(--pastel-blue)' : 'var(--text-muted)'} />
            <span>Spreadsheet Grid</span>
          </li>
          <li
            className={`sidebar-item ${activeView === 'DUPLICATES' ? 'active' : ''}`}
            onClick={() => setActiveView('DUPLICATES')}
          >
            <CopyCheck size={16} color={activeView === 'DUPLICATES' ? 'var(--pastel-rose)' : 'var(--text-muted)'} />
            <span>Duplicate Detector</span>
          </li>
          <li
            className={`sidebar-item ${activeView === 'SQL' ? 'active' : ''}`}
            onClick={() => setActiveView('SQL')}
          >
            <Terminal size={16} color={activeView === 'SQL' ? 'var(--pastel-emerald)' : 'var(--text-muted)'} />
            <span>SQL Studio</span>
          </li>
          <li
            className={`sidebar-item ${activeView === 'PIVOT' ? 'active' : ''}`}
            onClick={() => setActiveView('PIVOT')}
          >
            <Columns3 size={16} color={activeView === 'PIVOT' ? 'var(--pastel-purple)' : 'var(--text-muted)'} />
            <span>Visual Pivot Table</span>
          </li>
          <li
            className={`sidebar-item ${activeView === 'DIFF' ? 'active' : ''}`}
            onClick={() => setActiveView('DIFF')}
          >
            <GitCompare size={16} color={activeView === 'DIFF' ? 'var(--pastel-amber)' : 'var(--text-muted)'} />
            <span>Table Reconciliation</span>
          </li>
          <li
            className={`sidebar-item ${activeView === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveView('HISTORY')}
          >
            <History size={16} color={activeView === 'HISTORY' ? 'var(--pastel-indigo)' : 'var(--text-muted)'} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>Applied Recipe</span>
              {transformationStepsCount > 0 && (
                <span style={{
                  fontSize: '10px',
                  backgroundColor: 'var(--pastel-indigo-bg)',
                  color: 'var(--pastel-indigo)',
                  border: '1px solid var(--pastel-indigo-border)',
                  padding: '0 5px',
                  borderRadius: '10px'
                }}>
                  {transformationStepsCount}
                </span>
              )}
            </div>
          </li>
        </ul>
      </div>

      {/* In-Memory Tables Explorer */}
      <div className="sidebar-section" style={{ flex: 1, borderBottom: 'none' }}>
        <div className="sidebar-section-title">
          <span>In-Memory Tables ({tables.length})</span>
        </div>

        {tables.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Belum ada tabel di memori. Klik tombol <strong>Import Files</strong> atau <strong>Sample Datasets</strong>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {tables.map(table => {
              const isActive = table.id === activeTableId;
              const isEditing = editingTableId === table.id;

              return (
                <div
                  key={table.id}
                  className={`table-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectTable(table.id)}
                >
                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveRename(table.id, e)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                        style={{
                          flex: 1,
                          height: '24px',
                          padding: '0 6px',
                          fontSize: '12px',
                          background: 'var(--bg-app)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-focus)',
                          borderRadius: '4px',
                        }}
                      />
                      <button
                        type="submit"
                        className="btn btn-sm btn-icon"
                        style={{ height: '22px', width: '22px' }}
                      >
                        <Check size={12} color="var(--pastel-emerald)" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-icon"
                        style={{ height: '22px', width: '22px' }}
                        onClick={() => setEditingTableId(null)}
                      >
                        <X size={12} color="var(--text-muted)" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="table-item-name" title={table.name}>
                        <FileSpreadsheet
                          size={14}
                          color={isActive ? 'var(--pastel-blue)' : 'var(--text-muted)'}
                        />
                        <span style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {table.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span className="table-meta-badge">
                          {table.rows.length.toLocaleString()}
                        </span>

                        {isActive && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn btn-icon btn-sm"
                              style={{ width: '20px', height: '20px', padding: 0 }}
                              onClick={(e) => handleStartRename(table, e)}
                              title="Ganti Nama Tabel"
                            >
                              <Edit2 size={10} />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              style={{ width: '20px', height: '20px', padding: 0 }}
                              onClick={() => onCloneTable(table.id)}
                              title="Kloning / Gandakan Tabel"
                            >
                              <Copy size={10} />
                            </button>
                            <button
                              className="btn btn-icon btn-sm"
                              style={{ width: '20px', height: '20px', padding: 0 }}
                              onClick={() => onDeleteTable(table.id)}
                              title="Hapus Tabel dari Memori"
                            >
                              <Trash2 size={10} color="var(--pastel-rose)" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
