import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Folder, File } from "lucide-react";
import { DocumentService } from "@/services/documentService"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TrashItemCount {
  folders: number;
  documents: number;
}

interface TrashItem {
  id: string;
  name: string;
  type: 'folder' | 'document';
  deletedAt: string;
  deletedBy: string;
  subItemsCount?: TrashItemCount;
}

interface TrashViewProps {
  organizationId: string;
  onRestore: (id: string, type: 'folder' | 'document') => Promise<void>;
  onPermanentDelete: (id: string, type: 'folder' | 'document') => Promise<void>;
  onGetTrashedItemsCount?: (folderId: string) => Promise<TrashItemCount>;
}

export function TrashView({ 
  organizationId, 
  onRestore, 
  onPermanentDelete,
  onGetTrashedItemsCount 
}: TrashViewProps) {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [_loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const documentService = new DocumentService()
  useEffect(() => {
    fetchTrashItems();
  }, [organizationId]);

  const fetchTrashItems = async () => {
    try {
      const data = await documentService.getTrashItems(organizationId);
      setTrashItems(data);
    } catch (error) {
      console.error('Error fetching trash items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      await onRestore(item.id, item.type);
      await fetchTrashItems();
    } catch (error) {
      console.error('Error restoring item:', error);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    try {
      if (item.type === 'folder' && onGetTrashedItemsCount) {
        const count = await onGetTrashedItemsCount(item.id);
        setItemToDelete({ ...item, subItemsCount: count });
      } else {
        setItemToDelete(item);
      }
      setShowDeleteDialog(true);
    } catch (error) {
      console.error('Error preparing item for deletion:', error);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await onPermanentDelete(itemToDelete.id, itemToDelete.type);
      await fetchTrashItems();
    } catch (error) {
      console.error('Error permanently deleting item:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Deleted At</TableHead>
            <TableHead>Deleted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trashItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Trash is empty
              </TableCell>
            </TableRow>
          ) : (
            trashItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.type === 'folder' ? (
                      <Folder className="h-4 w-4 text-muted-foreground fill-blue-500 stroke-blue-500 stroke-[1.5]" />
                    ) : (
                      <File className="h-4 w-4 text-muted-foreground" />
                    )}
                    {item.name}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{item.type}</TableCell>
                <TableCell>{new Date(item.deletedAt).toLocaleString()}</TableCell>
                <TableCell>{item.deletedBy}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      title="Restore"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePermanentDelete(item)}
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete "{itemToDelete?.name}"?
                This action cannot be undone.
              </p>
              {itemToDelete?.type === 'folder' && itemToDelete.subItemsCount && (
                <div className="mt-4 p-4 border rounded-md bg-muted">
                  <p className="font-medium">This folder contains:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>{itemToDelete.subItemsCount.folders} folders</li>
                    <li>{itemToDelete.subItemsCount.documents} documents</li>
                  </ul>
                  <p className="mt-2 text-destructive font-medium">
                    All these items will be permanently deleted and cannot be recovered.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}