export type MultiDiffStatus = 
  | 'MATCHED_ALL'     // Exists in all tables and all compared values match 100%
  | 'MISMATCH'        // Exists in multiple tables but values differ
  | 'PARTIAL_MATCH'   // Exists in some tables (e.g. 2 of 3) without value conflict
  | 'EXCLUSIVE';      // Exists in only 1 single table

export interface ReconTargetTable {
  id: string;
  tableId: string;
  keyColumn: string;
  alias: string;
}

export interface MultiDiffRowResult {
  key: string;
  status: MultiDiffStatus;
  presentInTables: string[]; // List of table aliases where this key exists
  missingInTables: string[];  // List of table aliases where this key is absent
  tableRows: Record<string, Record<string, any> | undefined>; // [alias] -> row
  differingColumns: string[];
}

export interface MultiDiffAnalysisResult {
  targets: ReconTargetTable[];
  totalUniqueKeys: number;
  matchedAllCount: number;
  mismatchCount: number;
  partialCount: number;
  exclusiveCount: number;
  diffRows: MultiDiffRowResult[];
}
