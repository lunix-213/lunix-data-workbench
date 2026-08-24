import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnSchema, DataRow } from '../types/dataset';

/**
 * Trigger browser file download
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data to Excel (.xlsx) with precision safety.
 * Columns configured as TEXT are explicitly written as string cells (`t: 's'`)
 * to prevent Microsoft Excel from converting 19-digit codes or leading zeros to scientific notation.
 */
export function exportToExcel(
  rows: DataRow[],
  columns: ColumnSchema[],
  fileName: string = 'export.xlsx'
) {
  const columnNames = columns.map(c => c.name);
  const data = rows.map(r => {
    const rowArray: any[] = [];
    columns.forEach(col => {
      const val = r[col.name];
      rowArray.push(val !== undefined && val !== null ? val : '');
    });
    return rowArray;
  });

  const ws = XLSX.utils.aoa_to_sheet([columnNames, ...data]);

  // Ensure cell types for TEXT columns are strictly 's' (String)
  columns.forEach((col, colIdx) => {
    if (col.type === 'TEXT') {
      for (let rowIdx = 1; rowIdx <= rows.length; rowIdx++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
        if (ws[cellRef]) {
          ws[cellRef].t = 's'; // Force string cell
          ws[cellRef].v = String(ws[cellRef].v || '');
        }
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

/**
 * Export to CSV or TSV
 */
export function exportToCsv(
  rows: DataRow[],
  columns: ColumnSchema[],
  fileName: string = 'export.csv',
  delimiter: string = ','
) {
  const columnNames = columns.map(c => c.name);
  const data = rows.map(r => {
    const obj: Record<string, any> = {};
    columns.forEach(col => {
      obj[col.name] = r[col.name] !== undefined && r[col.name] !== null ? r[col.name] : '';
    });
    return obj;
  });

  const csv = Papa.unparse(data, {
    columns: columnNames,
    delimiter,
    quotes: true, // Quotes ensure no comma split errors
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, fileName);
}

/**
 * Export to JSON
 */
export function exportToJson(
  rows: DataRow[],
  columns: ColumnSchema[],
  fileName: string = 'export.json'
) {
  const data = rows.map(r => {
    const cleanObj: Record<string, any> = {};
    columns.forEach(col => {
      cleanObj[col.name] = r[col.name] !== undefined ? r[col.name] : null;
    });
    return cleanObj;
  });

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, fileName.endsWith('.json') ? fileName : `${fileName}.json`);
}

/**
 * Export to SQL INSERT statements
 */
export function exportToSqlInsert(
  rows: DataRow[],
  columns: ColumnSchema[],
  tableName: string = 'exported_table',
  fileName: string = 'export.sql'
) {
  const colNames = columns.map(c => `\`${c.name}\``).join(', ');
  let sql = `-- LUNIX DataControl SQL Dump\n-- Table: ${tableName}\n\n`;
  sql += `CREATE TABLE IF NOT EXISTS \`${tableName}\` (\n`;
  sql += columns.map(c => {
    let typeStr = 'VARCHAR(255)';
    if (c.type === 'NUMBER') typeStr = 'DECIMAL(18, 4)';
    else if (c.type === 'DATE') typeStr = 'DATETIME';
    else if (c.type === 'BOOLEAN') typeStr = 'BOOLEAN';
    return `  \`${c.name}\` ${typeStr}`;
  }).join(',\n');
  sql += `\n);\n\n`;

  rows.forEach(r => {
    const values = columns.map(col => {
      const val = r[col.name];
      if (val === null || val === undefined) return 'NULL';
      if (col.type === 'NUMBER' && typeof val === 'number') return String(val);
      if (col.type === 'BOOLEAN') return val ? 'TRUE' : 'FALSE';
      return `'${String(val).replace(/'/g, "''")}'`;
    }).join(', ');

    sql += `INSERT INTO \`${tableName}\` (${colNames}) VALUES (${values});\n`;
  });

  const blob = new Blob([sql], { type: 'application/sql' });
  downloadBlob(blob, fileName.endsWith('.sql') ? fileName : `${fileName}.sql`);
}
