// src/components/FolderTree.tsx
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderPlus, FolderEdit, Trash2, Plus, MoreHorizontal } from 'lucide-react'
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
import { FolderNode } from '@/types/document'
import { useToast } from "@/hooks/use-toast"

interface ProcessedFolderNode extends FolderNode {
  children: ProcessedFolderNode[];
}

export function FolderTree({ 
  folders = [],
  onCreateFolder, 
  onDeleteFolder,
  onRenameFolder,
  onMoveFolder,
  onSelect,
  selectedFolderId
}: {
  folders: FolderNode[];
  onCreateFolder: (parentId: string | null, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onMoveFolder: (folderId: string, newParentId: string | null) => void;
  onSelect: (id: string) => void;
  selectedFolderId: string | null;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState("")
  const [processedFolders, setProcessedFolders] = useState<ProcessedFolderNode[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (!folders) return;
    
    const buildFolderTree = (items: FolderNode[]): ProcessedFolderNode[] => {
      const folderMap = new Map<string, ProcessedFolderNode>();
      items.forEach(item => {
        folderMap.set(item.id, { ...item, children: [] });
      });

      const rootFolders: ProcessedFolderNode[] = [];
      folderMap.forEach(folder => {
        if (folder.parentId === null) {
          rootFolders.push(folder);
        } else {
          const parent = folderMap.get(folder.parentId);
          if (parent) {
            parent.children.push(folder);
          } else {
            rootFolders.push(folder);
          }
        }
      });

      return rootFolders;
    };

    setProcessedFolders(buildFolderTree(folders));
  }, [folders]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    if (active.id === over.id) return;
    
    const draggedId = active.id as string;
    const overFolderId = over.id as string;
  
    if (over.id === 'root-drop-area') {
      onMoveFolder(draggedId, null);
      return;
    }
  
    if (overFolderId.startsWith('dropzone-')) {
      // When dropping into a dropzone, we want the folder to become a sibling
      // of the folder associated with that dropzone
      const targetFolder = folders.find(f => f.id === overFolderId.replace('dropzone-', ''));
      onMoveFolder(draggedId, targetFolder?.parentId || null);
    } else {
      // When dropping directly onto a folder, make it a child of that folder
      onMoveFolder(draggedId, overFolderId);
    }
  };

  const DraggableFolder = ({ folder, level }: { folder: ProcessedFolderNode; level: number }) => {
    const { toast } = useToast();
    const {attributes, listeners, setNodeRef: setDragRef, isDragging} = useDraggable({
      id: folder.id,
      disabled: editingFolder === folder.id,
    });

    const {setNodeRef: setDropRef, isOver} = useDroppable({
      id: folder.id,
    });

    const {setNodeRef: setDropZoneRef, isOver: isOverDropZone} = useDroppable({
      id: `dropzone-${folder.id}`,
    });

    const isExpanded = expandedFolders.has(folder.id)
    const isEditing = editingFolder === folder.id
    const isSelected = selectedFolderId === folder.id

    const combinedRef = (element: HTMLDivElement | null) => {
      setDragRef(element);
      setDropRef(element);
    };

    const toggleFolder = (e: React.MouseEvent) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(folder.id)) {
        newExpanded.delete(folder.id);
      } else {
        newExpanded.add(folder.id);
      }
      setExpandedFolders(newExpanded);
    };

    const handleStartRename = () => {
      setEditingFolder(folder.id);
      setNewFolderName(folder.name);
    };

    const handleFinishRename = () => {
        // Trim whitespace and ensure the new name is not blank.
        const trimmedName = newFolderName.trim()
        if (!trimmedName) {
          toast({
            title: "Invalid Folder Name",
            description: "Folder name cannot be blank. Please enter a valid name.",
            variant: "default",
            duration: 5000,
          });
          return; // Remain in editing mode until a valid name is entered.
        }
        if (trimmedName !== folder.name) {
          onRenameFolder(folder.id, trimmedName)
        }
        setEditingFolder(null)
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
            onClick={toggleFolder}
          >
            {folder.children.length > 0 && (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <div {...attributes} {...listeners} className="cursor-move">
            <Folder className="h-4 w-4 mx-1" />
          </div>
          <div
            className="flex items-center flex-1 cursor-pointer"
            onClick={() => onSelect(folder.id)}
          >
            {isEditing ? (
              <Input
                className="h-6 py-1 px-2"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
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
              <span className="text-sm flex-1">{folder.name}</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onCreateFolder(folder.id, "New Folder")}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartRename}>
                <FolderEdit className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteFolder(folder.id)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isExpanded && folder.children.map(child => (
          <DraggableFolder key={child.id} folder={child} level={level + 1} />
        ))}
      </>
    );
  };

  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: 'root-drop-area',
  });

  return (
    <div className="min-w-[200px] border-r pr-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-4 ml-2">
        <h3 className="font-semibold">Folders</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCreateFolder(null, "New Folder")}
        >
          <Plus className="h-4 w-4" />
        </Button>
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
          {processedFolders.map(folder => (
            <DraggableFolder key={folder.id} folder={folder} level={0} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="flex items-center p-1 bg-background border rounded-sm shadow-lg">
              <Folder className="h-4 w-4 mr-2" />
              <span className="text-sm">
                {folders.find(f => f.id === activeId)?.name}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}