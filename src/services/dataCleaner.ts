import { ColumnSchema, DataRow } from '../types/dataset';
import { DeduplicationRule, DuplicateAnalysisResult, DuplicateCluster, DuplicateMatchMode } from '../types/duplicates';

/**
 * Calculate Levenshtein Distance for fuzzy string similarity.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity ratio between 0.0 and 1.0 (1.0 = identical)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = String(str1 || '');
  const s2 = String(str2 || '');
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return (maxLen - dist) / maxLen;
}

/**
 * Normalize string for comparison based on options.
 */
export function normalizeValue(
  val: any,
  ignoreCase: boolean,
  ignoreWhitespace: boolean,
  ignoreSpecialChars: boolean
): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (ignoreCase) str = str.toLowerCase();
  if (ignoreWhitespace) str = str.replace(/\s+/g, ' ').trim();
  if (ignoreSpecialChars) str = str.replace(/[^a-zA-Z0-9\s]/g, '');
  return str;
}

/**
 * Analyze Duplicate Rows across selected headers.
 */
export function analyzeDuplicates(
  rows: DataRow[],
  selectedColumns: string[],
  matchMode: DuplicateMatchMode = 'EXACT',
  fuzzyThreshold: number = 0.85,
  ignoreCase: boolean = true,
  ignoreWhitespace: boolean = true,
  ignoreSpecialChars: boolean = false
): DuplicateAnalysisResult {
  if (rows.length === 0 || selectedColumns.length === 0) {
    return {
      totalRows: rows.length,
      duplicateRowsCount: 0,
      uniqueClustersCount: 0,
      clusters: [],
      selectedColumns,
      matchMode,
      fuzzyThreshold,
      ignoreCase,
      ignoreWhitespace,
      ignoreSpecialChars,
    };
  }

  const clusters: DuplicateCluster[] = [];

  if (matchMode === 'EXACT') {
    const keyMap = new Map<string, { indices: number[]; rows: any[] }>();

    rows.forEach((row, idx) => {
      const key = selectedColumns
        .map(col => normalizeValue(row[col], ignoreCase, ignoreWhitespace, ignoreSpecialChars))
        .join(' | ');

      // Ignore if all selected columns are empty
      if (!key.replace(/\|\s*/g, '').trim()) return;

      if (!keyMap.has(key)) {
        keyMap.set(key, { indices: [idx], rows: [row] });
      } else {
        const item = keyMap.get(key)!;
        item.indices.push(idx);
        item.rows.push(row);
      }
    });

    let clusterIndex = 1;
    keyMap.forEach((val, key) => {
      if (val.indices.length > 1) {
        clusters.push({
          clusterId: `cluster_${clusterIndex++}`,
          key,
          count: val.indices.length,
          rowIndices: val.indices,
          rows: val.rows,
          similarityScore: 1.0,
        });
      }
    });
  } else {
    // FUZZY MATCHING (Cluster nearby strings)
    const visited = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
      if (visited.has(i)) continue;

      const baseKey = selectedColumns
        .map(col => normalizeValue(rows[i][col], ignoreCase, ignoreWhitespace, ignoreSpecialChars))
        .join(' ');

      if (!baseKey.trim()) continue;

      const currentClusterIndices = [i];
      const currentClusterRows = [rows[i]];
      let totalSimilarity = 1.0;

      for (let j = i + 1; j < rows.length; j++) {
        if (visited.has(j)) continue;

        const compareKey = selectedColumns
          .map(col => normalizeValue(rows[j][col], ignoreCase, ignoreWhitespace, ignoreSpecialChars))
          .join(' ');

        if (!compareKey.trim()) continue;

        const sim = stringSimilarity(baseKey, compareKey);
        if (sim >= fuzzyThreshold) {
          currentClusterIndices.push(j);
          currentClusterRows.push(rows[j]);
          visited.add(j);
          totalSimilarity = Math.min(totalSimilarity, sim);
        }
      }

      if (currentClusterIndices.length > 1) {
        visited.add(i);
        clusters.push({
          clusterId: `fuzzy_cluster_${clusters.length + 1}`,
          key: baseKey,
          count: currentClusterIndices.length,
          rowIndices: currentClusterIndices,
          rows: currentClusterRows,
          similarityScore: totalSimilarity,
        });
      }
    }
  }

  const duplicateRowsCount = clusters.reduce((sum, c) => sum + c.count, 0);

  return {
    totalRows: rows.length,
    duplicateRowsCount,
    uniqueClustersCount: clusters.length,
    clusters,
    selectedColumns,
    matchMode,
    fuzzyThreshold,
    ignoreCase,
    ignoreWhitespace,
    ignoreSpecialChars,
  };
}

