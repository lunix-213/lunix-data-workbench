import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ColumnSchema, ColumnType, DataTable, FileImportPreview } from '../types/dataset';

/**
 * Checks if a string represents a long digit code (e.g. NIK, 19-digit card, barcode)
 * or has leading zeros (e.g. phone '0812345', '00123') which MUST remain TEXT.
 */
export function isLongDigitCodeOrLeadingZero(val: any): boolean {
  if (val === null || val === undefined) return false;
  const str = String(val).trim();
  if (!str) return false;
  
  // Digit only check
  if (/^\d+$/.test(str)) {
    // If length > 14 (risks IEEE 754 float precision loss) OR starts with 0 and length > 1
    if (str.length >= 15 || (str.startsWith('0') && str.length > 1)) {
      return true;
    }
  }
  return false;
}

/**
 * Smart Type Inferrer for a list of sample values in a column.
 */
export function inferColumnType(samples: any[]): ColumnType {
  const nonNulls = samples.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNulls.length === 0) return 'TEXT';

  let numberCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  let currencyCount = 0;

  for (const item of nonNulls) {
    const str = String(item).trim();

    // 1. Long digit code protection -> Force TEXT
    if (isLongDigitCodeOrLeadingZero(str)) {
      return 'TEXT';
    }

    // 2. Boolean check
    if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false' || str === '1' || str === '0') {
      if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
        boolCount++;
        continue;
      }
    }

    // 3. Currency check
    if (/^[Rp$€¥£]\s?[\d.,]+$/i.test(str) || /^[\d.,]+\s?[Rp$€¥£]$/i.test(str)) {
      currencyCount++;
      continue;
    }

    // 4. Number check (handling comma or dot decimals)
    const cleanedNum = str.replace(/[,.](\d{2})$/, '.$1').replace(/,/g, '');
    if (!isNaN(Number(cleanedNum)) && str !== '') {
      numberCount++;
      continue;
    }

    // 5. Date check (ISO, DD/MM/YYYY, YYYY-MM-DD)
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(str) || /^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(str)) {
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) {
        dateCount++;
        continue;
      }
    }
  }

  const threshold = nonNulls.length * 0.7; // 70% match
  if (currencyCount >= threshold) return 'CURRENCY';
  if (numberCount >= threshold) return 'NUMBER';
  if (dateCount >= threshold) return 'DATE';
  if (boolCount >= threshold) return 'BOOLEAN';

  return 'TEXT';
}

/**
 * Sanitizes headers: ensures no empty headers and duplicates get unique suffixes.
 */
export function sanitizeHeaderNames(headers: string[]): string[] {
  const seen: Record<string, number> = {};
  return headers.map((rawHeader, idx) => {
    let name = String(rawHeader || '').trim();
    if (!name) {
      name = `Column_${idx + 1}`;
    }
    if (seen[name]) {
      seen[name]++;
      const uniqueName = `${name}_${seen[name]}`;
      return uniqueName;
    } else {
      seen[name] = 1;
      return name;
    }
  });
}

/**
 * Parse an Excel file (.xlsx, .xls) and return raw preview for each sheet.
 */
export async function parseExcelFile(file: File): Promise<FileImportPreview[]> {
  const arrayBuffer = await file.arrayBuffer();
  // cellDates: false to prevent timezone shifting, raw: false to get formatted strings
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, raw: false });

  const previews: FileImportPreview[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to 2D array of strings
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });

    if (rawData.length === 0) continue;

    // Default header row is row 0
    const headerRowIdx = 0;
    const rawHeaders = (rawData[headerRowIdx] || []).map(h => String(h));
    const cleanHeaders = sanitizeHeaderNames(rawHeaders);

    const dataRows = rawData.slice(headerRowIdx + 1);
    const columns: ColumnSchema[] = cleanHeaders.map((colName, colIdx) => {
      const samples = dataRows.slice(0, 100).map(r => r[colIdx]);
      const inferred = inferColumnType(samples);
      return {
        name: colName,
        originalName: colName,
        type: inferred,
        inferredType: inferred,
        sampleValues: samples.slice(0, 5),
      };
    });

    previews.push({
      fileId: `${file.name}_${sheetName}_${Date.now()}`,
      fileName: file.name,
      sheetName,
      rawRows: rawData,
      headerRowIndex: 0,
      inferredColumns: columns,
      selectedColumns: [...columns],
      totalRawRows: rawData.length,
    });
  }

  return previews;
}

/**
 * Parse CSV or TSV file with PapaParse.
 */
