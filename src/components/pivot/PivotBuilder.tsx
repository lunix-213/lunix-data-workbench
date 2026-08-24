import React, { useState, useMemo } from 'react';
import { 
  Columns3, 
  Download, 
  Sparkles, 
  Calculator, 
  Layers
} from 'lucide-react';
import { DataTable } from '../../types/dataset';
import { AggregationFunction, PivotConfig, PivotResult } from '../../types/pivot';
import { exportToExcel } from '../../services/exporter';

interface PivotBuilderProps {
  table: DataTable;
}

export const PivotBuilder: React.FC<PivotBuilderProps> = ({ table }) => {
  // Available numerical or countable columns
  const defaultRow = table.columns[0]?.name || '';
  const defaultCol = table.columns.length > 1 ? table.columns[1]?.name : 'NONE';
  const defaultVal = table.columns.find(c => c.type === 'NUMBER')?.name || table.columns[0]?.name || '';

  const [rowField, setRowField] = useState<string>(defaultRow);
  const [columnField, setColumnField] = useState<string>(defaultCol);
  const [valueField, setValueField] = useState<string>(defaultVal);
  const [aggregation, setAggregation] = useState<AggregationFunction>('SUM');

  // Compute Pivot Matrix
  const pivotData: PivotResult = useMemo(() => {
    if (!rowField || !valueField || table.rows.length === 0) {
      return {
        rowKeys: [],
        columnKeys: [],
        matrix: {},
        rowTotals: {},
        colTotals: {},
        grandTotal: 0,
      };
    }

    const rowKeysSet = new Set<string>();
    const colKeysSet = new Set<string>();
    // Store array of values for each cell [rowKey][colKey] = number[]
    const cellValuesMap: Record<string, Record<string, number[]>> = {};

    table.rows.forEach(r => {
      const rKey = r[rowField] !== null && r[rowField] !== undefined ? String(r[rowField]) : '(Blank)';
      const cKey = columnField !== 'NONE' && r[columnField] !== null && r[columnField] !== undefined 
        ? String(r[columnField]) 
        : 'Total';

      rowKeysSet.add(rKey);
      colKeysSet.add(cKey);

      if (!cellValuesMap[rKey]) cellValuesMap[rKey] = {};
      if (!cellValuesMap[rKey][cKey]) cellValuesMap[rKey][cKey] = [];

      const rawVal = r[valueField];
      const numVal = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).replace(/,/g, ''));
      cellValuesMap[rKey][cKey].push(isNaN(numVal) ? 1 : numVal);
    });

    const rowKeys = Array.from(rowKeysSet).sort();
    const columnKeys = Array.from(colKeysSet).sort();

    // Aggregate function helper
    const computeAgg = (values: number[]): number => {
      if (!values || values.length === 0) return 0;
      switch (aggregation) {
        case 'SUM': return values.reduce((a, b) => a + b, 0);
        case 'COUNT': return values.length;
        case 'AVERAGE': return values.reduce((a, b) => a + b, 0) / values.length;
        case 'MIN': return Math.min(...values);
        case 'MAX': return Math.max(...values);
        case 'COUNT_DISTINCT': return new Set(values).size;
        default: return values.reduce((a, b) => a + b, 0);
      }
    };

    const matrix: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    const allValues: number[] = [];

    rowKeys.forEach(rKey => {
      matrix[rKey] = {};
      const rowAllValues: number[] = [];

      columnKeys.forEach(cKey => {
        const vals = cellValuesMap[rKey]?.[cKey] || [];
        const aggVal = computeAgg(vals);
        matrix[rKey][cKey] = Math.round(aggVal * 100) / 100;
        rowAllValues.push(...vals);
        allValues.push(...vals);
      });

      rowTotals[rKey] = Math.round(computeAgg(rowAllValues) * 100) / 100;
    });

    columnKeys.forEach(cKey => {
      const colAllValues: number[] = [];
      rowKeys.forEach(rKey => {
        colAllValues.push(...(cellValuesMap[rKey]?.[cKey] || []));
      });
      colTotals[cKey] = Math.round(computeAgg(colAllValues) * 100) / 100;
    });

    const grandTotal = Math.round(computeAgg(allValues) * 100) / 100;

    return {
      rowKeys,
      columnKeys,
      matrix,
      rowTotals,
      colTotals,
      grandTotal,
    };
  }, [table.rows, rowField, columnField, valueField, aggregation]);

  // Export pivot matrix to Excel
  const handleExportPivot = () => {
    const exportRows: any[] = [];
    const cols = [
      { name: rowField, originalName: rowField, type: 'TEXT' as const, inferredType: 'TEXT' as const },
      ...pivotData.columnKeys.map(k => ({ name: k, originalName: k, type: 'NUMBER' as const, inferredType: 'NUMBER' as const })),
      { name: 'Total', originalName: 'Total', type: 'NUMBER' as const, inferredType: 'NUMBER' as const }
    ];

    pivotData.rowKeys.forEach(rKey => {
      const rowObj: any = { [rowField]: rKey };
      pivotData.columnKeys.forEach(cKey => {
        rowObj[cKey] = pivotData.matrix[rKey]?.[cKey] || 0;
      });
      rowObj['Total'] = pivotData.rowTotals[rKey] || 0;
      exportRows.push(rowObj);
    });

    // Grand total row
    const totalRowObj: any = { [rowField]: 'Grand Total' };
    pivotData.columnKeys.forEach(cKey => {
      totalRowObj[cKey] = pivotData.colTotals[cKey] || 0;
    });
    totalRowObj['Total'] = pivotData.grandTotal;
    exportRows.push(totalRowObj);

    exportToExcel(exportRows, cols, `Pivot_${table.name}_${aggregation}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-app)' }}>
      {/* Top Configuration Bar */}
      <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Columns3 size={18} color="var(--pastel-purple)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Visual Pivot Table Builder
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              (Tabel: <strong>{table.name}</strong>)
            </span>
          </div>

          <button
            className="btn btn-success btn-sm"
            onClick={handleExportPivot}
            disabled={pivotData.rowKeys.length === 0}
            title="Download hasil pivot tabel ke Excel .xlsx"
          >
            <Download size={13} />
            <span>Download Pivot (Excel)</span>
          </button>
        </div>

        {/* Dimension Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <label className="form-label">1. Baris (Row Dimension):</label>
            <select
              className="form-control form-select"
              value={rowField}
              onChange={(e) => setRowField(e.target.value)}
            >
              {table.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">2. Kolom (Column Dimension):</label>
            <select
              className="form-control form-select"
              value={columnField}
              onChange={(e) => setColumnField(e.target.value)}
            >
              <option value="NONE">(Tanpa Kolom Tambahan / 1D)</option>
              {table.columns.filter(c => c.name !== rowField).map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">3. Nilai (Values Field):</label>
            <select
              className="form-control form-select"
              value={valueField}
              onChange={(e) => setValueField(e.target.value)}
            >
              {table.columns.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">4. Fungsi Agregasi:</label>
            <select
              className="form-control form-select"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as AggregationFunction)}
            >
              <option value="SUM">SUM (Jumlah Total)</option>
              <option value="COUNT">COUNT (Jumlah Baris)</option>
              <option value="AVERAGE">AVERAGE (Rata-rata)</option>
              <option value="MIN">MIN (Nilai Terendah)</option>
              <option value="MAX">MAX (Nilai Tertinggi)</option>
              <option value="COUNT_DISTINCT">COUNT DISTINCT (Nilai Unik)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pivot Matrix Table View */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {pivotData.rowKeys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Pilih dimensi baris dan nilai di atas untuk menghasilkan tabel pivot.
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <table className="pivot-matrix-table">
              <thead>
                <tr>
                  <th>{rowField} \ {columnField !== 'NONE' ? columnField : ''}</th>
                  {pivotData.columnKeys.map(cKey => (
                    <th key={cKey}>{cKey}</th>
                  ))}
                  <th style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--pastel-blue)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pivotData.rowKeys.map(rKey => (
                  <tr key={rKey}>
                    <td>{rKey}</td>
                    {pivotData.columnKeys.map(cKey => {
                      const val = pivotData.matrix[rKey]?.[cKey];
                      return (
                        <td key={cKey}>
                          {val !== undefined ? val.toLocaleString() : '-'}
                        </td>
                      );
                    })}
                    <td style={{ fontWeight: 600, color: 'var(--pastel-blue)', backgroundColor: 'var(--bg-surface)' }}>
                      {pivotData.rowTotals[rKey]?.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Grand Total Row */}
                <tr className="pivot-total-row">
                  <td>Grand Total</td>
                  {pivotData.columnKeys.map(cKey => (
                    <td key={cKey}>
                      {pivotData.colTotals[cKey]?.toLocaleString()}
                    </td>
                  ))}
                  <td style={{ color: 'var(--pastel-emerald)', fontSize: '13.5px' }}>
                    {pivotData.grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
