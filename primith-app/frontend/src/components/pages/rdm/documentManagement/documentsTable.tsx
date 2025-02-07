import { useRef, useState, memo } from "react"
import { DocumentMetadata } from "@/types/document"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ChevronDown, ChevronUp, Download, File, Settings2, Upload, Trash2, MoreHorizontal } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
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
  VisibilityState
} from "@tanstack/react-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DataTablePagination } from "./dataTablePagination"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DocumentsTableProps {
  documents: DocumentMetadata[];
  onDocumentDownload: (documentId: string, fileName: string) => void;
  onDeleteDocuments?: (documentIds: string[]) => Promise<void>;
  onRenameDocument?: (documentId: string, newName: string) => Promise<void>;
  onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
  showDownloadButton?: boolean;
}

export const DocumentsTable = memo(function DocumentsTable({
  documents,
  onDocumentDownload,
  onDeleteDocuments,
  onRenameDocument,
  showDownloadButton = true,
}: DocumentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [documentToRename, setDocumentToRename] = useState<{ id: string; name: string } | null>(null)
  const [newName, setNewName] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<{ id: string; name: string } | null>(null)

  const columns: ColumnDef<DocumentMetadata>[] = [
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
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <File className="h-4 w-4 text-muted-foreground" />
          {row.getValue("name")}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "fileType",
      header: "Type",
      enableHiding: true,
    },
    {
      accessorKey: "fileSize",
      header: "Size",
      cell: ({ row }) => formatFileSize(row.getValue("fileSize")),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => `v${row.getValue("version")}`,
    },
    {
      accessorKey: "updatedAt",
      header: "Last Modified",
      cell: ({ row }) => new Date(row.getValue("updatedAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            {showDownloadButton && (
              <Button
                variant="ghost"
                className="h-8 w-8 hover:bg-accent"
                onClick={() => onDocumentDownload(row.original.id, row.original.name)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const baseName = row.original.name.split(".")[0]
                    setDocumentToRename({
                      id: row.original.id,
                      name: row.original.name,
                    })
                    setNewName(baseName)
                    setShowRenameDialog(true)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    // Instead of window.confirm, open the ShadCN confirmation dialog.
                    setDocumentToDelete({
                      id: row.original.id,
                      name: row.original.name,
                    })
                    setShowDeleteDialog(true)
                  }}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableHiding: true,
    },
  ]

  const TableRowWithContext = memo(function TableRowWithContext({
    row,
    children,
  }: {
    row: any
    children: React.ReactNode
  }) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <TableRow className="cursor-pointer">{children}</TableRow>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              const baseName = row.original.name.split(".")[0]
              setDocumentToRename({
                id: row.original.id,
                name: row.original.name,
              })
              setNewName(baseName)
              setShowRenameDialog(true)
            }}
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              // Instead of window.confirm, open the confirmation dialog.
              setDocumentToDelete({
                id: row.original.id,
                name: row.original.name,
              })
              setShowDeleteDialog(true)
            }}
            className="text-destructive"
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  })

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
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
    },
  })

  const selectedDocumentIds = Object.keys(rowSelection)
    .filter((index) => rowSelection[index])
    .map((index) => documents[parseInt(index)].id)

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

  const handleRename = (id: string, newBaseName: string, originalName: string) => {
    const ext = originalName.split(".").pop() || ""
    const finalName = `${newBaseName}.${ext}`

    if (onRenameDocument) {
      onRenameDocument(id, finalName)
        .then(() => {
          setShowRenameDialog(false)
          setDocumentToRename(null)
          setNewName("")
        })
        .catch((error) => {
          console.error("Failed to rename document:", error)
        })
    }
  }

  const handleDelete = () => {
    if (documentToDelete && onDeleteDocuments) {
      onDeleteDocuments([documentToDelete.id])
        .then(() => {
          setShowDeleteDialog(false)
          setDocumentToDelete(null)
        })
        .catch((error) => {
          console.error("Failed to delete document:", error)
        })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter files..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Toggle columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const friendlyName = (() => {
                    switch (column.id) {
                      case "name":
                        return "Document Name"
                      case "fileType":
                        return "Type"
                      case "fileSize":
                        return "Size"
                      case "version":
                        return "Version"
                      case "updatedAt":
                        return "Last Modified"
                      case "actions":
                        return "Actions"
                      default:
                        return column.id
                    }
                  })()

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {friendlyName}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
          {selectedDocumentIds.length > 0 && onDeleteDocuments && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="border border-gray-300"
                  variant="ghost"
                  onClick={() => onDeleteDocuments(selectedDocumentIds)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete selected items</TooltipContent>
            </Tooltip>
          )}
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
                <TableRowWithContext key={row.id} row={row}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRowWithContext>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />

      {/* Rename Document Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>
              Enter a new name for the document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex items-center">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new name"
              className="rounded-r-none border-r-0"
            />
            <div className="h-10 px-3 flex items-center border rounded-r-md bg-background text-muted-foreground text-xs">
              {`.${documentToRename?.name.split(".").pop()}`}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (documentToRename && newName.trim()) {
                  handleRename(documentToRename.id, newName.trim(), documentToRename.name)
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the document{" "}
              <strong>{documentToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
