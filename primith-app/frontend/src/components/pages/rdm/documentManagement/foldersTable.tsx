import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    SortingState,
    ColumnFiltersState,
  } from "@tanstack/react-table"
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
  import { Input } from "@/components/ui/input"
  import { useState } from "react"
  import { FolderMetadata } from '@/types/document'
  import { DataTablePagination } from "../documentManagement/dataTablePagination"
  import { Folder, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
  
  interface FoldersTableProps {
    folders: FolderMetadata[];
    onFolderClick: (folderId: string) => void;
  }
  
  export function FoldersTable({ folders, onFolderClick }: FoldersTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
    const columns: ColumnDef<FolderMetadata>[] = [
      {
        accessorKey: "name",
        header: "Folder Name",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <Folder className="text-muted-foreground" size={16} />
              {row.original.name}
            </div>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: "fileCount",
        header: "Files",
        enableSorting: true,
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ getValue }) =>
          new Date(getValue() as string).toLocaleDateString(),
        enableSorting: true,
      },
      {
        accessorKey: "lastUpdatedBy",
        header: "Last Updated By",
        enableSorting: true,
      },
    ]
  
    const table = useReactTable({
      data: folders,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      state: {
        sorting,
        columnFilters,
      },
    })
  
    return (
      <div>
        <div className="flex items-center pb-4 text-xs">
          <Input
            placeholder="Filter folders..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm text-xs"
          />
        </div>
        <div className="rounded-md border mb-4">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) return null
  
                    // Get the current sorting state for this header.
                    const sort = header.column.getIsSorted()
                    
                    return (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer select-none"
                      >
                        <div className="flex items-center">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span className="ml-2">
                            {sort === "asc" ? (
                              <ChevronUp className="h-4 w-4 text-primary" />
                            ) : sort === "desc" ? (
                              <ChevronDown className="h-4 w-4 text-primary" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                        </div>
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => onFolderClick(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </div>
    )
  }
  