import { useState, useEffect } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  Folder,
  FileText, 
  Plus, 
  Pencil, 
  Trash2, 
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  DndContext, 
  DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCenter
} from '@dnd-kit/core'
import { useToast } from "@/hooks/use-toast"
import { PageNode, FolderNode } from "@/types/pages";

interface ProcessedPageNode extends Omit<PageNode, 'folderId'> {
  children: ProcessedPageNode[];
  hasChildren: boolean;
  type: 'page' | 'folder';
}

export function PageTree({ 
  pages = [],
  folders = [],
  onCreatePage, 
  onCreateFolder,
  onDeletePage,
  onRenamePage,
  onMovePage,
  onSelect,
  selectedPageId
}: {
  pages: PageNode[];
  folders: FolderNode[];
  onCreatePage: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void; 
  onDeletePage: (id: string) => void;
  onRenamePage: (id: string, newTitle: string) => void;
  onMovePage: (pageId: string, newParentId: string | null) => void;
  onSelect: (id: string) => void;
  selectedPageId: string | null;
}) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [editingPage, setEditingPage] = useState<string | null>(null)
  const [newPageTitle, setNewPageTitle] = useState("")
  const [processedPages, setProcessedPages] = useState<ProcessedPageNode[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!pages) return;
    
    const buildPageTree = (items: PageNode[], folders: FolderNode[]): ProcessedPageNode[] => {
      const nodeMap = new Map<string, ProcessedPageNode>();
      
      // Create a Set of folder IDs for quick lookup
      const folderIds = new Set(folders.map(folder => folder.id));
      
      // Add folders first with explicit type
      folders.forEach(folder => {
        nodeMap.set(folder.id, {
          ...folder,
          title: folder.name,
          type: 'folder',
          content: '',
          children: [],
          hasChildren: false,
          status: 'folder'
        } as ProcessedPageNode);
      });
    
      // Add pages, checking against folder IDs
      items.forEach(page => {
        if (page.status !== 'template' && !folderIds.has(page.id)) {
          nodeMap.set(page.id, {
            ...page,
            type: 'page',
            children: [],
            hasChildren: false
          } as ProcessedPageNode);
        }
      });
    
      // Build tree structure
      const rootNodes: ProcessedPageNode[] = [];
      nodeMap.forEach(node => {
        if (node.parentId === null) {
          rootNodes.push(node);
        } else {
          const parent = nodeMap.get(node.parentId);
          if (parent) {
            parent.children.push(node);
            parent.hasChildren = true;
          } else {
            rootNodes.push(node);
          }
        }
      });
    
      return rootNodes;
    };
    setProcessedPages(buildPageTree(pages, folders));
  }, [pages, folders]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    if (active.id === over.id) return;
    
    const draggedId = active.id as string;
    const overPageId = over.id as string;
  
    if (over.id === 'root-drop-area') {
      onMovePage(draggedId, null);
      return;
    }
  
    if (overPageId.startsWith('dropzone-')) {
      const targetPage = pages.find(p => p.id === overPageId.replace('dropzone-', ''));
      onMovePage(draggedId, targetPage?.parentId || null);
    } else {
      onMovePage(draggedId, overPageId);
    }
  };

  const DraggablePage = ({ page, level }: { page: ProcessedPageNode; level: number }) => {
    const {attributes, listeners, setNodeRef: setDragRef, isDragging} = useDraggable({
      id: page.id,
      disabled: editingPage === page.id,
    });

    const {setNodeRef: setDropRef, isOver} = useDroppable({
      id: page.id,
    });

    const {setNodeRef: setDropZoneRef, isOver: isOverDropZone} = useDroppable({
      id: `dropzone-${page.id}`,
    });

    const isExpanded = expandedPages.has(page.id)
    const isEditing = editingPage === page.id
    const isSelected = selectedPageId === page.id

    const combinedRef = (element: HTMLDivElement | null) => {
      setDragRef(element);
      setDropRef(element);
    };

    const togglePage = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedPages);
      if (newExpanded.has(page.id)) {
        newExpanded.delete(page.id);
      } else {
        newExpanded.add(page.id);
      }
      setExpandedPages(newExpanded);
    };

    const handleStartRename = () => {
      setEditingPage(page.id);
      setNewPageTitle(page.name);
    };

    const handleFinishRename = () => {
      const trimmedTitle = newPageTitle.trim();
      if (!trimmedTitle) {
        toast({
          title: "Invalid Page Title",
          description: "Page title cannot be blank. Please enter a valid title.",
          variant: "default",
          duration: 5000,
        });
        return;
      }
    
      onRenamePage(page.id, trimmedTitle);
      setEditingPage(null);
    };

    return (
      <>
        <div 
          ref={setDropZoneRef}
          className={`h-0.5 -mx-4 transition-colors ${isOverDropZone ? 'bg-blue-500' : 'hover:bg-blue-300'}`}
        />
        <div
          ref={combinedRef}
          className={`flex items-center p-1 rounded-sm ${
            isDragging ? 'opacity-50' : ''
          } ${isOver ? 'bg-green-100 dark:bg-green-900/20' : ''} ${
            isSelected ? 'bg-accent' : 'hover:bg-accent/30'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-4 w-4"
            onClick={togglePage}
          >
            {page.hasChildren && (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div {...attributes} {...listeners} className="cursor-move">
            {page.type === 'folder' ? (
              <Folder className="h-4 w-4 mx-1" />
            ) : (
              <FileText className="h-4 w-4 mx-1" />
            )}
          </div>
          <div
            className="flex items-center flex-1 cursor-pointer"
            onClick={() => onSelect(page.id)}
          >
            {isEditing ? (
              <Input
                className="h-6 py-1 px-2"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFinishRename()
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm flex-1">{page.name}</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onCreateFolder(page.id)}>
              <Folder className="h-4 w-4 mr-2" />
              New Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePage(page.id)}>
              <Plus className="h-4 w-4 mr-2" />
              New Subpage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStartRename}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDeletePage(page.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
          </div>
        {isExpanded && page.children.map(child => (
          <DraggablePage key={child.id} page={child} level={level + 1} />
        ))}
      </>
    );
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <div className="text-muted-foreground mb-4">
        No pages yet. Create your first page to get started.
      </div>
      <Button
        onClick={() => onCreatePage(null)}
        className="flex items-center"
        >
        <Plus className="h-4 w-4 mr-2" />
        Create Page
        </Button>
    </div>
  );

  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'root-drop-area',
  });

  if (pages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="min-w-[200px] border-r pr-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4 ml-6">
        <h3 className="font-semibold">Pages</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateFolder(null)}
          >
            <Folder className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreatePage(null)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <DndContext
        onDragStart={({ active }) => setActiveId(active.id as string)}
        onDragEnd={handleDragEnd}
        collisionDetection={closestCenter}
      >
        <div
          ref={setRootDropRef}
          className={`min-h-[200px] ${isOverRoot ? 'bg-accent/20' : ''}`}
        >
          {processedPages.map(page => (
            <DraggablePage key={page.id} page={page} level={0} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="flex items-center p-1 bg-background border rounded-sm shadow-lg">
              <FileText className="h-4 w-4 mr-2" />
              <span className="text-sm">
                {pages.find(p => p.id === activeId)?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}