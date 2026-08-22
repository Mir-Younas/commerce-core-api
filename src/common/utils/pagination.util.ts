export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function getPaginationParams(
  page?: number,
  limit?: number,
  defaultLimit = 10,
) {
  const safePage = page ?? 1;
  const safeLimit = limit ?? defaultLimit;
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}