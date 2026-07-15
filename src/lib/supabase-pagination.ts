type PageResult<T> = {
  data: T[] | null;
  error: unknown;
};

export async function fetchAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await queryPage(from, to);
    if (error) throw error;

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows;
}