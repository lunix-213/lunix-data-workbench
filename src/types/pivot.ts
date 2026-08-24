export type AggregationFunction = 'SUM' | 'COUNT' | 'AVERAGE' | 'MIN' | 'MAX' | 'COUNT_DISTINCT';

export interface PivotConfig {
  rowField: string;
  columnField?: string;
  valueField: string;
  aggregation: AggregationFunction;
}

export interface PivotResult {
  rowKeys: string[];
  columnKeys: string[];
  matrix: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}
