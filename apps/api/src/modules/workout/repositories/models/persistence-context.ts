export type RepositoryTransaction = {
  readonly __repositoryTransaction: unique symbol;
};

export type RepositoryOptions = {
  tx?: RepositoryTransaction;
};

