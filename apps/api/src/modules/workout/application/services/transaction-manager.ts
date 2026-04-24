import type { RepositoryTransaction } from "../../repositories/models/persistence-context.js";

export interface TransactionManager {
  runInTransaction<T>(operation: (tx: RepositoryTransaction) => Promise<T>): Promise<T>;
}

