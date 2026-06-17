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
import {
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
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
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
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
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="focus-ring w-full rounded-2xl border border-[#eadfda] bg-white px-4 py-3 text-base font-medium text-[#241718] placeholder:text-[#9b898a] transition-all focus:border-[#D6A13A]"
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
      <div className="overflow-hidden rounded-[28px] border border-[#eadfda] bg-white card-shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#eadfda] bg-gradient-to-r from-[#fffaf4] to-[#EFF8FE]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <React.Fragment key={headerGroup.id}>
                    {headerGroup.headers.map((header: any) => (
                      <th
                        key={header.id}
                        className="heading-font px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#7E1518]"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={cn(
                              "flex items-center gap-2",
                              header.column.getCanSort() &&
                                "cursor-pointer select-none",
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
                                  <ArrowUpIcon className="h-4 w-4 text-[#7E1518]" />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDownIcon className="h-4 w-4 text-[#7E1518]" />
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
                      "border-b border-[#eadfda]/70 transition-colors hover:bg-[#F5E7E8]/35",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: any) => (
                      <td
                        key={cell.id}
                        className="px-6 py-4 text-sm font-medium text-[#241718]"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-base font-medium text-[#6f6061]"
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
          <div className="text-sm font-medium text-[#5d4b4c]">
            Showing{" "}
            <span className="heading-font font-bold text-[#7E1518]">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{" "}
            to{" "}
            <span className="heading-font font-bold text-[#7E1518]">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}
            </span>{" "}
            of{" "}
            <span className="heading-font font-bold text-[#7E1518]">
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
              {Array.from({ length: table.getPageCount() }, (_, i) => i).map(
                (pageIndex) => {
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
                        <span key={pageIndex} className="px-2 text-[#9b898a]">
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
                        "heading-font h-8 w-8 rounded-full text-sm font-bold transition-all",
                        pageIndex === currentPage
                          ? "bg-[#7E1518] text-white"
                          : "border border-[#eadfda] bg-white text-[#7E1518] hover:bg-[#F5E7E8]",
                      )}
                    >
                      {pageIndex + 1}
                    </button>
                  );
                },
              )}
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