export async function parseCsvFile(file: File): Promise<FileImportPreview[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: 'greedy',
      dynamicTyping: false, // Strict string parsing to prevent BigInt truncation!
      complete: (results) => {
        const rawData = results.data as any[][];
        if (!rawData || rawData.length === 0) {
          resolve([]);
          return;
        }

        const cleanHeaders = sanitizeHeaderNames(rawData[0].map(h => String(h)));
        const dataRows = rawData.slice(1);

        const columns: ColumnSchema[] = cleanHeaders.map((colName, colIdx) => {
          const samples = dataRows.slice(0, 100).map(r => r[colIdx]);
          const inferred = inferColumnType(samples);
          return {
            name: colName,
            originalName: colName,
            type: inferred,
            inferredType: inferred,
            sampleValues: samples.slice(0, 5),
          };
        });

        resolve([{
          fileId: `${file.name}_${Date.now()}`,
          fileName: file.name,
          sheetName: 'Sheet1',
          rawRows: rawData,
          headerRowIndex: 0,
          inferredColumns: columns,
          selectedColumns: [...columns],
          totalRawRows: rawData.length,
        }]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parse JSON file.
 */
export async function parseJsonFile(file: File): Promise<FileImportPreview[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  let rows: any[] = [];

  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    // If it's a key-value or wrapper object { data: [...] }
    const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
    if (arrayKey) {
      rows = parsed[arrayKey];
    } else {
      rows = [parsed];
    }
  }

  if (rows.length === 0) return [];

  // Extract all unique keys as headers
  const allKeysSet = new Set<string>();
  rows.forEach(r => {
    if (typeof r === 'object' && r !== null) {
      Object.keys(r).forEach(k => allKeysSet.add(k));
    }
  });

  const headers = Array.from(allKeysSet);
  const rawRows: any[][] = [headers];

  rows.forEach(r => {
    const rowArray = headers.map(k => r[k] !== undefined && r[k] !== null ? String(r[k]) : '');
    rawRows.push(rowArray);
  });

  const columns: ColumnSchema[] = headers.map((colName, colIdx) => {
    const samples = rawRows.slice(1, 100).map(r => r[colIdx]);
    const inferred = inferColumnType(samples);
    return {
      name: colName,
      originalName: colName,
      type: inferred,
      inferredType: inferred,
      sampleValues: samples.slice(0, 5),
    };
  });

  return [{
    fileId: `${file.name}_${Date.now()}`,
    fileName: file.name,
    sheetName: 'JSON_Data',
    rawRows,
    headerRowIndex: 0,
    inferredColumns: columns,
    selectedColumns: [...columns],
    totalRawRows: rawRows.length,
  }];
}

/**
 * Converts a configured FileImportPreview into a final DataTable with precision-safe type casting.
 */
export function buildDataTableFromPreview(preview: FileImportPreview): DataTable {
  const headerIdx = preview.headerRowIndex;
  const rawHeaders = (preview.rawRows[headerIdx] || []).map(h => String(h));
  const sanitizedHeaders = sanitizeHeaderNames(rawHeaders);

  // Map requested column configurations
  const columnConfigs = preview.selectedColumns.length > 0
    ? preview.selectedColumns
    : preview.inferredColumns;

  const rawDataRows = preview.rawRows.slice(headerIdx + 1);

  const formattedRows = rawDataRows.map((r, rowNum) => {
    const rowObj: Record<string, any> = { _rowIndex: rowNum + 1 };
    columnConfigs.forEach((col, colIdx) => {
      const rawVal = r[colIdx];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
        rowObj[col.name] = null;
        return;
      }

      const strVal = String(rawVal).trim();

      // Precision safe casting based on column.type
      switch (col.type) {
        case 'NUMBER': {
          // If it's a long digit code, keep as string even if user picked number by accident
          if (isLongDigitCodeOrLeadingZero(strVal)) {
            rowObj[col.name] = strVal;
          } else {
            const num = Number(strVal.replace(/,/g, ''));
            rowObj[col.name] = isNaN(num) ? strVal : num;
          }
          break;
        }
        case 'BOOLEAN': {
          if (strVal.toLowerCase() === 'true' || strVal === '1') rowObj[col.name] = true;
          else if (strVal.toLowerCase() === 'false' || strVal === '0') rowObj[col.name] = false;
          else rowObj[col.name] = Boolean(strVal);
          break;
        }
        case 'TEXT':
        default: {
          rowObj[col.name] = strVal;
          break;
        }
      }
    });
    return rowObj;
  });

  const approxSize = JSON.stringify(formattedRows).length;

  return {
    id: `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: preview.sheetName !== 'Sheet1' && preview.sheetName !== 'JSON_Data'
      ? `${preview.fileName.replace(/\.[^/.]+$/, '')}_${preview.sheetName}`
      : preview.fileName.replace(/\.[^/.]+$/, ''),
    sourceFileName: preview.fileName,
    sourceSheetName: preview.sheetName,
    columns: columnConfigs,
    rows: formattedRows,
    totalRows: formattedRows.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    memorySizeBytes: approxSize,
  };
}
