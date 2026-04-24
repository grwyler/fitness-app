export type UseCaseResult<T> = {
  data: T;
  meta: {
    replayed: boolean;
  };
};

