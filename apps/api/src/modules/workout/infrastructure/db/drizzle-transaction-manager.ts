import type { TransactionManager } from "../../application/services/transaction-manager.js";
import type { RepositoryTransaction } from "../../repositories/models/persistence-context.js";
import { createRepositoryTransaction } from "./drizzle-helpers.js";

export class DrizzleTransactionManager implements TransactionManager {
  public constructor(private readonly db: any) {}

  public async runInTransaction<T>(operation: (tx: RepositoryTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (transaction: any) =>
      operation(createRepositoryTransaction(transaction))
    );
  }
}
