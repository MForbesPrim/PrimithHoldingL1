// src/types/project.ts
export interface Project {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    status: 'active' | 'completed' | 'archived';
    startDate?: string;
    endDate?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ProjectArtifact {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    type: 'document' | 'task' | 'page'| 'image'| 'milestone' | 'deliverable';
    status: 'draft' | 'in_review' | 'approved' | 'rejected';
    assignedTo?: string;
    documentId?: string;
    pageId?: string;
    dueDate?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ProjectVariable {
    id: string;
    projectId: string;
    key: string;
    value: string;
    description?: string;
    createdBy: string;
    updatedAt: string;
  }
  
  export interface RoadmapItem {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'delayed';
    priority: number;
    parentId?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    children?: RoadmapItem[];
  }
  
  export interface ArtifactReview {
    id: string;
    artifactId: string;
    reviewerId: string;
    reviewerName?: string;
    status: 'approved' | 'rejected' | 'comments';
    comments?: string;
    createdAt: string;
  }

  // Add to src/types/project.ts

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    userName: string; // Full name of user
    email: string;
    role: 'owner' | 'admin' | 'member';
    createdAt: string;
    avatar?: string; // URL to avatar image
    isActive: boolean;
    permissions?: {
      canManageMembers: boolean;
      canManageArtifacts: boolean;
      canApproveArtifacts: boolean;
      canEditRoadmap: boolean;
      canManageVariables: boolean;
    };
   }
   
   export interface ProjectRole {
    id: string;
    name: string;
    permissions: string[];
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
   }