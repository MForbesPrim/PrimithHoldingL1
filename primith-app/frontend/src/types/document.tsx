export interface DocumentMetadata {
    id: string;
    name: string;
    description?: string;
    folderId: string | null;
    projectId: string;
    fileType: string;
    fileSize: number;
    version: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface FolderNode {
    id: string;
    name: string;
    parentId: string | null;
    children?: FolderNode[];
  }