import { useMemo, useState } from 'react';
import {
  FileText,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { PageNode } from '@/types/pages';
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
  Row,
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
  onPageClick: (pageId: string) => void;
  onCreatePage: (parentId: string | null, title: string) => void;
  onDeletePage: (id: string) => Promise<void>;
  onRenamePage: (id: string, title: string) => void;
}

export function PagesTable({
  pages,
  onPageClick,
  onCreatePage,
  onDeletePage,
  onRenamePage,
}: PagesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  // New state for deletion confirmation
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, _setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Helper function to check if a page has children.
  const hasChildren = (pageId: string) =>
    pages.some((page) => page.parentId === pageId);

  // Toggle expanded/collapsed state for a page row.
  const toggleExpand = (pageId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedRows(newExpanded);
  };

  // Columns for the table.
  const columns: ColumnDef<PageNode>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }: { row: Row<PageNode> }) => {
          const depth = getPageDepth(row.original.id, pages);
          const hasChildPages = hasChildren(row.original.id);
          const isExpanded = expandedRows.has(row.original.id);
          return (
            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * 24}px` }}
            >
              {hasChildPages && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-4 w-4 mr-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(row.original.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildPages && <div className="w-6" />}
              <div
                className="flex items-center cursor-pointer"
                onClick={() => onPageClick(row.original.id)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {row.getValue('title')}
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
        cell: ({ row }: { row: Row<PageNode> }) =>
          new Date(row.getValue('updatedAt')).toLocaleDateString(),
      },
      {
        id: 'actions',
        cell: ({ row }: { row: Row<PageNode> }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => onCreatePage(row.original.id, 'New Page')}
              >
                Create Sub-page
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Trigger rename dialog (using a slight delay so the menu closes first)
                  setRenamePageId(row.original.id);
                  setNewName(row.original.title);
                  console.log('Rename dialog triggered for:', row.original.id);
                  setTimeout(() => {
                    setIsRenameDialogOpen(true);
                    console.log('Rename dialog opened.');
                  }, 0);
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                    setTimeout(() => {
                    setPageToDelete(row.original.id);
                    setIsDeleteDialogOpen(true);
                    }, 0);
                }}
                className="text-red-600"
                >
                Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onPageClick, onCreatePage, onDeletePage, expandedRows, pages, onRenamePage]
  );

  // Organize pages so that child pages are nested under their parent.
  const data = useMemo(() => {
    const organized = organizePages(pages);
    return organized.filter((page) => {
        if (!page.parentId) return true;
        let currentPage = page;
        const visitedWhileLoop = new Set<string>();
      
        while (currentPage.parentId) {
          // Check for loops here
          if (visitedWhileLoop.has(currentPage.id)) {
            console.warn(
              "Cycle detected in while loop. Page:", currentPage.id
            );
            return false; // or break, or do something else safe
          }
          visitedWhileLoop.add(currentPage.id);
      
          const parent = pages.find((p) => p.id === currentPage.parentId);
          if (!parent || !expandedRows.has(parent.id)) {
            return false;
          }
          currentPage = parent;
        }
        return true;
      });
      
  }, [pages, expandedRows]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: { sorting },
    });

  // Controlled dialog for renaming.
    const handleRenameDialogOpenChange = (open: boolean) => {
        console.log('Rename Dialog onOpenChange:', open);
        setIsRenameDialogOpen(open);
        if (!open) {
        setRenamePageId(null);
        setNewName('');
        }
    };  

    const handleDeleteDialogOpenChange = (open: boolean) => {
        setIsDeleteDialogOpen(open);
        if (!open) {
          setPageToDelete(null);
          setDeleteError(null);
        }
      };

  // Delete confirmation handler.
    const confirmDelete = async () => {
        if (!pageToDelete) return;
        
        try {
        await onDeletePage(pageToDelete);
        // Only close the dialog after successful deletion
        setIsDeleteDialogOpen(false);
        setPageToDelete(null);
        } catch (error) {
        console.error('Failed to delete page:', error);
        setDeleteError(error instanceof Error ? error.message : 'Failed to delete page');
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
                  data-state={row.getIsSelected() && 'selected'}
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
                  No pages created.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Controlled Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={handleRenameDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Page</DialogTitle>
            <DialogDescription>
              Enter a new name for the page.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter page name"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                console.log('Cancel clicked');
                handleRenameDialogOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newName.trim() && renamePageId) {
                  onRenamePage(renamePageId, newName.trim());
                  handleRenameDialogOpenChange(false);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
                Are you sure you want to delete this page? This action cannot be undone.
            </DialogDescription>
            </DialogHeader>
            {deleteError && (
            <div className="text-red-500 text-sm">{deleteError}</div>
            )}
            <DialogFooter>
            <Button
                variant="outline"
                onClick={() => handleDeleteDialogOpenChange(false)}
                disabled={isDeleting}
            >
                Cancel
            </Button>
            <Button 
                onClick={confirmDelete}
                disabled={isDeleting}
            >
                {isDeleting ? 'Deleting...' : 'Confirm'}
            </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    </>
  );
}

// Helper function to organize pages hierarchically.
function organizePages(pages: PageNode[]): PageNode[] {
    const organized: PageNode[] = [];
    const visited = new Set<string>();
  
    function addPage(page: PageNode, depth: number) {
      // If we’ve already visited this page, we have a cycle
      if (visited.has(page.id)) {
        console.warn(`Circular reference detected. Page ID: ${page.id}`);
        return;
      }
      visited.add(page.id);
  
      organized.push(page);
  
      const children = pages.filter(p => p.parentId === page.id);
      children.sort((a, b) => a.title.localeCompare(b.title));
      children.forEach(child => addPage(child, depth + 1));
    }
  
    const rootPages = pages.filter(p => !p.parentId);
    rootPages.sort((a, b) => a.title.localeCompare(b.title));
    rootPages.forEach(page => addPage(page, 0));
  
    return organized;
  }

// Helper function to determine a page's depth in the hierarchy.
function getPageDepth(pageId: string, pages: PageNode[]): number {
  let depth = 0;
  let currentPage = pages.find((p) => p.id === pageId);
  while (currentPage?.parentId) {
    depth++;
    currentPage = pages.find((p) => p.id === currentPage?.parentId);
  }
  return depth;
}
