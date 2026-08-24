export type TransformationActionType =
  | 'EDIT_CELL'
  | 'BULK_EDIT'
  | 'DELETE_ROWS'
  | 'ADD_ROW'
  | 'TRIM_WHITESPACE'
  | 'CHANGE_CASING'
  | 'CAST_COLUMN_TYPE'
  | 'RENAME_COLUMN'
  | 'DELETE_COLUMN'
  | 'ADD_CALCULATED_COLUMN'
  | 'SPLIT_COLUMN'
  | 'MERGE_COLUMNS'
  | 'FIND_AND_REPLACE'
  | 'FILL_DOWN'
  | 'FILL_UP'
  | 'DEDUPLICATE'
  | 'SORT';

export interface TransformationStep {
  id: string;
  tableId: string;
  actionType: TransformationActionType;
  description: string;
  timestamp: number;
  params?: Record<string, any>;
}
