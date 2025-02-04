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
    organizationId: string;
    updatedAt: string;
    fileCount: number;
    lastUpdatedBy: string;
    children?: FolderNode[];
  }

  export interface Organization {
    id: string;
    name: string;
    description?: string;
    services?: Service[];
  }
  
  export interface Service {
    id: string;
    name: string;
    status?: 'active' | 'inactive';
  }

  export interface FolderMetadata {
    id: string;
    name: string;
    fileCount: number;
    updatedAt: string;
    parentId: string | null;
    lastUpdatedBy: string;
  }