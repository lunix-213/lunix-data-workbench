import React, { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { useDatabase } from './hooks/useDatabase';
import { useTableHistory } from './hooks/useHistory';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DataTable } from './components/grid/DataTable';
import { DuplicateManager } from './components/duplicates/DuplicateManager';
import { SqlConsole } from './components/sql/SqlConsole';
import { PivotBuilder } from './components/pivot/PivotBuilder';
import { TableDiff } from './components/diff/TableDiff';
import { TransformHistoryView } from './components/history/TransformHistoryView';
import { PreImportModal } from './components/modals/PreImportModal';
import { MergeJoinModal } from './components/modals/MergeJoinModal';
import { FormulaModal } from './components/modals/FormulaModal';
import { FindReplaceModal } from './components/modals/FindReplaceModal';
import { SplitColumnModal } from './components/modals/SplitColumnModal';
import { ExportModal } from './components/modals/ExportModal';
import { UnpivotModal } from './components/modals/UnpivotModal';
import { 
  fillDownColumn, 
  fillUpColumn, 
  trimColumnWhitespace, 
  changeColumnCasing 
} from './services/dataCleaner';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const {
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
  } = useDatabase();

  const [activeView, setActiveView] = useState<ActiveView>('GRID');

  // History & Undo/Redo per active table
  const {
    steps,
    pushState,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  } = useTableHistory(activeTable?.rows || [], activeTable?.id || '');

  // Reset history when switching tables
  useEffect(() => {
    if (activeTable) {
      resetHistory(activeTable.rows, activeTable.id);
    }
  }, [activeTable?.id]);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isMergeJoinModalOpen, setIsMergeJoinModalOpen] = useState<boolean>(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);
  const [isFindReplaceModalOpen, setIsFindReplaceModalOpen] = useState<boolean>(false);
  const [isUnpivotModalOpen, setIsUnpivotModalOpen] = useState<boolean>(false);
  const [splitColumnModalTarget, setSplitColumnModalTarget] = useState<string | null>(null);

  // Wrappers for table updates with history recording
  const handleUpdateRows = (newRows: any[], actionType: any, description: string) => {
    if (!activeTable) return;
    pushState(newRows, actionType, description);
    updateTableRows(activeTable.id, newRows, actionType, description);
  };

  const handleUndo = () => {
    if (!activeTable) return;
    const prev = undo();
    if (prev) {
      updateTableRows(activeTable.id, prev, 'EDIT_CELL', 'Undo perbaikan');
    }
  };

  const handleRedo = () => {
    if (!activeTable) return;
    const next = redo();
    if (next) {
      updateTableRows(activeTable.id, next, 'EDIT_CELL', 'Redo perbaikan');
    }
  };

  // Column quick cleaners
  const handleFillDown = (columnName: string) => {
    if (!activeTable) return;
    const updated = fillDownColumn(activeTable.rows, columnName);
    handleUpdateRows(updated, 'FILL_DOWN', `Fill Down kolom '${columnName}'`);
  };

  const handleFillUp = (columnName: string) => {
    if (!activeTable) return;
    const updated = fillUpColumn(activeTable.rows, columnName);
    handleUpdateRows(updated, 'FILL_UP', `Fill Up kolom '${columnName}'`);
  };

  const handleTrim = (columnName: string) => {
    if (!activeTable) return;
    const updated = trimColumnWhitespace(activeTable.rows, [columnName]);
    handleUpdateRows(updated, 'TRIM_WHITESPACE', `Trim spasi kolom '${columnName}'`);
  };

  const handleChangeCasing = (columnName: string, casing: 'UPPER' | 'LOWER' | 'TITLE') => {
    if (!activeTable) return;
    const updated = changeColumnCasing(activeTable.rows, columnName, casing);
    handleUpdateRows(updated, 'CHANGE_CASING', `Ubah kapitalisasi kolom '${columnName}' jadi ${casing}`);
  };

  const handleAddColumn = (newColName: string) => {
    if (!activeTable) return;
    if (!activeTable.columns.some(c => c.name === newColName)) {
      updateTableColumns(activeTable.id, [
        ...activeTable.columns,
        {
          name: newColName,
          originalName: newColName,
          type: 'TEXT',
          inferredType: 'TEXT',
          isCustom: true,
        },
      ]);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenMergeJoinModal={() => setIsMergeJoinModalOpen(true)}
        onLoadSampleData={loadSampleData}
        onSaveSession={() => saveProjectSession('Lunix_Workspace_Session')}
        onLoadSession={loadProjectSession}
        tables={tables}
        activeTable={activeTable}
      />

      {/* Main Workspace */}
      <div className="app-main">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          tables={tables}
          activeTableId={activeTableId}
          onSelectTable={(id) => setActiveTableId(id)}
          onDeleteTable={(id) => deleteTable(id)}
          onRenameTable={(id, name) => renameTable(id, name)}
          onCloneTable={(id) => cloneTable(id)}
          transformationStepsCount={steps.length}
        />

        {/* Center Content View Area */}
        <main className="workspace-content">
          {!activeTable && activeView !== 'SQL' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Belum ada tabel yang dimuat
              </div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>
                Silakan import file Excel/CSV/JSON atau klik tombol <strong>Sample Datasets</strong> di atas.
              </div>
              <button className="btn btn-primary" onClick={() => setIsImportModalOpen(true)}>
                Import Files Sekarang
              </button>
            </div>
          ) : (
            <>
              {activeView === 'GRID' && activeTable && (
                <DataTable
                  table={activeTable}
                  onUpdateRows={(rows, actionType, desc) => handleUpdateRows(rows, actionType, desc)}
                  onUpdateColumns={(cols) => updateTableColumns(activeTable.id, cols)}
                  onCastColumnType={(col, type) => castColumnType(activeTable.id, col, type)}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onFillDown={handleFillDown}
                  onFillUp={handleFillUp}
                  onTrim={handleTrim}
                  onChangeCasing={handleChangeCasing}
                  onOpenSplitModal={(col) => setSplitColumnModalTarget(col)}
                  onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
                  onOpenFindReplaceModal={() => setIsFindReplaceModalOpen(true)}
                  onOpenUnpivotModal={() => setIsUnpivotModalOpen(true)}
                />
              )}

              {activeView === 'DUPLICATES' && activeTable && (
                <DuplicateManager
                  table={activeTable}
                  onUpdateRows={(rows, actionType, desc) => handleUpdateRows(rows, actionType, desc)}
                  onAddTable={addTable}
                />
              )}

              {activeView === 'SQL' && (
                <SqlConsole
                  tables={tables}
                  activeTable={activeTable}
                  onAddTable={addTable}
                />
              )}

              {activeView === 'PIVOT' && activeTable && (
                <PivotBuilder table={activeTable} />
              )}

              {activeView === 'DIFF' && (
                <TableDiff tables={tables} />
              )}

              {activeView === 'HISTORY' && activeTable && (
                <TransformHistoryView
                  table={activeTable}
                  steps={steps}
                  onUndo={handleUndo}
                  canUndo={canUndo}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        activeTable={activeTable}
        filteredCount={activeTable?.rows.length || 0}
        selectedCount={0}
        isFiltered={false}
      />

      {/* Interactive Modals */}
      <PreImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportTables={(newTables) => addMultipleTables(newTables)}
      />

      <MergeJoinModal
        isOpen={isMergeJoinModalOpen}
        onClose={() => setIsMergeJoinModalOpen(false)}
        tables={tables}
        onAppendTables={appendTables}
        onJoinTables={joinTables}
      />

      {activeTable && (
        <FormulaModal
          isOpen={isFormulaModalOpen}
          onClose={() => setIsFormulaModalOpen(false)}
          table={activeTable}
          onUpdateRows={(rows, actionType, desc) => handleUpdateRows(rows, actionType, desc)}
          onAddColumn={handleAddColumn}
        />
      )}

      {activeTable && (
        <FindReplaceModal
          isOpen={isFindReplaceModalOpen}
          onClose={() => setIsFindReplaceModalOpen(false)}
          table={activeTable}
          onUpdateRows={(rows, actionType, desc) => handleUpdateRows(rows, actionType, desc)}
        />
      )}

      {activeTable && splitColumnModalTarget && (
        <SplitColumnModal
          isOpen={!!splitColumnModalTarget}
          onClose={() => setSplitColumnModalTarget(null)}
          columnName={splitColumnModalTarget}
          table={activeTable}
          onUpdateRows={(rows, actionType, desc) => handleUpdateRows(rows, actionType, desc)}
          onUpdateColumns={(cols) => updateTableColumns(activeTable.id, cols)}
        />
      )}

      {activeTable && (
        <UnpivotModal
          isOpen={isUnpivotModalOpen}
          onClose={() => setIsUnpivotModalOpen(false)}
          table={activeTable}
          tables={tables}
          onAddTable={addTable}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        table={activeTable}
      />
    </div>
  );
};

export default App;
