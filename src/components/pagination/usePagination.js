import { useEffect, useState } from "react";

// Rows per page for every paginated list in the app.
export const PAGE_SIZE = 20;

// One page of `items`: the page's rows, the page count, the page shown
// (an out-of-range page — e.g. after a filter shrinks the list — is
// clamped to the last), and "21–40 of 75" style range numbers.
export function paginate(items, page, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, items.length);
  return {
    pageItems: items.slice(start, end),
    totalPages,
    page: safePage,
    from: items.length ? start + 1 : 0,
    to: end,
    total: items.length,
  };
}

// The page state for a list, for use with <Pagination>. Changing any of
// `resetOn` (the list's filters, sort…) goes back to page 1.
export function usePagination(
  items,
  { pageSize = PAGE_SIZE, resetOn = [] } = {},
) {
  const [page, setPage] = useState(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), resetOn);
  return { ...paginate(items, page, pageSize), setPage };
}
