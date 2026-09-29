/**
 * Database Interface
 * Defines the contract for database operations
 */

export interface IDatabase {
  /**
   * Execute a query (INSERT, UPDATE, DELETE)
   * @param query - SQL query string with placeholders (?)
   * @param params - Query parameters
   */
  execute(query: string, params?: any[]): Promise<void>;

  /**
   * Query data (SELECT)
   * @param query - SQL query string with placeholders (?)
   * @param params - Query parameters
   * @returns Array of results
   */
  query<T>(query: string, params?: any[]): Promise<T[]>;

  /**
   * Execute a transaction
   * @param callback - Function containing operations to execute in transaction
   */
  transaction<T>(callback: () => Promise<T>): Promise<T>;

  /**
   * Close database connection
   */
  close(): Promise<void>;
}
