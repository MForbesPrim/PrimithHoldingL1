export interface PageNode {
  id: string;
  parentId: string | null;
  title: string;
  content: string;
  status: string;
  createdBy: string;
  updatedBy: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  organizationId: string; 
}