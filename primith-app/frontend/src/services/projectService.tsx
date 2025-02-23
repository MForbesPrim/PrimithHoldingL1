import AuthService from '@/services/auth'
import { Project, ProjectArtifact, ProjectVariable, RoadmapItem, ArtifactReview, ProjectMember } from '@/types/projects'

export class ProjectService {
  private baseUrl = import.meta.env.VITE_API_URL;
  
  private async getAuthHeader() {
    let rdmAuth = AuthService.getRdmTokens();
    
    if (!rdmAuth?.tokens) {
      const refreshed = await AuthService.refreshRdmAccessToken();
      if (!refreshed) {
        throw new Error('No RDM authentication tokens available');
      }
      rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth) {
        throw new Error('Failed to get RDM tokens after refresh');
      }
    }
  
    return {
      'Authorization': `Bearer ${rdmAuth.tokens.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Projects CRUD
  async getProjects(organizationId: string): Promise<Project[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects?organizationId=${organizationId}`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  }

  async getProjectById(projectId: string): Promise<Project> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  }

  async createProject(project: Partial<Project>): Promise<Project> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(project)
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  }

  async updateProject(projectId: string, project: Partial<Project>): Promise<Project> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(project)
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  }

  async deleteProject(projectId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete project');
  }

  // Artifacts CRUD
  async getProjectArtifacts(projectId: string): Promise<ProjectArtifact[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/artifacts`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch artifacts');
    return response.json();
  }

  async createArtifact(artifact: Partial<ProjectArtifact>): Promise<ProjectArtifact> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/artifacts`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(artifact)
    });
    if (!response.ok) throw new Error('Failed to create artifact');
    return response.json();
  }

  async updateArtifactStatus(artifactId: string, status: string, comments?: string): Promise<ProjectArtifact> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/artifacts/${artifactId}/status`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ status, comments })
    });
    if (!response.ok) throw new Error('Failed to update artifact status');
    return response.json();
  }

  // Variables
  async getProjectVariables(projectId: string): Promise<ProjectVariable[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/variables`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project variables');
    return response.json();
  }

  async setProjectVariable(projectId: string, key: string, value: string, description?: string): Promise<ProjectVariable> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/variables`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ key, value, description })
    });
    if (!response.ok) throw new Error('Failed to set project variable');
    return response.json();
  }

  // Roadmap
  async getRoadmapItems(projectId: string): Promise<RoadmapItem[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/roadmap`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch roadmap');
    return response.json();
  }

  async createRoadmapItem(item: Partial<RoadmapItem>): Promise<RoadmapItem> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/roadmap-items`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to create roadmap item');
    return response.json();
  }

  async updateRoadmapItem(itemId: string, item: Partial<RoadmapItem>): Promise<RoadmapItem> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/roadmap-items/${itemId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error('Failed to update roadmap item');
    return response.json();
  }

  // Reviews
  async getArtifactReviews(artifactId: string): Promise<ArtifactReview[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/artifacts/${artifactId}/reviews`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch reviews');
    return response.json();
  }

  async submitReview(review: Partial<ArtifactReview>): Promise<ArtifactReview> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/reviews`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(review)
    });
    if (!response.ok) throw new Error('Failed to submit review');
    return response.json();
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project members');
    return response.json();
  }
  
  async addProjectMember(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ userId, role })
    });
    if (!response.ok) throw new Error('Failed to add project member');
    return response.json();
  }
  
  async updateMemberRole(projectId: string, userId: string, role: string): Promise<ProjectMember> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members/${userId}`, {
      method: 'PUT',
      credentials: 'include', 
      headers,
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update member role');
    return response.json();
  }
  
  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to remove project member');
  }
}