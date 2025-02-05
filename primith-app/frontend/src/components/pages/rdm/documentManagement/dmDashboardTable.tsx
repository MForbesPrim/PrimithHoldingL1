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
  import { useEffect, useMemo, useState } from "react"
  import { DocumentMetadata, FolderMetadata, TableItem  } from "@/types/document"
  import { DataTablePagination } from "./dataTablePagination"
  import { File, ArrowUpDown, ChevronUp, ChevronDown, FolderPlus, Upload, Folder, Settings2 } from "lucide-react"
  import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"

  interface DocumentsTableProps {
    documents: DocumentMetadata[];
    folders: FolderMetadata[];
    onDocumentDownload: (documentId: string, fileName: string) => void;
    onDeleteDocuments?: (documentIds: string[]) => void;
    onDeleteFolders?: (folderIds: string[]) => void;
    onFolderClick: (folderId: string) => void;
    showDownloadButton?: boolean;
    onCreateFolder: () => void;
  }
  
  export function DashboardTable({ 
    documents, 
    folders,
    onDocumentDownload,
    onDeleteDocuments,
    onDeleteFolders,
    onFolderClick,
    showDownloadButton = true,
    onCreateFolder 
  }: DocumentsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

    const items = useMemo(() => [
        ...folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          type: 'folder' as const,
          fileCount: folder.fileCount,
          updatedAt: folder.updatedAt,
          lastUpdatedBy: folder.lastUpdatedBy
        })),
        ...documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: 'document' as const,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          version: doc.version,
          updatedAt: doc.updatedAt.toISOString(),
        }))
      ] as TableItem[], [folders, documents])

      useEffect(() => {
        setRowSelection({})
      }, [items])
  
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
  
    const columns: ColumnDef<TableItem>[] = [
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
            enableHiding: false,
          },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => {
              const isFolder = row.original.type === 'folder'
              return (
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // Add this
                    if (isFolder) {
                      onFolderClick(row.original.id);
                    }
                  }}
                >
                  {isFolder ? (
                    <Folder className="text-muted-foreground" size={16} />
                  ) : (
                    <File className="text-muted-foreground" size={16} />
                  )}
                  {row.getValue("name")}
                </div>
              )
            },
            enableSorting: true,
            enableHiding: false,
          },
        {
          accessorKey: "type",
          header: "Type",
          cell: ({ row }) => row.original.type === 'folder' ? 'Folder' : row.original.fileType,
          enableSorting: true,
        },
        {
          accessorKey: "size",
          header: "Size",
          cell: ({ row }) => {
            if (row.original.type === 'folder') {
              return `${row.original.fileCount} items`
            }
            return formatFileSize(row.getValue("size"))
          },
          enableSorting: true,
          enableHiding: true,
        },
        {
          accessorKey: "version",
          header: "Version",
          cell: ({ row }) => row.original.type === 'folder' ? '-' : `v${row.getValue("version")}`,
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
              // Only show the download button if the row represents a document.
              if (!showDownloadButton || row.original.type === 'folder') return null;
              return (
                <Button
                  variant="ghost"
                  className="p-0 h-2"
                  onClick={() => onDocumentDownload(row.original.id, row.original.name)}
                >
                  Download
                </Button>
              );
            },
          },
    ];
  
    const table = useReactTable<TableItem>({ 
        data: items,
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

      const selectedItems = useMemo(() => {
        return Object.keys(rowSelection)
          .filter(index => rowSelection[index])
          .map(index => items[parseInt(index)])
      }, [rowSelection, items])
      
      const selectedDocuments = useMemo(() => 
        selectedItems
          .filter(item => item.type === 'document')
          .map(item => item.id)
      , [selectedItems])
      
      const selectedFolders = useMemo(() => 
        selectedItems
          .filter(item => item.type === 'folder')
          .map(item => item.id)
      , [selectedItems])
  
  
      return (
        <div>
            <div className="flex items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                <Input
                    placeholder="Search Name..."
                    value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm text-xs"
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
                        .filter(column => column.getCanHide())
                        .map(column => {
                        // Get friendly name for the column
                        const friendlyName = (() => {
                            switch (column.id) {
                            case "name":
                                return "Name"
                            case "type":
                                return "Type"
                            case "size":
                                return "Size"
                            case "version":
                                return "Version"
                            case "updatedAt":
                                return "Last Modified"
                            case "lastUpdatedBy":
                                return "Last Updated By"
                            case "fileCount":
                                return "File Count"
                            default:
                                return column.id
                            }
                        })()

                        return (
                            <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) =>
                                column.toggleVisibility(!!value)
                            }
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
                    onClick={onCreateFolder}
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
                    {(selectedDocuments.length > 0 || selectedFolders.length > 0) && (
                    <div className="flex">
                    {selectedDocuments.length > 0 && onDeleteDocuments && (
                        <Button
                        size="sm" 
                        variant="destructive"
                        onClick={() => onDeleteDocuments(selectedDocuments)}
                        >
                        Delete Selected Documents ({selectedDocuments.length})
                        </Button>
                    )}
                    {selectedFolders.length > 0 && onDeleteFolders && (
                        <Button
                        size="sm" 
                        variant="destructive"
                        onClick={() => onDeleteFolders(selectedFolders)}
                        >
                        Delete Selected Folders ({selectedFolders.length})
                        </Button>
                    )}
                    </div>
                    )}
                </div>
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
