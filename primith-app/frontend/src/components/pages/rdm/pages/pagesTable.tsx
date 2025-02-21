import { useMemo, useState } from 'react';
import {
  FileText,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Folder,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { PageNode, FolderNode } from '@/types/pages';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PagesTableProps {
  pages: PageNode[];
  folders: FolderNode[];
  onPageClick: (pageId: string) => void;
  onCreatePage: (parentId: string | null, title: string) => void;
  onDeletePage: (id: string) => Promise<void>;
  onRenamePage: (id: string, title: string) => void;
  onFolderClick: (id: string) => void;
  onCreateFolder: (organizationId?: string) => void;
  onDeleteFolder: (id: string) => Promise<void>;
  onRenameFolder: (id: string, title: string) => void;
  currentFolderId: string | null;
}

type CombinedNode = {
  id: string;
  parentId: string | null;
  title: string;
  type: 'page' | 'folder';
  createdBy: string;
  updatedAt: string;
  children: CombinedNode[];
  organizationId?: string;
  hasChildren: boolean;
};

function buildCombinedTree(pages: PageNode[], folders: FolderNode[]): CombinedNode[] {
  const nodesMap = new Map<string, CombinedNode>();

  // Add folders
  folders.forEach(folder => {
    nodesMap.set(folder.id, {
      id: folder.id,
      parentId: folder.parentId || null,
      title: folder.name,
      type: 'folder',
      createdBy: folder.createdBy,
      updatedAt: folder.updatedAt,
      children: [],
      organizationId: folder.organizationId,
      hasChildren: false,
    });
  });

  // Add pages
  pages.forEach(page => {
    nodesMap.set(page.id, {
      id: page.id,
      parentId: page.folderId || page.parentId || null,
      title: page.title,
      type: 'page',
      createdBy: page.createdBy,
      updatedAt: page.updatedAt,
      children: [],
      organizationId: page.organizationId,
      hasChildren: false,
    });
  });

  // Build tree and determine hasChildren
  const roots: CombinedNode[] = [];
  nodesMap.forEach((node) => {
    if (node.parentId) {
      const parent = nodesMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
        parent.hasChildren = true;
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function findNodeById(nodes: CombinedNode[], id: string): CombinedNode | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function flattenTree(
  nodes: CombinedNode[],
  expanded: Set<string>,
  depth = 0
): (CombinedNode & { depth: number })[] {
  let result: (CombinedNode & { depth: number })[] = [];
  nodes.forEach((node) => {
    result.push({ ...node, depth });
    if (expanded.has(node.id) && node.hasChildren) {
      result = result.concat(flattenTree(node.children, expanded, depth + 1));
    }
  });
  return result;
}

export function PagesTable({
  pages,
  folders,
  onPageClick,
  onCreatePage,
  onDeletePage,
  onRenamePage,
  onFolderClick,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  currentFolderId,
}: PagesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isTargetFolder, setIsTargetFolder] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const tree = useMemo(() => buildCombinedTree(pages, folders), [pages, folders]);
  const currentNodes = useMemo(() => {
    if (!currentFolderId) {
      return tree; // Show root nodes when no folder is selected
    }
    const currentFolder = findNodeById(tree, currentFolderId);
    return currentFolder ? currentFolder.children : [];
  }, [tree, currentFolderId]);
  const flatData = useMemo(() => flattenTree(currentNodes, expandedRows), [currentNodes, expandedRows]);

  const columns: ColumnDef<CombinedNode & { depth: number }>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const node = row.original;
          const isExpanded = expandedRows.has(node.id);

          return (
            <div className="flex items-center" style={{ paddingLeft: `${node.depth * 20}px` }}>
              {node.hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-4 w-4 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedRows(prev => {
                      const next = new Set(prev);
                      if (next.has(node.id)) {
                        next.delete(node.id);
                      } else {
                        next.add(node.id);
                      }
                      return next;
                    });
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              {node.type === 'folder' ? (
                <Folder className="h-4 w-4 mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              <div
                className="cursor-pointer"
                onClick={() => {
                  if (node.type === 'folder') {
                    onFolderClick(node.id);
                  } else {
                    onPageClick(node.id);
                  }
                }}
              >
                {node.title}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdBy',
        header: 'Created By',
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Modified',
        cell: ({ row }) => {
          const date = row.getValue('updatedAt');
          return date ? new Date(date as string).toLocaleDateString() : '';
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const node = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
              {node.type === 'folder' ? (
                <>
                    <DropdownMenuItem onClick={() => {
                    setTimeout(() => {
                        onCreateFolder(node.id);
                    }, 0);
                    }}>
                    <Folder className="h-4 w-4 mr-2" /> 
                    New Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    setTimeout(() => {
                        onCreatePage(node.id, 'New Page');
                    }, 0);
                    }}>
                    <Plus className="h-4 w-4 mr-2" />      
                    New Subpage
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setRenameTargetId(node.id);
                        setNewName(node.title);
                        setIsTargetFolder(true);
                        setIsRenameDialogOpen(true);
                        }, 0);
                    }}
                    >
                    <Pencil className="h-4 w-4 mr-2" />    
                    Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setDeleteTargetId(node.id);
                        setIsTargetFolder(node.type === 'folder');
                        setIsDeleteDialogOpen(true);
                        }, 0);
                    }}
                    className="text-red-600"
                    >
                    <Trash2 className="h-4 w-4 mr-2" />    
                    Delete
                    </DropdownMenuItem>
                </>
                ) : (
                <>
                    <DropdownMenuItem onClick={() => {
                    setTimeout(() => {
                        onCreateFolder(node.id);
                    }, 0);
                    }}>
                    Create Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                    setTimeout(() => {
                        onCreatePage(node.id, 'New Page');
                    }, 0);
                    }}>
                    Create Subpage
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setRenameTargetId(node.id);
                        setNewName(node.title);
                        setIsTargetFolder(false);
                        setIsRenameDialogOpen(true);
                        }, 0);
                    }}
                    >
                    Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setDeleteTargetId(node.id);
                        setIsTargetFolder(false);
                        setIsDeleteDialogOpen(true);
                        }, 0);
                    }}
                    className="text-red-600"
                    >
                    Delete
                    </DropdownMenuItem>
                </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [expandedRows, onPageClick, onFolderClick, onCreateFolder, onCreatePage]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  const handleRenameDialogOpenChange = (open: boolean) => {
    setIsRenameDialogOpen(open);
    if (!open) {
      setRenameTargetId(null);
      setNewName('');
      setIsTargetFolder(false);
    }
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setTimeout(() => {
      setIsDeleteDialogOpen(open);
      if (!open) {
        setDeleteTargetId(null);
        setDeleteError(null);
      }
    }, 0);
  };

  const handleRename = () => {
    if (!renameTargetId || !newName.trim()) return;
    if (isTargetFolder) {
      onRenameFolder(renameTargetId, newName.trim());
    } else {
      onRenamePage(renameTargetId, newName.trim());
    }
    handleRenameDialogOpenChange(false);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      if (isTargetFolder) {
        await onDeleteFolder(deleteTargetId);
      } else {
        await onDeletePage(deleteTargetId);
      }
      handleDeleteDialogOpenChange(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No items found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {isTargetFolder ? 'Folder' : 'Page'}</DialogTitle>
            <DialogDescription>
              Enter a new name for the {isTargetFolder ? 'folder' : 'page'}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Enter ${isTargetFolder ? 'folder' : 'page'} name`}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {isTargetFolder ? 'folder' : 'page'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <div className="text-red-500 text-sm">{deleteError}</div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDeleteDialogOpenChange(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}