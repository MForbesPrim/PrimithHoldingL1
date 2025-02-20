export interface PageNode {
  id: string;
  parentId: string | null;
  folderId: string | null;
  title: string;
  content: string;
  status: string;
  createdBy: string;
  updatedBy: string;
  category?: string;
  categoryId?: number;
  description?: string; 
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  organizationId: string; 
  isSystem?: boolean;
  templateType?: string;
  isFavorite?: boolean;
}

export interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  createdBy: string;
  updatedBy?: string;
  deletedBy?: string;
}

export interface TemplateCategory {
  id: number;
  code: string;
  label: string;
  isSystem: boolean;
}