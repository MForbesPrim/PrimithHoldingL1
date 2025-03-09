import { useMemo, useState } from 'react';
import {
  FileText,
  MoreHorizontal,

  Folder,
  FilePen,
  FolderPen,
  Link2,
  Plus,
  Trash2,
  Search,
  Unlink,
  ChevronsUpDown, 
  ChevronUp, 
  ChevronDown,
  ChevronRight
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

interface PagesTableProps {
  pages: PageNode[];
  folders: FolderNode[];
  onPageClick: (pageId: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onDeletePage: (id: string) => Promise<void>;
  onRenamePage: (id: string, title: string) => void;
  onFolderClick: (id: string) => void;
  onCreateFolder: (organizationId?: string, parentType?: 'pages' | 'folders') => void;
  onDeleteFolder: (id: string) => Promise<void>;
  onRenameFolder: (id: string, title: string) => void;
  currentFolderId: string | null;
  currentProjectId?: string | null;
  onAssociateWithProject?: (pageId: string) => Promise<void>;
  onUnassignFromProject?: (pageId: string) => Promise<void>;
}

type CombinedNode = {
    id: string;
    parentId: string | null;
    name: string;         // Changed from title to match backend
    type: 'page' | 'folder' | 'template' | 'system_template';  // Expanded type options
    createdBy: string;
    updatedAt: string;
    children: CombinedNode[];
    organizationId?: string;
    hasChildren: boolean;
    projectId?: string | null; // Added for project association
  };

// In PagesTable component
function buildCombinedTree(pages: PageNode[], folders: FolderNode[]): CombinedNode[] {
    const nodesMap = new Map<string, CombinedNode>();

    // Add pages to the map first
    pages.forEach(page => {
        nodesMap.set(page.id, {
            id: page.id,
            parentId: page.parentId || null,
            name: page.name,
            type: page.type,
            createdBy: page.createdBy,
            updatedAt: page.updatedAt,
            children: [],
            organizationId: page.organizationId,
            hasChildren: false,
            projectId: page.projectId || null, // Include projectId from page
        });
    });

    // Add folders and build relationships
    folders.forEach(folder => {
        nodesMap.set(folder.id, {
            id: folder.id,
            parentId: folder.parentId || null,
            name: folder.name,
            type: 'folder',
            createdBy: folder.createdBy,
            updatedAt: folder.updatedAt,
            children: [],
            organizationId: folder.organizationId,
            hasChildren: false,
            projectId: null, // Folders don't have project associations
        });
    });

    // Build the tree structure
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

function sortNodes(nodes: CombinedNode[], sortColumn: string, sortDesc: boolean): CombinedNode[] {
    return [...nodes].sort((a, b) => {
      let valA, valB;
      if (sortColumn === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortColumn === "updatedAt") {
        valA = new Date(a.updatedAt);
        valB = new Date(b.updatedAt);
      } else if (sortColumn === "createdBy") {
        valA = a.createdBy.toLowerCase();
        valB = b.createdBy.toLowerCase();
      } else {
        return 0; // No sorting if column is unrecognized
      }
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });
  }

  function flattenTree(
    nodes: CombinedNode[],
    expanded: Set<string>,
    depth = 0,
    sortColumn: string,
    sortDesc: boolean
  ): (CombinedNode & { depth: number })[] {
    let result: (CombinedNode & { depth: number })[] = [];
    const sortedNodes = sortNodes(nodes, sortColumn, sortDesc);
    sortedNodes.forEach((node) => {
      result.push({ ...node, depth });
      if (expanded.has(node.id) && node.children.length > 0) {
        result = result.concat(flattenTree(node.children, expanded, depth + 1, sortColumn, sortDesc));
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
    currentProjectId,
    onAssociateWithProject,
    onUnassignFromProject,
  }: PagesTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "updatedAt", desc: true },
      ]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [isTargetFolder, setIsTargetFolder] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState(''); 
    const [showUnassignDialog, setShowUnassignDialog] = useState(false);
    const [pageToUnassign, setPageToUnassign] = useState<string | null>(null);
    const tree = useMemo(() => buildCombinedTree(pages, folders), [pages, folders]);
    
    const currentNodes = useMemo(() => {
        if (!currentFolderId) {
        return tree; // Show root nodes when no folder is selected
        }
        const currentFolder = findNodeById(tree, currentFolderId);
        return currentFolder ? currentFolder.children : [];
    }, [tree, currentFolderId]);

    const sortColumn = sorting[0]?.id || "updatedAt"; // Default to updatedAt
    const sortDesc = sorting[0]?.desc || false; // Default to ascending
    const flatData = useMemo(() => {
    const result = flattenTree(currentNodes, expandedRows, 0, sortColumn, sortDesc);
    console.log("flatData sample:", result.slice(0, 2)); // Optional: for debugging
    return result;
    }, [currentNodes, expandedRows, sorting]);

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return flatData; // Return all if no query
        const lowercaseQuery = searchQuery.toLowerCase();
        return flatData.filter((node) => node.name.toLowerCase().includes(lowercaseQuery));
        }, [flatData, searchQuery]);
    
    const TableRowWithContext = ({ row, children }: { row: any; children: React.ReactNode }) => {
        const node = row.original;
        const handleRenameClick = () => {
            setRenameTargetId(node.id);
            setNewName(node.name);
            setIsTargetFolder(node.type === 'folder');
            setIsRenameDialogOpen(true);
        };

        const isAssignedToProject = node.type !== 'folder' && 
            currentProjectId && 
            node.projectId === currentProjectId;

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                        {children}
                    </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onClick={handleRenameClick}>
                        Rename
                    </ContextMenuItem>
                    {currentProjectId && onAssociateWithProject && node.type !== 'folder' && (
                        !isAssignedToProject ? (
                            <ContextMenuItem
                                onClick={() => onAssociateWithProject(node.id)}
                            >
                            <Link2 className="h-4 w-4 mr-2" />
                                Add to Current Project
                            </ContextMenuItem>
                        ) : (
                            onUnassignFromProject && (
                                <ContextMenuItem
                                onClick={() => {
                                    setPageToUnassign(node.id);
                                    setShowUnassignDialog(true);
                                }}
                            >
                            <Unlink className="w-4 h-4" />                 
                                Remove from Current Project
                            </ContextMenuItem>
                            )
                        )
                    )}
                    <ContextMenuItem
                        onClick={() => {
                            setDeleteTargetId(node.id);
                            setIsTargetFolder(node.type === 'folder');
                            setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600"
                    >
                        Delete
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    };

    const columns: ColumnDef<CombinedNode & { depth: number }>[] = useMemo(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: ({ column }) => (
                  <div className="flex items-center">
                    Name
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const currentSort = column.getIsSorted();
                        if (currentSort === 'asc') {
                          column.toggleSorting(true); // Switch to desc
                        } else if (currentSort === 'desc') {
                          column.clearSorting(); // Reset to unsorted
                        } else {
                          column.toggleSorting(false); // Start with asc
                        }
                      }}
                      className="ml-2 h-4 w-4 p-0"
                    >
                      {column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ),
                cell: ({ row }) => {
                    const node = row.original;
                    const isExpanded = expandedRows.has(node.id);
                    return (
                      <div className="flex items-center" style={{ paddingLeft: `${node.depth * 24}px` }}>
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
                          <div className="w-6" /> // Consistent spacing for items without children
                        )}
                        {node.type === 'folder' ? (
                          <Folder className="h-4 w-4 mr-2 fill-blue-500 stroke-blue-500 stroke-[1.5]" />
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
                          {node.name}
                        </div>
                        {node.type !== 'folder' && node.projectId === currentProjectId && (
                          <span className="ml-2 px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-sm">
                            Project
                          </span>
                        )}
                      </div>
                    );
                  },
                enableSorting: true,
              },
              {
                accessorKey: 'createdBy',
                header: ({ column }) => (
                  <div className="flex items-center">
                    Created By
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const currentSort = column.getIsSorted();
                        if (currentSort === 'asc') {
                          column.toggleSorting(true); // Switch to desc
                        } else if (currentSort === 'desc') {
                          column.clearSorting(); // Reset to unsorted
                        } else {
                          column.toggleSorting(false); // Start with asc
                        }
                      }}
                      className="ml-2 h-4 w-4 p-0"
                    >
                      {column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ),
                enableSorting: true,
              },
              {
                accessorKey: 'updatedAt',
                header: ({ column }) => (
                  <div className="flex items-center">
                    Last Modified
                    <Button
                      variant="ghost"
                      onClick={() => {
                        const currentSort = column.getIsSorted();
                        if (currentSort === 'asc') {
                          column.toggleSorting(true); // Switch to desc
                        } else if (currentSort === 'desc') {
                          column.clearSorting(); // Reset to unsorted
                        } else {
                          column.toggleSorting(false); // Start with asc
                        }
                      }}
                      className="ml-2 h-4 w-4 p-0"
                    >
                      {column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ),
                cell: ({ row }) => {
                  const date = row.getValue('updatedAt');
                  return date ? new Date(date as string).toLocaleDateString() : '';
                },
                enableSorting: true,
                sortingFn: 'datetime',
              },
      {
        id: 'actions',
        cell: ({ row }) => {
          const node = row.original;
          const isAssignedToProject = node.type !== 'folder' && 
            currentProjectId && 
            node.projectId === currentProjectId;
            
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
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => {
                          onCreateFolder(node.id, 'folders'); 
                        }, 0);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Folder className="h-4 w-4 mr-2" /> 
                      New Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => {
                          onCreatePage(node.id); // Removed 'folder'
                        }, 0);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />      
                      New Subpage
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setRenameTargetId(node.id);
                        setNewName(node.name);
                        setIsTargetFolder(true);
                        setIsRenameDialogOpen(true);
                        }, 0);
                    }}
                    >
                    <FolderPen className="h-4 w-4 mr-2" />    
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
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => {
                          onCreateFolder(node.id, node.type === 'page' ? 'pages' : 'folders');
                        }, 0);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Folder className="h-4 w-4 mr-2 fill-blue-500 stroke-blue-500 stroke-[1.5]" /> 
                      New Subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTimeout(() => {
                          onCreatePage(node.id); // Removed conditional parentType
                        }, 0);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />      
                      New Subpage
                    </DropdownMenuItem>
                    <DropdownMenuItem
                    onClick={() => {
                        setTimeout(() => {
                        setRenameTargetId(node.id);
                        setNewName(node.name);
                        setIsTargetFolder(false);
                        setIsRenameDialogOpen(true);
                        }, 0);
                    }}
                    >
                    <FilePen className="h-4 w-4 mr-2" />       
                    Rename
                    </DropdownMenuItem>
                    {currentProjectId && onAssociateWithProject && (
                      !isAssignedToProject ? (
                        <DropdownMenuItem
                          onClick={() => {
                            setTimeout(() => {
                              if (onAssociateWithProject) {
                                onAssociateWithProject(node.id);
                              }
                            }, 0);
                          }}
                        >
                        <Link2 className="h-4 w-4 mr-2" />    
                          Add to Current Project
                        </DropdownMenuItem>
                      ) : (
                        onUnassignFromProject && (
                          <DropdownMenuItem
                            onClick={() => {
                              setTimeout(() => {
                                setPageToUnassign(node.id);
                                setShowUnassignDialog(true);
                              }, 0);
                            }}
                          >
                            <Unlink className="w-4 h-4" />
                            Remove from Current Project
                          </DropdownMenuItem>
                        )
                      )
                    )}
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
                    <Trash2 className="h-4 w-4 mr-2" />       
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
    [expandedRows, onPageClick, onFolderClick, onCreateFolder, onCreatePage, currentProjectId, onAssociateWithProject, onUnassignFromProject]
  );

  const table = useReactTable({
    data: filteredData, // Use filtered data
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      setSorting((prev) => {
        // Apply the updater function to the previous state
        const newSorting = typeof updater === 'function' ? updater(prev) : updater;
        console.log("New sorting state:", newSorting);
        return newSorting;
      });
    },
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
        {/* Search Filter */}
        <div className="mb-4 flex items-center">
        <div className="relative w-full max-w-md">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
            placeholder="Search pages and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8" // Padding to accommodate the icon
            />
        </div>
        </div>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}>
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

      {/* Delete Dialog */}
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

      {/* Unassign from Project Dialog */}
      <Dialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this page from the current project?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnassignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pageToUnassign && onUnassignFromProject) {
                  onUnassignFromProject(pageToUnassign);
                  setPageToUnassign(null);
                }
                setShowUnassignDialog(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}