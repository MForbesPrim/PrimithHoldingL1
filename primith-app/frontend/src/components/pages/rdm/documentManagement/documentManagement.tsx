// src/components/DocumentManagement.tsx
import { useEffect, useState } from 'react'
import { DocumentMetadata, FolderNode } from '@/types/document'
import { DocumentService } from '@/services/documentService'
import { Button } from '@/components/ui/button'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileUploader } from '@/components/pages/rdm/documentManagement/fileUploader'
import { FolderTree } from '@/components/pages/rdm/documentManagement/folderTree'

export function DocumentManagement() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const documentService = new DocumentService()

  useEffect(() => {
    loadFolders()
    loadDocuments()
  }, [])

  useEffect(() => {
    loadDocuments();
  }, [selectedFolderId]);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments(selectedFolderId)
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const folderData = await documentService.getFolders()
      setFolders(folderData)
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const handleCreateFolder = async (parentId: string | null, name: string) => {
    try {
      await documentService.createFolder(name, parentId)
      await loadFolders()
    } catch (error) {
      console.error('Failed to create folder:', error)
    }
  }

  const handleMoveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      await documentService.moveFolder(folderId, newParentId)
      await loadFolders()
    } catch (error) {
      console.error('Failed to move folder:', error)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await documentService.deleteFolder(folderId)
      await loadFolders()
    } catch (error) {
      console.error('Failed to delete folder:', error)
    }
  }

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await documentService.renameFolder(folderId, newName)
      await loadFolders()
    } catch (error) {
      console.error('Failed to rename folder:', error)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    try {
      await documentService.uploadDocument(file, selectedFolderId)
      await loadDocuments()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (documentId: string, fileName: string) => {
    try {
      const blob = await documentService.downloadDocument(documentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  function getFolderName(folderId: string): string {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? folder.name : ''
  }

  return (
    <div className="flex h-full">
        <FolderTree
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameFolder={handleRenameFolder}
        onMoveFolder={handleMoveFolder}
        onSelect={setSelectedFolderId}
        selectedFolderId={selectedFolderId}
        />
      <div className="flex-1 p-4">
        <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
        {selectedFolderId ? `${getFolderName(selectedFolderId)} Contents` : 'All Documents'}
        </h2>
          <FileUploader 
            onUpload={handleFileUpload}
            isUploading={isUploading}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.name}</TableCell>
                <TableCell>{doc.fileType}</TableCell>
                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                <TableCell>v{doc.version}</TableCell>
                <TableCell>{new Date(doc.updatedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    onClick={() => handleDownload(doc.id, doc.name)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}