import React from 'react';
import { History, RotateCcw, Sparkles, CheckCircle2, Clock, Layers } from 'lucide-react';
import { TransformationStep } from '../../types/history';
import { DataTable } from '../../types/dataset';

interface TransformHistoryViewProps {
  table: DataTable;
  steps: TransformationStep[];
  onUndo: () => void;
  canUndo: boolean;
}

export const TransformHistoryView: React.FC<TransformHistoryViewProps> = ({
  table,
  steps,
  onUndo,
  canUndo,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* Header */}
      <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--pastel-indigo)" />
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Applied Transformation Recipe (Audit Trail)
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            (Tabel: <strong>{table.name}</strong>)
          </span>
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Batalkan langkah modifikasi terakhir"
        >
          <RotateCcw size={13} />
          <span>Urungkan Langkah Terakhir</span>
        </button>
      </div>

      {/* Steps List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {steps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Sparkles size={32} color="var(--pastel-blue)" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Data Masih Asli (Belum Ada Modifikasi)
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Setiap kali Anda melakukan edit sel, trim spasi, hapus duplikat, fill down, atau cast tipe kolom, riwayat langkahnya akan tercatat di sini seperti Power Query Recipe.
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Urutan Langkah Pembersihan & Modifikasi ({steps.length} langkah):
            </div>

            {steps.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--pastel-indigo-bg)',
                      color: 'var(--pastel-indigo)',
                      border: '1px solid var(--pastel-indigo-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {step.description}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Tipe Aksi: {step.actionType}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Clock size={11} />
                  <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
