import { memo, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
  type SortingFn,
  type Row,
} from "@tanstack/react-table";
import type { Finding } from "../types/api";

// ── severity badge ────────────────────────────────────────────────────────────

const severityBadge: Record<Finding["severity"], string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-green-100 text-green-700",
};

const severityOrder: Record<Finding["severity"], number> = {
  high: 0, medium: 1, low: 2,
};

// ── custom sorting function ───────────────────────────────────────────────────

const severitySortingFn: SortingFn<Finding> = (
  rowA: Row<Finding>,
  rowB: Row<Finding>,
  columnId: string,
): number => {
  const a = severityOrder[rowA.getValue<Finding["severity"]>(columnId)];
  const b = severityOrder[rowB.getValue<Finding["severity"]>(columnId)];
  return a - b;
};

// ── column helper ─────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<Finding>();

// ── component ─────────────────────────────────────────────────────────────────

interface MetricsTableProps {
  findings: Finding[];
}

const MetricsTable = memo(function MetricsTable({ findings }: MetricsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const columns = useMemo(
    () => [
      columnHelper.accessor("rank", {
        header: "#",
        cell: (info) => (
          <span className="text-gray-400 text-xs font-mono">{info.getValue()}</span>
        ),
        enableGlobalFilter: false,
      }),
      columnHelper.accessor("severity", {
        header: "Severidad",
        sortingFn: severitySortingFn,
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${severityBadge[v]}`}
            >
              {v}
            </span>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Tipo",
        cell: (info) => (
          <span className="text-xs text-gray-600 capitalize">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("metric", {
        header: "Métrica",
        cell: (info) => (
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Descripción",
        enableSorting: false,
        cell: (info) => (
          <span className="text-sm text-gray-800">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("zone", {
        header: "Zona",
        cell: (info) => {
          const v = info.getValue();
          return v ? (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
              {v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          );
        },
      }),
      columnHelper.accessor("country", {
        header: "País",
        cell: (info) => {
          const v = info.getValue();
          return v ? (
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
              {v}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          );
        },
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: findings,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      {/* Global filter */}
      <input
        type="text"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Filtrar hallazgos…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={[
                        "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap",
                        canSort ? "cursor-pointer select-none hover:text-gray-700" : "",
                      ].join(" ")}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-gray-300">
                            {sortDir === "asc"
                              ? "↑"
                              : sortDir === "desc"
                                ? "↓"
                                : "↕"}
                          </span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  Sin resultados para ese filtro.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-orange-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {table.getFilteredRowModel().rows.length} de {findings.length} hallazgos
      </p>
    </div>
  );
});

export default MetricsTable;
