export type DuplicateMatchMode = 'EXACT' | 'FUZZY';

export type DeduplicationRule = 
  | 'KEEP_FIRST'
  | 'KEEP_LAST'
  | 'KEEP_MOST_COMPLETE'
  | 'REMOVE_ALL_DUPLICATES';

export interface DuplicateCluster {
  clusterId: string;
  key: string;
  count: number;
  rowIndices: number[];
  rows: any[];
  similarityScore?: number;
}

export interface DuplicateAnalysisResult {
  totalRows: number;
  duplicateRowsCount: number;
  uniqueClustersCount: number;
  clusters: DuplicateCluster[];
  selectedColumns: string[];
  matchMode: DuplicateMatchMode;
  fuzzyThreshold: number; // 0.0 to 1.0 (e.g. 0.8 = 80%)
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
  ignoreSpecialChars: boolean;
}
