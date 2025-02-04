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
  import { DocumentMetadata } from '@/types/document'
  import { DataTablePagination } from "./dataTablePagination"
  import { File, ArrowUpDown, ChevronUp, ChevronDown, FolderPlus, Upload } from "lucide-react"
  
  interface DocumentsTableProps {
    documents: DocumentMetadata[];
    onDocumentDownload: (documentId: string, fileName: string) => void;
    onDeleteDocuments?: (documentIds: string[]) => void;
    showDownloadButton?: boolean;
  }
  
  export function DashboardTable({ 
    documents, 
    onDocumentDownload,
    onDeleteDocuments, 
    showDownloadButton = true
  }: DocumentsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  
    function formatFileSize(bytes: number): string {
      const units = ["B", "KB", "MB", "GB"]
      let size = bytes
      let unitIndex = 0
   
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }
      return `${size.toFixed(1)} ${units[unitIndex]}`
    }
  
    const columns: ColumnDef<DocumentMetadata>[] = [
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
        header: "Name",
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <File className="text-muted-foreground" size={16} />
              {row.getValue("name")}
            </div>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: "fileType",
        header: "Type",
        enableSorting: true,
      },
      {
        accessorKey: "fileSize",
        header: "Size",
        cell: ({ row }) => formatFileSize(row.getValue("fileSize")),
        enableSorting: true,
      },
      {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => `v${row.getValue("version")}`,
        enableSorting: true,
      },
      {
        accessorKey: "updatedAt",
        header: "Last Modified",
        cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
        enableSorting: true,
      },
      {
        id: "actions",
        cell: ({ row }) => {
          if (!showDownloadButton) return null;
          return (
            <Button
              variant="ghost"
              onClick={() => onDocumentDownload(row.original.id, row.original.name)}
            >
              Download
            </Button>
          );
        },
      },
    ];
  
    const table = useReactTable({
      data: documents,
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
  
    const selectedDocumentIds = Object.keys(rowSelection)
      .filter(index => rowSelection[index])
      .map(index => documents[parseInt(index)].id)
  
      return (
        <div>
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search..."
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
              <Button 
                size="sm" 
                onClick={() => {
                  // Similar to New Folder, this should trigger file upload functionality
                  console.log("Upload Document button clicked");
                }}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>
          {selectedDocumentIds.length > 0 && onDeleteDocuments && (
            <div className="flex justify-end pb-4">
              <Button
                variant="destructive"
                onClick={() => onDeleteDocuments(selectedDocumentIds)}
              >
                Delete Selected ({selectedDocumentIds.length})
              </Button>
            </div>
          )}
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
                    className="hover:bg-accent"
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