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
    RowSelectionState,
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
  import { Button } from "@/components/ui/button"
  import { Checkbox } from "@/components/ui/checkbox"
  import { useState } from "react"
  import { FolderMetadata } from '@/types/document'
  import { DataTablePagination } from "../documentManagement/dataTablePagination"
  import { Folder, ArrowUpDown, ChevronUp, ChevronDown, FolderPlus } from "lucide-react"
  
  interface FoldersTableProps {
    folders: FolderMetadata[];
    onFolderClick: (folderId: string) => void;
    onDeleteFolders: (folderIds: string[]) => void;
  }
  
  export function FoldersTable({ folders, onFolderClick, onDeleteFolders }: FoldersTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
    const columns: ColumnDef<FolderMetadata>[] = [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
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
      onRowSelectionChange: setRowSelection,
      enableRowSelection: true,
      state: {
        sorting,
        columnFilters,
        rowSelection,
      },
    })
  
    const selectedFolderIds = Object.keys(rowSelection)
      .filter(index => rowSelection[index])
      .map(index => folders[parseInt(index)].id)
  
      return (
        <div>
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filter folders..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn("name")?.setFilterValue(event.target.value)
                }
                className="max-w-sm text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
            <Button 
                size="sm" 
                onClick={() => {
                  // Here you would need to pass the handleCreateFolder function from DocumentManagement
                  // or implement a similar function within this component if possible.
                  console.log("New Folder button clicked");
                }}
                className="flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
              </div>
                {selectedFolderIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <Button
                    variant="destructive"
                    onClick={() => onDeleteFolders(selectedFolderIds)}
                    >
                    Delete Selected ({selectedFolderIds.length})
                    </Button>
                </div>
                )}
          </div>
          <div className="rounded-md border mb-4">
            <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) return null
  
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
                          {header.column.getCanSort() && (
                            <span className="ml-2">
                              {sort === "asc" ? (
                                <ChevronUp className="h-4 w-4 text-primary" />
                              ) : sort === "desc" ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </span>
                          )}
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