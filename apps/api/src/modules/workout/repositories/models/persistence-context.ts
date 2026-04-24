export type RepositoryTransaction = {
  readonly __repositoryTransaction: "RepositoryTransaction";
  readonly context: unknown;
};

export type RepositoryOptions = {
  tx?: RepositoryTransaction;
};