/**
 * Execute Deduplication Cleaner based on chosen Rule.
 */
export function cleanDuplicatesByRule(
  rows: DataRow[],
  analysis: DuplicateAnalysisResult,
  rule: DeduplicationRule
): { cleanedRows: DataRow[]; removedCount: number } {
  const rowsToDelete = new Set<number>();

  analysis.clusters.forEach(cluster => {
    const indices = cluster.rowIndices;

    if (rule === 'KEEP_FIRST') {
      // Keep indices[0], delete the rest
      indices.slice(1).forEach(idx => rowsToDelete.add(idx));
    } else if (rule === 'KEEP_LAST') {
      // Keep indices[indices.length - 1], delete the rest
      indices.slice(0, -1).forEach(idx => rowsToDelete.add(idx));
    } else if (rule === 'REMOVE_ALL_DUPLICATES') {
      // Delete every single occurrence in the cluster
      indices.forEach(idx => rowsToDelete.add(idx));
    } else if (rule === 'KEEP_MOST_COMPLETE') {
      // Calculate which row has the highest number of non-null/non-empty columns
      let bestIdx = indices[0];
      let maxFilled = -1;

      indices.forEach(idx => {
        const row = rows[idx];
        let filledCount = 0;
        Object.keys(row).forEach(k => {
          if (k !== '_rowIndex' && row[k] !== null && row[k] !== undefined && String(row[k]).trim() !== '') {
            filledCount++;
          }
        });
        if (filledCount > maxFilled) {
          maxFilled = filledCount;
          bestIdx = idx;
        }
      });

      indices.forEach(idx => {
        if (idx !== bestIdx) rowsToDelete.add(idx);
      });
    }
  });

  const cleanedRows = rows
    .filter((_, idx) => !rowsToDelete.has(idx))
    .map((row, newIdx) => ({ ...row, _rowIndex: newIdx + 1 }));

  return {
    cleanedRows,
    removedCount: rowsToDelete.size,
  };
}

/**
 * Column Cleaner: Trim Whitespace
 */
export function trimColumnWhitespace(rows: DataRow[], columnNames: string[]): DataRow[] {
  return rows.map(r => {
    const newRow = { ...r };
    columnNames.forEach(col => {
      if (typeof newRow[col] === 'string') {
        newRow[col] = newRow[col].trim();
      }
    });
    return newRow;
  });
}

/**
 * Column Cleaner: Change Casing
 */
export function changeColumnCasing(
  rows: DataRow[],
  columnName: string,
  casing: 'UPPER' | 'LOWER' | 'TITLE'
): DataRow[] {
  return rows.map(r => {
    const val = r[columnName];
    if (typeof val !== 'string' || !val) return r;

    let newVal = val;
    if (casing === 'UPPER') newVal = val.toUpperCase();
    else if (casing === 'LOWER') newVal = val.toLowerCase();
    else if (casing === 'TITLE') {
      newVal = val.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    }

    return { ...r, [columnName]: newVal };
  });
}

/**
 * Column Cleaner: Fill Down (Forward Fill for merged blank cells)
 */
export function fillDownColumn(rows: DataRow[], columnName: string): DataRow[] {
  let lastValidValue: any = null;
  return rows.map(r => {
    const currentVal = r[columnName];
    if (currentVal !== null && currentVal !== undefined && String(currentVal).trim() !== '') {
      lastValidValue = currentVal;
      return r;
    }
    if (lastValidValue !== null) {
      return { ...r, [columnName]: lastValidValue };
    }
    return r;
  });
}

/**
 * Column Cleaner: Fill Up (Backward Fill)
 */
export function fillUpColumn(rows: DataRow[], columnName: string): DataRow[] {
  const result = [...rows];
  let lastValidValue: any = null;
  for (let i = result.length - 1; i >= 0; i--) {
    const currentVal = result[i][columnName];
    if (currentVal !== null && currentVal !== undefined && String(currentVal).trim() !== '') {
      lastValidValue = currentVal;
    } else if (lastValidValue !== null) {
      result[i] = { ...result[i], [columnName]: lastValidValue };
    }
  }
  return result;
}

/**
 * Column Cleaner: Split Column
 */
export function splitColumnByDelimiter(
  rows: DataRow[],
  columnName: string,
  delimiter: string,
  newColNames: string[]
): { rows: DataRow[]; newColumns: string[] } {
  const updatedRows = rows.map(r => {
    const val = String(r[columnName] || '');
    const parts = val.split(delimiter);
    const newRow = { ...r };
    newColNames.forEach((name, idx) => {
      newRow[name] = parts[idx] ? parts[idx].trim() : '';
    });
    return newRow;
  });

  return { rows: updatedRows, newColumns: newColNames };
}

