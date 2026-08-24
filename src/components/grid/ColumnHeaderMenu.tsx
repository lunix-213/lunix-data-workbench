import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  MoreVertical, 
  Type, 
  Hash, 
  Calendar, 
  CheckCircle2, 
  DollarSign, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  Sparkles, 
  Trash2,
  Scissors
} from 'lucide-react';
import { ColumnSchema, ColumnType } from '../../types/dataset';

interface ColumnHeaderMenuProps {
  column: ColumnSchema;
  sortDirection: 'ASC' | 'DESC' | null;
  onSort: (columnName: string) => void;
  onCastType: (columnName: string, newType: ColumnType) => void;
  onFillDown: (columnName: string) => void;
  onFillUp: (columnName: string) => void;
  onTrim: (columnName: string) => void;
  onChangeCasing: (columnName: string, casing: 'UPPER' | 'LOWER' | 'TITLE') => void;
  onOpenSplitModal: (columnName: string) => void;
  onDeleteColumn: (columnName: string) => void;
}

export const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
  column,
  sortDirection,
  onSort,
  onCastType,
  onFillDown,
  onFillUp,
  onTrim,
  onChangeCasing,
  onOpenSplitModal,
  onDeleteColumn,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getTypeBadgeClass = (type: ColumnType) => {
    switch (type) {
      case 'TEXT': return 'type-pill-text';
      case 'NUMBER': return 'type-pill-number';
      case 'DATE': return 'type-pill-date';
      case 'BOOLEAN': return 'type-pill-bool';
      case 'CURRENCY': return 'type-pill-number';
      default: return 'type-pill-text';
    }
  };

  return (
    <th className="col-header-cell" style={{ position: 'relative' }}>
      <div className="th-content">
        <div 
          className="col-header-info" 
          onClick={() => onSort(column.name)}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          title={`Klik untuk urutkan berdasarkan ${column.name}`}
        >
          <span className={`type-pill ${getTypeBadgeClass(column.type)}`}>
            {column.type.substring(0, 3)}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{column.name}</span>
          {sortDirection === 'ASC' && <ArrowUp size={12} color="var(--pastel-blue)" />}
          {sortDirection === 'DESC' && <ArrowDown size={12} color="var(--pastel-blue)" />}
          {sortDirection === null && <ArrowUpDown size={11} color="var(--text-muted)" opacity={0.6} />}
        </div>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="btn btn-icon btn-sm"
            style={{ width: '20px', height: '20px', padding: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            title="Menu Kolom & Tools"
          >
            <MoreVertical size={13} color="var(--text-muted)" />
          </button>

          {isOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '210px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                padding: '4px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Type Casting Section */}
              <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Ubah Tipe Kolom (Cast)
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onCastType(column.name, 'TEXT'); setIsOpen(false); }}
              >
                <Type size={13} color="var(--pastel-blue)" />
                <span>Text / String (19-Digit Safe)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onCastType(column.name, 'NUMBER'); setIsOpen(false); }}
              >
                <Hash size={13} color="var(--pastel-purple)" />
                <span>Number (Angka / Desimal)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onCastType(column.name, 'DATE'); setIsOpen(false); }}
              >
                <Calendar size={13} color="var(--pastel-emerald)" />
                <span>Date (Tanggal)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onCastType(column.name, 'BOOLEAN'); setIsOpen(false); }}
              >
                <CheckCircle2 size={13} color="var(--pastel-amber)" />
                <span>Boolean (True/False)</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* Data Cleaning Tools */}
              <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Clean & Transform
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onFillDown(column.name); setIsOpen(false); }}
                title="Isi sel kosong dari baris di atasnya (Forward fill untuk merged cells)"
              >
                <ArrowDownToLine size={13} color="var(--pastel-emerald)" />
                <span>Fill Down (Forward Fill)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onFillUp(column.name); setIsOpen(false); }}
                title="Isi sel kosong dari baris di bawahnya (Backward fill)"
              >
                <ArrowUpToLine size={13} color="var(--pastel-blue)" />
                <span>Fill Up (Backward Fill)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onTrim(column.name); setIsOpen(false); }}
              >
                <Sparkles size={13} color="var(--pastel-amber)" />
                <span>Trim Spasi Berlebih</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onChangeCasing(column.name, 'UPPER'); setIsOpen(false); }}
              >
                <Type size={13} />
                <span>UPPERCASE (HURUF BESAR)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onChangeCasing(column.name, 'LOWER'); setIsOpen(false); }}
              >
                <Type size={13} />
                <span>lowercase (huruf kecil)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onChangeCasing(column.name, 'TITLE'); setIsOpen(false); }}
              >
                <Type size={13} />
                <span>Title Case (Huruf Kapital Tiap Kata)</span>
              </div>
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px' }}
                onClick={() => { onOpenSplitModal(column.name); setIsOpen(false); }}
              >
                <Scissors size={13} color="var(--pastel-indigo)" />
                <span>Split Kolom by Delimiter...</span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

              {/* Delete Column */}
              <div
                className="sidebar-item"
                style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--pastel-rose)' }}
                onClick={() => { onDeleteColumn(column.name); setIsOpen(false); }}
              >
                <Trash2 size={13} />
                <span>Hapus Kolom Ini</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </th>
  );
};
