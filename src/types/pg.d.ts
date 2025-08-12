
declare module 'pg' {
  import { ConnectionConfig, ClientConfig, QueryResult, PoolClient, PoolConfig } from 'pg';

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<PoolClient>;
    query<T extends any[]>(queryText: string, values: T): Promise<QueryResult>;
    query(queryText: string): Promise<QueryResult>;
    end(): Promise<void>;
  }

  export { PoolClient };
}
