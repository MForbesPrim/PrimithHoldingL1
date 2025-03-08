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
    type: 'document' | 'image';
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
    category?: string; 
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

   export interface ProjectActivity {
    id: string;
    projectId: string;
    userId: string;
    userEmail: string;
    userName: string;
    activityType: 'create' | 'update' | 'delete' | 'review' | 'status_change';
    entityType: 'project' | 'artifact' | 'roadmap' | 'variable' | 'member' | 'page' | 'artifact_review';
    entityId: string;
    description: string;
    timestamp: string;
    createdAt: string;
    formattedDate: string;
    formattedTime: string;
    oldValues?: {
      [key: string]: any;
    };
    newValues?: {
      [key: string]: any;
    };
    metadata?: {
      [key: string]: any;
    };
  }

  export interface Pagination {
    total: number;
    offset: number;
    limit: number;
  }
  
  export interface ProjectTask {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'approved' | 'done' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    assigneeName?: string;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    tags?: string[];
    parentId?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    children?: ProjectTask[];
  }

  export interface ProjectMilestone {
    id: string;
    projectId: string;
    name: string;
    title?: string;
    description?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'delayed';
    startDate?: string;
    dueDate?: string;
    endDate?: string;
    priority: number;
    category?: string;
    roadmapItemId?: string;
    createdBy: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MilestoneStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_default: boolean;
  is_system: boolean;
}