import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { FolderMetadata } from "@/types/document"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Folder, Plus, Settings2 } from "lucide-react"
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
  VisibilityState,
} from "@tanstack/react-table"
import { DataTablePagination } from "./dataTablePagination"

interface FoldersTableProps {
  folders: FolderMetadata[]
  onFolderClick: (folderId: string) => void
  onDeleteFolders: (folderIds: string[]) => void
  onCreateFolder: (parentId: string | null) => void 
}

export function FoldersTable({
    folders,
    onFolderClick,
    onDeleteFolders,
    onCreateFolder
  }: FoldersTableProps) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
      path: false  // Hide path by default
    })

  // Function to get folder path
  const getFullFolderPath = (folder: FolderMetadata): string => {
    const path: string[] = [folder.name]
    let currentFolder = folder
    
    while (currentFolder.parentId) {
      const parent = folders.find(f => f.id === currentFolder.parentId)
      if (parent) {
        path.unshift(parent.name)
        currentFolder = parent
      } else {
        break
      }
    }
    
    return path.join(' / ')
  }

  const columns: ColumnDef<FolderMetadata>[] = [
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
        header: "Folder Name",
        cell: ({ row }) => (
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => onFolderClick(row.original.id)}
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span>{row.getValue("name")}</span>
          </div>
        ),
      },
      {
        id: "path",
        header: "Full Path",
        cell: ({ row }) => {
          const path = getFullFolderPath(row.original)
          return (
            <div className="max-w-[400px] truncate cursor-default" title={path}>
              <span className="text-xs">
                {path}
              </span>
            </div>
          )
        },
        enableHiding: true,
      },
    {
      accessorKey: "fileCount",
      header: "Files",
    },
    {
      accessorKey: "updatedAt",
      header: "Last Modified",
      cell: ({ row }) => new Date(row.getValue("updatedAt")).toLocaleDateString(),
    },
    {
      accessorKey: "lastUpdatedBy",
      header: "Last Updated By",
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
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
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
                onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
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
                        .filter(column => column.getCanHide())
                        .map(column => {
                        const friendlyName = (() => {
                            switch (column.id) {
                            case "name":
                                return "Folder Name"
                            case "path":
                                return "Full Path"
                            case "fileCount":
                                return "Files"
                            case "updatedAt":
                                return "Last Modified"
                            case "lastUpdatedBy":
                                return "Last Updated By"
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
            onClick={() => onCreateFolder(null)}  // Add New Folder button
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
          {selectedFolderIds.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => onDeleteFolders(selectedFolderIds)}
            >
              Delete Selected ({selectedFolderIds.length})
            </Button>
          )}
          </div>
      </div>

      <div className="rounded-md border mb-4">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
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
                  No folders found.
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