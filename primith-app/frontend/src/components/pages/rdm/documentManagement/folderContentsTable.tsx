import { memo, useMemo, useRef, useState } from "react"
import { DocumentMetadata, FolderMetadata } from "@/types/document"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, ChevronDown, ChevronUp, Download, File, Folder, Upload, Plus, MoreHorizontal } from "lucide-react"
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
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
 onRenameDocument?: (documentId: string, newName: string) => Promise<void>;
 onRenameFolder?: (folderId: string, newName: string) => Promise<void>;
}

export const FolderContentsTable = memo(function FolderContentsTable({
 documents,
 folders,
 onDocumentDownload,
 onFolderClick,
 onCreateFolder,
 onFileUpload,
 onDeleteItems,
 onRenameDocument,
 onRenameFolder
}: FolderContentsTableProps) {
   const [sorting, setSorting] = useState<SortingState>([
       { id: "updatedAt", desc: true }
   ])
   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
   const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
   const fileInputRef = useRef<HTMLInputElement>(null)
   const [showRenameDialog, setShowRenameDialog] = useState(false)
   const [itemToRename, setItemToRename] = useState<{id: string, name: string, type: 'document' | 'folder'} | null>(null)
   const [newName, setNewName] = useState('')

   const items = useMemo(() => [
       ...folders.map(folder => ({
           ...folder,
           type: 'folder' as const
       })),
       ...documents.map(doc => ({
           ...doc,
           type: 'document' as const
       }))
   ], [folders, documents]);

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

   const handleRenameClick = (id: string, name: string, type: 'document' | 'folder') => {
       const baseName = type === 'document' ? name.split('.')[0] : name;
       setItemToRename({
           id,
           name,
           type
       });
       setNewName(baseName);
       setShowRenameDialog(true);
   };

   const TableRowWithContext = memo(function TableRowWithContext({ 
       row,
       children 
   }: { 
       row: any;
       children: React.ReactNode;
   }) {
       const item = row.original;
       return (
           <ContextMenu>
               <ContextMenuTrigger asChild>
                   <TableRow className="cursor-pointer">
                       {children}
                   </TableRow>
               </ContextMenuTrigger>
               <ContextMenuContent>
                   <ContextMenuItem
                       onClick={() => handleRenameClick(item.id, item.name, item.type)}
                   >
                       Rename
                   </ContextMenuItem>
                   <ContextMenuItem
                       onClick={() => onDeleteItems?.([item.id], item.type)}
                       className="text-destructive"
                   >
                       Delete
                   </ContextMenuItem>
               </ContextMenuContent>
           </ContextMenu>
       );
   });

   const columns = useMemo<ColumnDef<(DocumentMetadata | FolderMetadata) & { type: 'document' | 'folder' }>[]>(() => [
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
               const item = row.original;
               return (
                   <div 
                       className="flex items-center gap-2 cursor-pointer"
                       onClick={() => item.type === 'folder' ? onFolderClick(item.id) : null}
                   >
                       {item.type === 'folder' ? 
                           <Folder className="h-4 w-4 text-muted-foreground" /> : 
                           <File className="h-4 w-4 text-muted-foreground" />
                       }
                       {item.name}
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
               const item = row.original;
               return (
                   <div className="flex items-center gap-2">
                       {item.type === 'document' && (
                           <Button
                               variant="ghost"
                               className="h-8 w-8 hover:bg-accent"
                               onClick={() => onDocumentDownload(item.id, item.name)}
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
                                   onClick={() => handleRenameClick(item.id, item.name, item.type)}
                               >
                                   Rename
                               </DropdownMenuItem>
                               <DropdownMenuItem
                                   onClick={() => onDeleteItems?.([item.id], item.type)}
                                   className="text-destructive"
                               >
                                   Delete
                               </DropdownMenuItem>
                           </DropdownMenuContent>
                       </DropdownMenu>
                   </div>
               );
           },
       },
   ], [onFolderClick, onDocumentDownload, onDeleteItems]);

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
                                   No contents found.
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
})