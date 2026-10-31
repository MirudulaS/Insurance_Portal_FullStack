/**
 * columns: [{ key, header, render?(row), className? }]
 * rows: array of objects, each ideally with an `id`
 * onRowClick: optional (row) => void
 */
export default function DataTable({ columns, rows, onRowClick, keyField = 'id' }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60">
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-3 font-semibold text-muted">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-border last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-background/60' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle text-ink ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="divide-y divide-border md:hidden">
        {rows.map((row) => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={`space-y-1.5 p-4 ${onRowClick ? 'cursor-pointer active:bg-background/60' : ''}`}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">{col.header}</span>
                <span className="truncate text-right text-ink">{col.render ? col.render(row) : row[col.key]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
