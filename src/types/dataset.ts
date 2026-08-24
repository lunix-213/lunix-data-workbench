export type ColumnType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'CURRENCY';

export interface ColumnSchema {
  name: string;
  originalName: string;
  type: ColumnType;
  inferredType: ColumnType;
  isCustom?: boolean;
  sampleValues?: (string | number | boolean | null)[];
  nullCount?: number;
  uniqueCount?: number;
}

export type DataRow = Record<string, any>;

export interface DataTable {
  id: string;
  name: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  columns: ColumnSchema[];
  rows: DataRow[];
  totalRows: number;
  createdAt: number;
  updatedAt: number;
  memorySizeBytes?: number;
}

export interface FileImportPreview {
  fileId: string;
  fileName: string;
  sheetName: string;
  rawRows: any[][];
  headerRowIndex: number;
  inferredColumns: ColumnSchema[];
  selectedColumns: ColumnSchema[];
  totalRawRows: number;
}

export interface JoinConfig {
  leftTableId: string;
  rightTableId: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  leftKey: string;
  rightKey: string;
  resultTableName: string;
}

export interface AppendConfig {
  targetTableId?: string;
  tableIdsToAppend: string[];
  newTableName: string;
  addSourceFileColumn: boolean;
}
