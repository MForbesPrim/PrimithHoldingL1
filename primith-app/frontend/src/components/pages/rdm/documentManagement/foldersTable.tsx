import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"
import { FolderMetadata } from "@/types/document"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowUpDown, ChevronDown, ChevronUp, Folder, FolderPlus, Settings2, Trash2, MoreHorizontal } from "lucide-react"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
import { memo } from 'react';

interface FoldersTableProps {
    folders: FolderMetadata[]
    onFolderClick: (folderId: string) => void
    onDeleteFolders: (folderIds: string[]) => void
    onCreateFolder: (parentId: string | null, name: string) => void
    onRenameFolder?: (folderId: string, newName: string) => Promise<void>
}

export const FoldersTable = memo(function FoldersTable({
    folders,
    onFolderClick,
    onDeleteFolders,
    onCreateFolder,
    onRenameFolder
}: FoldersTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "updatedAt", desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        path: false  // Hide path by default
    })
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [folderToRename, setFolderToRename] = useState<{id: string, name: string} | null>(null)
    const [newName, setNewName] = useState('')
    const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
    const [newFolderName, setNewFolderName] = useState("")

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

    const handleRenameClick = (id: string, name: string) => {
        setFolderToRename({
            id: id,
            name: name
        });
        setNewName(name);
        setShowRenameDialog(true);
    };

    const TableRowWithContext = memo(function TableRowWithContext({ 
        row,
        children 
    }: { 
        row: any;
        children: React.ReactNode;
    }) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-accent">
                        {children}
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem
                        onClick={() => handleRenameClick(row.original.id, row.original.name)}
                    >
                        Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => onDeleteFolders([row.original.id])}
                        className="text-destructive"
                    >
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    });

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
                    className="flex items-center gap-2 cursor-pointer h-8"
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
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => handleRenameClick(row.original.id, row.original.name)}
                            >
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onDeleteFolders([row.original.id])}
                                className="text-destructive"
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
            enableHiding: true,
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
                        size="sm" 
                        onClick={() => setShowNewFolderDialog(true)}
                        className="flex items-center gap-2"
                    >
                        <FolderPlus className="h-4 w-4" />
                        New Folder
                    </Button>
                    {selectedFolderIds.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    className="border border-gray-300"
                                    variant="ghost"
                                    onClick={() => onDeleteFolders(selectedFolderIds)}
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
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRowWithContext>
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

            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Folder</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the folder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter new name"
                            className="w-full"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowRenameDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (folderToRename && newName.trim() && onRenameFolder) {
                                    onRenameFolder(folderToRename.id, newName.trim())
                                        .then(() => {
                                            setShowRenameDialog(false);
                                            setFolderToRename(null);
                                            setNewName('');
                                        })
                                        .catch((error) => {
                                            console.error('Failed to rename folder:', error);
                                        });
                                }
                            }}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* New Folder Dialog */}
            <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Folder</DialogTitle>
                        <DialogDescription>
                            Enter a name for the new folder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowNewFolderDialog(false)
                                setNewFolderName("")
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (newFolderName.trim()) {
                                    onCreateFolder(null, newFolderName.trim())
                                    setShowNewFolderDialog(false)
                                    setNewFolderName("")
                                }
                            }}
                        >
                            Create Folder
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
});