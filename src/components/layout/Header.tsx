import React, { useRef } from 'react';
import { 
  Database, 
  Upload, 
  Download, 
  Sun, 
  Moon, 
  FolderDown, 
  FolderOpen, 
  Sparkles, 
  PlusCircle, 
  HardDrive
} from 'lucide-react';
import { ThemeMode } from '../../hooks/useTheme';
import { DataTable } from '../../types/dataset';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenImportModal: () => void;
  onOpenExportModal: () => void;
  onOpenMergeJoinModal: () => void;
  onLoadSampleData: () => void;
  onSaveSession: () => void;
  onLoadSession: (file: File) => void;
  tables: DataTable[];
  activeTable: DataTable | null;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenImportModal,
  onOpenExportModal,
  onOpenMergeJoinModal,
  onLoadSampleData,
  onSaveSession,
  onLoadSession,
  tables,
  activeTable,
}) => {
  const sessionFileInputRef = useRef<HTMLInputElement>(null);

  const handleSessionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadSession(file);
      e.target.value = '';
    }
  };

  // Calculate total in-memory size
  const totalMemoryBytes = tables.reduce((acc, t) => acc + (t.memorySizeBytes || JSON.stringify(t.rows).length), 0);
  const memoryFormatted = totalMemoryBytes < 1024 * 1024
    ? `${(totalMemoryBytes / 1024).toFixed(1)} KB`
    : `${(totalMemoryBytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-badge">
          <div className="brand-icon-wrapper">
            <Database size={18} />
          </div>
          <span>LUNIX <span style={{ color: 'var(--pastel-blue)', fontWeight: 600 }}>DataControl</span></span>
        </div>
        <span className="brand-tag">Studio v1.0</span>
        
        {/* Memory Footprint Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-surface)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginLeft: '8px'
        }}>
          <HardDrive size={12} color="var(--pastel-emerald)" />
          <span>In-Memory: <strong>{memoryFormatted}</strong></span>
        </div>
      </div>

      <div className="header-actions">
        {/* Load Sample Data */}
        <button 
          className="btn btn-outline btn-sm"
          onClick={onLoadSampleData}
          title="Muat 3 Dataset Contoh (Penjualan, Pelanggan, Bank)"
        >
          <Sparkles size={14} color="var(--pastel-amber)" />
          <span>Sample Datasets</span>
        </button>

        {/* Merge / Join Wizard */}
        <button
          className="btn btn-outline btn-sm"
          onClick={onOpenMergeJoinModal}
          disabled={tables.length < 2}
          title="Gabungkan atau Relasikan 2 Tabel (Append / JOIN)"
        >
          <PlusCircle size={14} color="var(--pastel-indigo)" />
          <span>Merge / Join</span>
        </button>

        {/* Import Files */}
        <button 
          className="btn btn-primary btn-sm"
          onClick={onOpenImportModal}
          title="Import Excel (.xlsx/.xls), CSV, TSV, JSON"
        >
          <Upload size={14} />
          <span>Import Files</span>
        </button>

        {/* Export Data */}
        <button 
          className="btn btn-success btn-sm"
          onClick={onOpenExportModal}
          disabled={!activeTable}
          title="Ekspor ke Excel, CSV, JSON, SQL"
        >
          <Download size={14} />
          <span>Export</span>
        </button>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-medium)', margin: '0 4px' }} />

        {/* Save Session */}
        <button 
          className="btn btn-outline btn-sm btn-icon"
          onClick={onSaveSession}
          title="Simpan Sesi Project (.lunix)"
        >
          <FolderDown size={14} />
        </button>

        {/* Load Session */}
        <input 
          type="file" 
          ref={sessionFileInputRef} 
          accept=".lunix,.json" 
          style={{ display: 'none' }} 
          onChange={handleSessionFileChange} 
        />
        <button 
          className="btn btn-outline btn-sm btn-icon"
          onClick={() => sessionFileInputRef.current?.click()}
          title="Buka File Sesi (.lunix)"
        >
          <FolderOpen size={14} />
        </button>

        {/* Theme Toggle */}
        <button 
          className="btn btn-outline btn-sm btn-icon"
          onClick={onToggleTheme}
          title={`Ubah ke mode ${theme === 'dark' ? 'Terang (Light)' : 'Gelap (Dark)'}`}
        >
          {theme === 'dark' ? <Sun size={14} color="var(--pastel-amber)" /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
};