/**
 * Column Cleaner: Merge Columns
 */
export function mergeMultipleColumns(
  rows: DataRow[],
  colNames: string[],
  separator: string,
  newColName: string
): DataRow[] {
  return rows.map(r => {
    const combined = colNames
      .map(col => (r[col] !== null && r[col] !== undefined ? String(r[col]).trim() : ''))
      .filter(Boolean)
      .join(separator);
    return { ...r, [newColName]: combined };
  });
}

/**
 * Find & Replace Tool
 */
export function findAndReplaceData(
  rows: DataRow[],
  targetColumn: string | 'ALL',
  findText: string,
  replaceText: string,
  matchCase: boolean = false,
  useRegex: boolean = false
): { rows: DataRow[]; count: number } {
  let count = 0;
  let regex: RegExp;

  try {
    const flags = matchCase ? 'g' : 'gi';
    regex = useRegex ? new RegExp(findText, flags) : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch (e) {
    return { rows, count: 0 };
  }

  const updated = rows.map(r => {
    const newRow = { ...r };
    const keysToCheck = targetColumn === 'ALL' ? Object.keys(r).filter(k => k !== '_rowIndex') : [targetColumn];

    keysToCheck.forEach(k => {
      const val = newRow[k];
      if (typeof val === 'string') {
        const matches = (val.match(regex) || []).length;
        if (matches > 0) {
          count += matches;
          newRow[k] = val.replace(regex, replaceText);
        }
      }
    });

    return newRow;
  });

  return { rows: updated, count };
}

/**
 * Calculated / Formula Column Evaluator (Safely evaluate simple expressions)
 * Supports [ColA] * [ColB], CONCAT([A], " ", [B]), IF([Col] > 100, "X", "Y")
 */
export function evaluateFormulaColumn(
  rows: DataRow[],
  newColName: string,
  formula: string,
  columns: ColumnSchema[]
): DataRow[] {
  return rows.map(r => {
    let expression = formula;

    // Replace [ColumnName] with row values
    columns.forEach(col => {
      const colRegex = new RegExp(`\\[${col.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      const val = r[col.name];
      let stringifiedVal = '""';
      if (val === null || val === undefined) {
        stringifiedVal = '""';
      } else if (typeof val === 'number') {
        stringifiedVal = String(val);
      } else {
        stringifiedVal = JSON.stringify(String(val));
      }
      expression = expression.replace(colRegex, stringifiedVal);
    });

    // Helper functions for formula
    const CONCAT = (...args: any[]) => args.join('');
    const IF = (cond: boolean, a: any, b: any) => (cond ? a : b);
    const UPPER = (str: string) => String(str).toUpperCase();
    const LOWER = (str: string) => String(str).toLowerCase();
    const TRIM = (str: string) => String(str).trim();

    let computedVal: any = '';
    try {
      // Safe sandboxed Function constructor
      const func = new Function('CONCAT', 'IF', 'UPPER', 'LOWER', 'TRIM', `return (${expression});`);
      computedVal = func(CONCAT, IF, UPPER, LOWER, TRIM);
    } catch (e) {
      computedVal = '#ERROR';
    }

    return { ...r, [newColName]: computedVal };
  });
}

/**
 * Unpivot / Melt Table: Convert wide columns into vertical key-value rows
 * Example:
 * Input: { ID_Pelanggan: 'CUST-001', Nama_Perusahaan: 'PT. Maju', Kota: 'Jakarta' }
 * Output:
 *   Row 1: { ID_Pelanggan: 'CUST-001', Atribut: 'Nama_Perusahaan', Nilai: 'PT. Maju' }
 *   Row 2: { ID_Pelanggan: 'CUST-001', Atribut: 'Kota', Nilai: 'Jakarta' }
 */
export function unpivotTable(
  rows: DataRow[],
  idColumns: string[],
  valueColumns: string[],
  attributeColName: string = 'Atribut',
  valueColName: string = 'Nilai',
  filterIdValue?: string
): DataRow[] {
  const result: DataRow[] = [];
  let filteredRows = rows;

  if (filterIdValue && filterIdValue.trim() && idColumns.length > 0) {
    const searchVal = filterIdValue.trim().toLowerCase();
    filteredRows = rows.filter(r => String(r[idColumns[0]] || '').trim().toLowerCase() === searchVal);
  }

  filteredRows.forEach((r) => {
    valueColumns.forEach(vCol => {
      const newRow: DataRow = {
        _rowIndex: result.length + 1,
      };
      idColumns.forEach(idCol => {
        newRow[idCol] = r[idCol];
      });
      newRow[attributeColName] = vCol;
      newRow[valueColName] = r[vCol];
      result.push(newRow);
    });
  });

  return result;
}
