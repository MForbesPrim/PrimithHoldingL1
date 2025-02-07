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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useEffect, useMemo, useState, useRef } from "react"
import { DocumentMetadata, FolderMetadata, TableItem } from "@/types/document"
import { DataTablePagination } from "./dataTablePagination"
import { File, ArrowUpDown, ChevronUp, ChevronDown, FolderPlus, Upload, Folder, Settings2, Download, Trash2, MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { memo } from 'react';

interface DocumentsTableProps {
    documents: DocumentMetadata[];
    folders: FolderMetadata[];
    onDocumentDownload: (documentId: string, fileName: string) => void;
    onDeleteDocuments?: (documentIds: string[]) => Promise<void>;
    onDeleteFolders?: (folderIds: string[]) => Promise<void>;
    onFolderClick: (folderId: string) => void;
    showDownloadButton?: boolean;
    onCreateFolder: () => void;
    onFileUpload?: (file: File) => Promise<void>;
    onRenameDocument?: (documentId: string, newName: string) => Promise<void>;
    onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
}

export const DashboardTable = memo(function DashboardTable({
    documents,
    folders,
    onDocumentDownload,
    onDeleteDocuments,
    onDeleteFolders,
    onFolderClick,
    showDownloadButton = true,
    onCreateFolder,
    onFileUpload,
    onRenameDocument,
    onRenameFolder,
}: DocumentsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "updatedAt", desc: true }
    ])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showRenameDialog, setShowRenameDialog] = useState(false)
    const [itemToRename, setItemToRename] = useState<{id: string, name: string, type: 'document' | 'folder'} | null>(null)
    const [newName, setNewName] = useState('')
    const [itemsToDelete, setItemsToDelete] = useState<{
        documents: string[];
        folders: string[];
    } | null>(null)

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
            updatedAt: new Date(doc.updatedAt).toISOString(),
        }))
    ] as TableItem[], [folders, documents])

    useEffect(() => {
        setRowSelection({})
    }, [items])

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        try {
            if (onFileUpload) {
                await onFileUpload(file)
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        } catch (error) {
            console.error('Upload failed:', error)
        }
    }

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

    const handleRename = (id: string, newBaseName: string, originalName: string, type: 'document' | 'folder') => {
        const ext = type === 'document' ? `.${originalName.split('.').pop()}` : '';
        const finalName = `${newBaseName}${ext}`;

        if (type === 'document' && onRenameDocument) {
            onRenameDocument(id, finalName)
                .then(() => {
                    setShowRenameDialog(false);
                    setItemToRename(null);
                    setNewName('');
                })
                .catch((error) => {
                    console.error('Failed to rename document:', error);
                });
        } else if (type === 'folder' && onRenameFolder) {
            onRenameFolder(id, finalName)
                .then(() => {
                    setShowRenameDialog(false);
                    setItemToRename(null);
                    setNewName('');
                })
                .catch((error) => {
                    console.error('Failed to rename folder:', error);
                });
        }
    };

    const handleDeleteClick = (item: TableItem) => {
        setItemsToDelete({
            documents: item.type === 'document' ? [item.id] : [],
            folders: item.type === 'folder' ? [item.id] : []
        });
        setShowDeleteDialog(true);
    };

    const TableRowWithContext = memo(function TableRowWithContext({ 
        row,
        children 
    }: { 
        row: any;
        children: React.ReactNode;
    }) {
        const handleRenameClick = () => {
            const type = row.original.type;
            const baseName = type === 'document' ? row.original.name.split('.')[0] : row.original.name;
            setItemToRename({
                id: row.original.id,
                name: row.original.name,
                type: type
            });
            setNewName(baseName);
            setShowRenameDialog(true);
        };

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow className="cursor-pointer">
                        {children}
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleRenameClick}>
                        Rename
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() => handleDeleteClick(row.original)}
                        className="text-destructive"
                    >
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    });

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
                            e.stopPropagation();
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
            enableHiding: true,
        },
        {
            accessorKey: "fileSize",
            header: "Size",
            cell: ({ row }) => {
                if (row.original.type === 'folder') {
                    return `${row.original.fileCount} items`
                }
                return formatFileSize(row.getValue("fileSize"))
            },
            enableSorting: true,
            enableHiding: true,
        },
        {
            accessorKey: "version",
            header: "Version",
            cell: ({ row }) => row.original.type === 'folder' ? '-' : `v${row.getValue("version")}`,
            enableSorting: true,
            enableHiding: true,
        },
        {
            accessorKey: "updatedAt",
            header: "Last Modified",
            cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
            enableSorting: true,
            enableHiding: true,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <div className="flex items-center gap-2">
                        {showDownloadButton && row.original.type === 'document' && (
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
                                        const type = row.original.type;
                                        const baseName = type === 'document' ? row.original.name.split('.')[0] : row.original.name;
                                        setItemToRename({
                                            id: row.original.id,
                                            name: row.original.name,
                                            type: type
                                        });
                                        setNewName(baseName);
                                        setShowRenameDialog(true);
                                    }}
                                >
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleDeleteClick(row.original)}
                                    className="text-destructive"
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
            enableHiding: true,
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
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                    />
                    <Button 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Upload Document
                    </Button>
                    {(selectedDocuments.length > 0 || selectedFolders.length > 0) && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="border border-gray-300"
                                    onClick={() => {
                                        setItemsToDelete({
                                            documents: selectedDocuments,
                                            folders: selectedFolders
                                        });
                                        setShowDeleteDialog(true);
                                    }}
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
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} />

            {showDeleteDialog && (
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete?</AlertDialogTitle>
                            <AlertDialogDescription>
                                {itemsToDelete?.folders.length ? 
                                    "This will delete the selected folders and all their contents (subfolders and files). " : ""}
                                Please confirm.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={async () => {
                                    setIsDeleting(true);
                                    try {
                                        if (itemsToDelete?.documents.length && onDeleteDocuments) {
                                            await onDeleteDocuments(itemsToDelete.documents);
                                        }
                                        if (itemsToDelete?.folders.length && onDeleteFolders) {
                                            await onDeleteFolders(itemsToDelete.folders);
                                        }
                                    } finally {
                                        setIsDeleting(false);
                                        setShowDeleteDialog(false);
                                        setRowSelection({});
                                    }
                                }}
                                disabled={isDeleting}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename {itemToRename?.type === 'document' ? 'Document' : 'Folder'}</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the {itemToRename?.type}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 flex items-center">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter new name"
                            className={itemToRename?.type === 'document' ? "rounded-r-none border-r-0" : ""}
                            autoFocus
                        />
                        {itemToRename?.type === 'document' && (
                            <div className="h-10 px-3 flex items-center border rounded-r-md bg-background text-muted-foreground text-sm">
                                {`.${itemToRename.name.split('.').pop()}`}
                            </div>
                        )}
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
                                if (itemToRename && newName.trim()) {
                                    handleRename(
                                        itemToRename.id,
                                        newName.trim(),
                                        itemToRename.name,
                                        itemToRename.type
                                    );
                                }
                            }}
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
});