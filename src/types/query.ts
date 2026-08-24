export interface QueryResult {
  columns: string[];
  rows: any[];
  executionTimeMs: number;
  totalRows: number;
  error?: string;
}

export type FilterOperator = 
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_EQUAL'
  | 'LESS_EQUAL'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY'
  | 'REGEX';

export interface VisualFilterRule {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string;
  caseSensitive?: boolean;
}

export interface VisualFilterGroup {
  conjunction: 'AND' | 'OR';
  rules: VisualFilterRule[];
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  description?: string;
  createdAt: number;
}
