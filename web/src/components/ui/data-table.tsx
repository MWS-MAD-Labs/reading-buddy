"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpIcon, ArrowDownIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { Button } from "./button";
import { cn } from "@/lib/cn";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  showPagination?: boolean;
  showColumnVisibility?: boolean;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  pageSize = 10,
  showPagination = true,
  showColumnVisibility = false,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and filters */}
      {searchKey && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="w-full rounded-2xl border-4 border-purple-200 bg-white px-4 py-3 text-base font-semibold text-indigo-900 placeholder-indigo-400 shadow-[0_8px_16px_rgba(139,92,246,0.1)] transition-all focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-200"
            />
          </div>
          {showColumnVisibility && (
            <Button variant="outline" size="md" className="gap-2">
              <FunnelIcon className="h-4 w-4" />
              Columns
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[28px] border-4 border-purple-200 bg-white shadow-[0_12px_28px_rgba(139,92,246,0.15)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-4 border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <React.Fragment key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-indigo-600"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              "flex items-center gap-2",
                              header.column.getCanSort() && "cursor-pointer select-none",
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getCanSort() && (
                              <span className="ml-1">
                                {header.column.getIsSorted() === "asc" ? (
                                  <ArrowUpIcon className="h-4 w-4 text-purple-600" />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDownIcon className="h-4 w-4 text-purple-600" />
                                ) : (
                                  <div className="h-4 w-4 opacity-30">
                                    <ArrowUpIcon className="h-3 w-3" />
                                  </div>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row: any) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b-2 border-purple-50 transition-colors hover:bg-purple-50/50",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 text-sm font-semibold text-indigo-900"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-base font-semibold text-indigo-400"
                  >
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm font-semibold text-indigo-600">
            Showing{" "}
            <span className="font-black text-purple-600">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-black text-purple-600">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}
            </span>{" "}
            of{" "}
            <span className="font-black text-purple-600">
              {table.getFilteredRowModel().rows.length}
            </span>{" "}
            results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: table.getPageCount() }, (_, i) => i).map((pageIndex) => {
                // Show first page, last page, current page, and pages around current
                const currentPage = table.getState().pagination.pageIndex;
                const shouldShow =
                  pageIndex === 0 ||
                  pageIndex === table.getPageCount() - 1 ||
                  Math.abs(pageIndex - currentPage) <= 1;

                if (!shouldShow) {
                  // Show ellipsis for skipped pages
                  if (
                    pageIndex === currentPage - 2 ||
                    pageIndex === currentPage + 2
                  ) {
                    return (
                      <span key={pageIndex} className="px-2 text-indigo-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={pageIndex}
                    onClick={() => table.setPageIndex(pageIndex)}
                    className={cn(
                      "h-8 w-8 rounded-xl text-sm font-black transition-all",
                      pageIndex === currentPage
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "border-2 border-purple-200 bg-white text-purple-600 hover:border-purple-400 hover:bg-purple-50",
                    )}
                  >
                    {pageIndex + 1}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to create sortable columns
export function createSortableColumn<TData, TValue>(
  accessorKey: string,
  header: string,
): ColumnDef<TData, TValue> {
  return {
    accessorKey,
    header,
    enableSorting: true,
  };
}

// Export types for easier usage
export type { ColumnDef, Row } from "@tanstack/react-table";
