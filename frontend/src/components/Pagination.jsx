export default function Pagination({ data, onPage }) {
  if (!data || data.totalPages <= 1) {
    return data ? <div className="px-3 py-2 text-muted small">{data.totalCount} record{data.totalCount === 1 ? "" : "s"}</div> : null;
  }
  const { page, totalPages, totalCount, pageSize } = data;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top">
      <span className="text-muted small">Showing {from}–{to} of {totalCount}</span>
      <div className="btn-group btn-group-sm">
        <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <i className="bi bi-chevron-left" /> Previous
        </button>
        <button className="btn btn-outline-secondary" disabled>{page} / {totalPages}</button>
        <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next <i className="bi bi-chevron-right" />
        </button>
      </div>
    </div>
  );
}
