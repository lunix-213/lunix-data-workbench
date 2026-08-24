import alasql from 'alasql';
import { DataTable } from '../types/dataset';
import { QueryResult } from '../types/query';

/**
 * Sanitize SQL table name to be safe for alasql
 */
export function sanitizeTableName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Execute SQL Query across all loaded in-memory tables.
 */
export function executeSqlQuery(sql: string, tables: DataTable[]): QueryResult {
  const startTime = performance.now();

  try {
    // 1. Ensure lunix_db database exists without re-creating
    if (!alasql.databases['lunix_db']) {
      alasql('CREATE DATABASE lunix_db');
    }
    alasql('USE lunix_db');

    // 2. Register each DataTable as a table in alasql
    tables.forEach(table => {
      const safeName = sanitizeTableName(table.name);
      // Clean rows to remove undefined and ensure correct key-values
      const cleanRows = table.rows.map(r => {
        const rowCopy: Record<string, any> = {};
        table.columns.forEach(col => {
          rowCopy[col.name] = r[col.name] !== undefined ? r[col.name] : null;
        });
        return rowCopy;
      });

      // Register or update data directly in alasql database
      if (!alasql.databases.lunix_db.tables[safeName]) {
        alasql(`DROP TABLE IF EXISTS \`${safeName}\``);
        alasql(`CREATE TABLE \`${safeName}\``);
      }
      alasql.databases.lunix_db.tables[safeName].data = cleanRows;
    });

    // Clean user SQL: remove trailing semicolon if multiple or whitespace
    const cleanSql = sql.trim();

    // 3. Execute the user's SQL query
    const rawResult = alasql(cleanSql);
    const endTime = performance.now();

    if (!Array.isArray(rawResult)) {
      return {
        columns: ['Result'],
        rows: [{ Result: typeof rawResult === 'object' ? JSON.stringify(rawResult) : String(rawResult) }],
        executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
        totalRows: 1,
      };
    }

    if (rawResult.length === 0) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
        totalRows: 0,
      };
    }

    // Extract columns from the first rows
    const columnsSet = new Set<string>();
    rawResult.slice(0, 100).forEach(row => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(k => columnsSet.add(k));
      }
    });

    const columns = Array.from(columnsSet);
    const rowsWithIndex = rawResult.map((row, idx) => ({
      _rowIndex: idx + 1,
      ...(typeof row === 'object' && row !== null ? row : { value: row })
    }));

    return {
      columns,
      rows: rowsWithIndex,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      totalRows: rawResult.length,
    };
  } catch (err: any) {
    const endTime = performance.now();
    return {
      columns: [],
      rows: [],
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
      totalRows: 0,
      error: err?.message || 'SQL Execution Error',
    };
  }
}
