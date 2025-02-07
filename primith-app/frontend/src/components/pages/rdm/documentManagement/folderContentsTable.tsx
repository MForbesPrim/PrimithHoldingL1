import { memo, useMemo, useRef, useState } from "react"
import { DocumentMetadata, FolderMetadata } from "@/types/document"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ChevronDown, ChevronUp, Download, File, Folder, Upload, Plus } from "lucide-react"
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
  RowSelectionState
} from "@tanstack/react-table"
import { DataTablePagination } from "./dataTablePagination"

interface FolderContentsTableProps {
  documents: DocumentMetadata[];
  folders: FolderMetadata[];
  onDocumentDownload: (documentId: string, fileName: string) => void;
  onFolderClick: (folderId: string) => void;
  onCreateFolder: () => void;
  onFileUpload: (file: File) => Promise<void>;
  onDeleteItems?: (itemIds: string[], type: 'folder' | 'document') => Promise<void>;
}

export const FolderContentsTable = memo(function FolderContentsTable({
  documents,
  folders,
  onDocumentDownload,
  onFolderClick,
  onCreateFolder,
  onFileUpload
}: FolderContentsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "updatedAt", desc: true }
        ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

  // Memoize the combined data
  const items = useMemo(() => [...folders, ...documents], [folders, documents]);

  // Memoize the columns definition
  const columns = useMemo<ColumnDef<DocumentMetadata | FolderMetadata>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const isFolder = 'parentId' in row.original;
        return (
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => isFolder ? onFolderClick(row.original.id) : null}
          >
            {isFolder ? 
              <Folder className="h-4 w-4 text-muted-foreground" /> : 
              <File className="h-4 w-4 text-muted-foreground" />
            }
            {row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Modified",
      cell: ({ row }) => new Date(row.getValue("updatedAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isFolder = 'parentId' in row.original;
        if (!isFolder) {
          return (
            <Button
              variant="ghost"
              className="h-8 w-8 hover:bg-accent"
              onClick={() => onDocumentDownload(row.original.id, row.original.name)}
            >
              <Download className="h-4 w-4" />
            </Button>
          );
        }
        return null;
      },
    },
  ], [onFolderClick, onDocumentDownload]);

  // Memoize the table instance
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  // Memoize the file upload handler
  const handleFileUpload = useMemo(() => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }, [onFileUpload]);

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Filter contents..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onCreateFolder} className="flex items-center gap-2">
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="rounded-md border mb-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="cursor-pointer"
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="ml-2">
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  No contents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
})