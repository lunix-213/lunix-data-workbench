import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Layers, 
  Type, 
  Hash, 
  Calendar,
  RotateCcw,
  Plus
} from 'lucide-react';
import { ColumnType, DataTable, FileImportPreview } from '../../types/dataset';
import { 
  parseExcelFile, 
  parseCsvFile, 
  parseJsonFile, 
  buildDataTableFromPreview, 
  inferColumnType,
  sanitizeHeaderNames,
  parseAndFormatDate
} from '../../services/fileParser';

interface PreImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTables: (tables: DataTable[]) => void;
}

export const PreImportModal: React.FC<PreImportModalProps> = ({
  isOpen,
  onClose,
  onImportTables,
}) => {
  const [previews, setPreviews] = useState<FileImportPreview[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean reset every time modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviews([]);
      setActivePreviewIndex(0);
      setIsLoading(false);
      setErrorMessage(null);
      setIsDragging(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreview = previews[activePreviewIndex] || null;

  // Handle file select / drop
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);

    const allPreviews: FileImportPreview[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (ext === 'xlsx' || ext === 'xls' || ext === 'ods') {
          const sheetPreviews = await parseExcelFile(file);
          allPreviews.push(...sheetPreviews);
        } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
          const csvPreviews = await parseCsvFile(file);
          allPreviews.push(...csvPreviews);
        } else if (ext === 'json') {
          const jsonPreviews = await parseJsonFile(file);
          allPreviews.push(...jsonPreviews);
        }
      }

      if (allPreviews.length > 0) {
        setPreviews(prev => [...prev, ...allPreviews]);
        setActivePreviewIndex(prev => (prev === 0 ? 0 : prev));
      } else {
        setErrorMessage('Tidak ada data valid yang dapat dibaca dari file yang dipilih.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Gagal memproses file: ${err?.message || 'Format tidak didukung'}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Change Header Row Index
  const handleHeaderRowChange = (newRowIdx: number) => {
    if (!currentPreview) return;
    const rawHeaders = (currentPreview.rawRows[newRowIdx] || []).map(h => String(h));
    const cleanHeaders = sanitizeHeaderNames(rawHeaders);
    const dataRows = currentPreview.rawRows.slice(newRowIdx + 1);

    const newColumns = cleanHeaders.map((colName, colIdx) => {
      const samples = dataRows.slice(0, 50).map(r => r[colIdx]);
      const inferred = inferColumnType(samples);
      return {
        name: colName,
        originalName: colName,
        type: inferred,
        inferredType: inferred,
        sampleValues: samples.slice(0, 5),
      };
    });

    setPreviews(prev => prev.map((p, idx) => {
      if (idx !== activePreviewIndex) return p;
      return {
        ...p,
        headerRowIndex: newRowIdx,
        inferredColumns: newColumns,
        selectedColumns: newColumns,
      };
    }));
  };

  // Override Column Type
  const handleColumnTypeOverride = (colIndex: number, newType: ColumnType) => {
    setPreviews(prev => prev.map((p, idx) => {
      if (idx !== activePreviewIndex) return p;
      const updated = p.selectedColumns.map((c, cIdx) => {
        if (cIdx === colIndex) return { ...c, type: newType };
        return c;
      });
      return { ...p, selectedColumns: updated };
    }));
  };

  // Reset entire import state
  const handleResetPreviews = () => {
    setPreviews([]);
    setActivePreviewIndex(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close modal with clean reset
  const handleCloseModal = () => {
    handleResetPreviews();
    onClose();
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (previews.length === 0) return;
    const tables = previews.map(p => buildDataTableFromPreview(p));
    onImportTables(tables);
    handleResetPreviews();
    onClose();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={handleCloseModal}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".xlsx,.xls,.csv,.tsv,.json,.txt"
        style={{ display: 'none' }}
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      <div 
        className="modal-dialog modal-dialog-large" 
        onClick={(e) => e.stopPropagation()}
        style={{ height: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Upload size={18} color="var(--pastel-blue)" />
            <span>Import Data & Precision-Safe Schema Configurator</span>
          </div>
          <button className="btn btn-outline btn-sm btn-icon" onClick={handleCloseModal}>
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflow: 'hidden' }}>
          {previews.length === 0 ? (
            <div 
              style={{
                flex: 1,
                border: isDragging ? '2px dashed var(--pastel-blue)' : '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'var(--pastel-blue-bg)' : 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet 
                size={54} 
                color={isDragging ? 'var(--pastel-blue)' : 'var(--pastel-blue)'} 
                style={{ marginBottom: '14px', transform: isDragging ? 'scale(1.1)' : 'none', transition: 'transform 0.2s ease' }} 
              />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {isLoading 
                  ? '⏳ Sedang Memproses File...' 
                  : isDragging 
                    ? '📥 Lepaskan File di Sini untuk Mengunggah' 
                    : 'Klik atau Drag & Drop File Spreadsheet ke Sini'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.5 }}>
                Mendukung Excel (<code>.xlsx</code> / <code>.xls</code> multi-sheet), CSV, TSV, dan JSON. Semua angka 16–19 digit & kode berawalan nol diamankan otomatis sebagai TEXT murni.
              </div>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '16px', pointerEvents: 'none' }}
              >
                <Upload size={14} />
                <span>Pilih File dari Komputer</span>
              </button>

              {errorMessage && (
                <div style={{ marginTop: '16px', color: 'var(--pastel-rose)', backgroundColor: 'var(--pastel-rose-bg)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--pastel-rose-border)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              {/* Top File / Sheet Tabs & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flex: 1 }}>
                  {previews.map((preview, idx) => (
                    <button
                      key={preview.fileId}
                      className={`btn btn-sm ${activePreviewIndex === idx ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => setActivePreviewIndex(idx)}
                    >
                      <FileSpreadsheet size={13} />
                      <span>{preview.fileName} ({preview.sheetName})</span>
                    </button>
                  ))}
                </div>

                {/* Additional Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Tambah file spreadsheet lainnya"
                  >
                    <Plus size={13} />
                    <span>+ Tambah File</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleResetPreviews}
                    title="Kosongkan dan pilih ulang file baru"
                  >
                    <RotateCcw size={13} />
                    <span>Ganti File</span>
                  </button>
                </div>
              </div>

              {/* 19-Digit Code Protection Alert Banner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--pastel-emerald-bg)', border: '1px solid var(--pastel-emerald-border)', padding: '7px 12px', borderRadius: 'var(--radius-md)', fontSize: '11.5px', color: 'var(--pastel-emerald)' }}>
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Precision Protection Active:</strong> Angka 16–19 digit (NIK, nomor kartu) dikunci sebagai TEXT murni. Format tanggal (DATE) distandardisasi otomatis ke format ISO (<code>YYYY-MM-DD</code>).
                </span>
              </div>

              {/* Configuration Controls */}
              {currentPreview && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Pilih Baris Judul Kolom (Header):</span>
                    <select
                      className="form-control form-select"
                      style={{ height: '28px', width: '130px', fontSize: '12px' }}
                      value={currentPreview.headerRowIndex}
                      onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                    >
                      {currentPreview.rawRows.slice(0, 10).map((_, rIdx) => (
                        <option key={rIdx} value={rIdx}>
                          Baris ke-{rIdx + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Total: <strong>{currentPreview.rawRows.length - currentPreview.headerRowIndex - 1} baris data</strong> ({currentPreview.selectedColumns.length} kolom)
                  </div>
                </div>
              )}

              {/* Column Schema & Preview Grid */}
              {currentPreview && (
                <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <table className="data-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th className="row-index-cell" style={{ width: '40px' }}>#</th>
                        {currentPreview.selectedColumns.map((col, colIdx) => (
                          <th key={colIdx} style={{ minWidth: '160px' }}>
                            <div style={{ marginBottom: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {col.name}
                            </div>
                            <select
                              className="form-control form-select"
                              style={{ 
                                height: '24px', 
                                fontSize: '11px', 
                                padding: '0 20px 0 6px',
                                borderColor: col.type === 'DATE' ? 'var(--pastel-blue)' : undefined,
                                fontWeight: col.type === 'DATE' ? 600 : 400
                              }}
                              value={col.type}
                              onChange={(e) => handleColumnTypeOverride(colIdx, e.target.value as ColumnType)}
                            >
                              <option value="TEXT">TEXT (19-Digit Safe)</option>
                              <option value="NUMBER">NUMBER (Angka)</option>
                              <option value="DATE">DATE (Tanggal)</option>
                              <option value="CURRENCY">CURRENCY (Mata Uang)</option>
                              <option value="BOOLEAN">BOOLEAN</option>
                            </select>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPreview.rawRows
                        .slice(currentPreview.headerRowIndex + 1, currentPreview.headerRowIndex + 6)
                        .map((r, rIdx) => (
                          <tr key={rIdx}>
                            <td className="row-index-cell">{rIdx + 1}</td>
                            {currentPreview.selectedColumns.map((col, colIdx) => {
                              const rawVal = r[colIdx];
                              let displayVal: string | null = (rawVal !== undefined && rawVal !== null && rawVal !== '') ? String(rawVal) : null;
                              
                              // Format date preview if DATE type selected
                              if (displayVal !== null && col.type === 'DATE') {
                                displayVal = parseAndFormatDate(displayVal);
                              }

                              return (
                                <td key={colIdx}>
                                  {displayVal !== null ? (
                                    <span style={col.type === 'DATE' ? { color: 'var(--pastel-blue)', fontWeight: 600 } : {}}>
                                      {displayVal}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={handleCloseModal}>
            Batal
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleConfirmImport}
            disabled={previews.length === 0}
          >
            <Check size={14} />
            <span>Masukkan ke Basis Data ({previews.length} Tabel)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
