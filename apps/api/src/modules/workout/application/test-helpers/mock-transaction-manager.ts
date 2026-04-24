import type { RepositoryTransaction } from "../../repositories/models/persistence-context.js";
import type { TransactionManager } from "../services/transaction-manager.js";

export class MockTransactionManager implements TransactionManager {
  public async runInTransaction<T>(operation: (tx: RepositoryTransaction) => Promise<T>): Promise<T> {
    return operation({} as RepositoryTransaction);
  }
}

