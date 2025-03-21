    import AuthService from '@/services/auth'
    import { Project, ProjectArtifact, ProjectVariable, RoadmapItem, ProjectRole, ArtifactReview, ArtifactStatus, ProjectMember, ProjectActivity, ProjectTask, ProjectMilestone, MilestoneStatus} from '@/types/projects'

    export class ProjectService {
    private baseUrl = import.meta.env.VITE_API_URL;
    
    private async getAuthHeader() {
        // Flag to prevent multiple refresh attempts in the same call
        let hasAttemptedRefresh = false;
        
        try {
            // First, check if we have tokens
            let rdmAuth = AuthService.getRdmTokens();
            
            // If no tokens or they're expired, try refreshing once
            if (!rdmAuth?.tokens) {
                if (hasAttemptedRefresh) {
                    // We've already tried refreshing, fail gracefully
                    throw new Error('No RDM authentication tokens available');
                }
                
                hasAttemptedRefresh = true;
                console.log("Attempting to refresh RDM tokens...");
                
                const refreshed = await AuthService.refreshRdmAccessToken();
                if (!refreshed) {
                    throw new Error('Failed to refresh RDM tokens');
                }
                
                // Get the fresh tokens
                rdmAuth = AuthService.getRdmTokens();
                if (!rdmAuth?.tokens) {
                    throw new Error('Failed to get RDM tokens after refresh');
                }
            }
            
            // Return the headers with tokens
            return {
                'Authorization': `Bearer ${rdmAuth.tokens.token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            // Log the error but don't redirect here
            console.error("Authentication error in getAuthHeader:", error);
            throw error;
        }
    }

    // Projects CRUD
    async getProjects(organizationId: string): Promise<Project[]> {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/projects?organizationId=${organizationId}`, {
        credentials: 'include',
        headers
        });
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        return data.projects || [];
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
        if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update project: ${response.status} - ${errorText || 'Unknown error'}`);
        }
        // If backend returns the updated project, parse it; otherwise, fetch it separately or return the input
        try {
        return await response.json();
        } catch (e) {
        // Backend doesn't return a body, so fetch the updated project
        return this.getProjectById(projectId);
        }
    }

    async deleteProject(projectId: string): Promise<void> {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Delete project error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Failed to delete project: ${response.status} - ${errorText || response.statusText}`);
        }

        // Dispatch event to notify components that project list needs to be updated
        window.dispatchEvent(new CustomEvent('project-list-updated'));
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

    async createArtifact(projectId: string, artifact: Omit<Partial<ProjectArtifact>, 'projectId'>): Promise<ProjectArtifact> {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/projects/${projectId}/artifacts`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(artifact)
        });
        if (!response.ok) throw new Error('Failed to create artifact');
        return response.json();
    }

    async getArtifactStatuses(projectId: string): Promise<ArtifactStatus[]> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/artifact-statuses`, {
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to fetch artifact statuses');
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
    
    async deleteProjectVariable(projectId: string, variableId: string): Promise<void> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/variables/${variableId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers
      });
      if (!response.ok) throw new Error('Failed to delete project variable');
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

    async createRoadmapItem(item: Partial<RoadmapItem> & { asMilestone?: boolean, statusId?: string }): Promise<RoadmapItem> {
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
        // Create a new object with null values instead of undefined
        const data: Record<string, any> = {};
        
        // Copy all properties, converting undefined to null
        Object.entries(item).forEach(([key, value]) => {
          data[key] = value === undefined ? null : value;
        });
        
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/roadmap-items/${itemId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(data)
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

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 409) {
                throw new Error("This user is already a member of the project");
            } else if (response.status === 403) {
                throw new Error("You don't have permission to add members to this project");
            } else if (response.status === 400) {
                throw new Error(errorText || "Invalid request. Please check the user ID and role");
            } else {
                throw new Error(`Failed to add project member: ${errorText || response.statusText}`);
            }
        }

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

    async updateArtifact(projectId: string, artifactId: string, data: Partial<ProjectArtifact>): Promise<ProjectArtifact> {
      const headers = await this.getAuthHeader();
      console.log('Updating artifact with ID:', artifactId, 'in project:', projectId);
      console.log('Request data:', data);
    
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/artifacts/${artifactId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(data)
      });
    
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
    
      if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error:', errorText);
          throw new Error(`Failed to update artifact: ${response.status} - ${errorText || 'Unknown error'}`);
      }
      
        try {
            return await response.json() as ProjectArtifact;
        } catch (e) {
            let errorMessage = 'Failed to parse response';
            if (e instanceof Error) {
                errorMessage += `: ${e.message}`;
            } else if (typeof e === 'string') {
                errorMessage += `: ${e}`;
            } else {
                errorMessage += ': Unknown error type';
            }
            throw new Error(errorMessage);
        }
    }

    async getProjectActivity(
        projectId: string, 
        offset: number = 0, 
        limit: number = 20
      ): Promise<{activities: ProjectActivity[], pagination: {total: number, offset: number, limit: number}}> {
        const headers = await this.getAuthHeader();
        try {
          const response = await fetch(
            `${this.baseUrl}/projects/${projectId}/activity?offset=${offset}&limit=${limit}`, 
            {
              credentials: 'include',
              headers
            }
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch project activity: ${response.status}`);
          }
          
          return await response.json();
        } catch (error) {
          console.error('Error fetching project activity:', error);
          throw error;
        }
      }

      async deleteRoadmapItem(itemId: string): Promise<void> {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/roadmap-items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
        });
        if (!response.ok) throw new Error('Failed to delete roadmap item');
      }

      async getCategories(projectId: string): Promise<string[]> {
        const headers = await this.getAuthHeader();
        try {
            const response = await fetch(`${this.baseUrl}/projects/${projectId}/categories`, {
                credentials: 'include',
                headers
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${response.statusText}`);
            }
            const data = await response.json();
            console.log("Raw categories data:", data); // Debug log
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("Error fetching categories:", error);
            return [];
        }
    }

// Add to src/services/projectService.ts
async getProjectTasks(projectId: string, filters?: { 
    status?: string, 
    assignedTo?: string, 
    parentId?: string 
  }): Promise<ProjectTask[]> {
    const headers = await this.getAuthHeader();
    
    let url = `${this.baseUrl}/projects/${projectId}/tasks`;
    
    // Add query parameters for filters
    if (filters) {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
      if (filters.parentId) params.append('parentId', filters.parentId);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
    }
    
    const response = await fetch(url, {
      credentials: 'include',
      headers
    });
    
    if (!response.ok) throw new Error('Failed to fetch tasks');
    return response.json();
  }
  
  async createTask(projectId: string, task: Partial<ProjectTask>): Promise<ProjectTask> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tasks`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(task)
    });
    
    if (!response.ok) throw new Error('Failed to create task');
    return response.json();
  }
  
  async updateTask(taskId: string, task: Partial<ProjectTask>): Promise<{ id: string }> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(task)
    });
    
    if (!response.ok) throw new Error('Failed to update task');
    return response.json();
  }
  
  async deleteTask(taskId: string): Promise<{ success: boolean }> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/tasks/${taskId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    
    if (!response.ok) throw new Error('Failed to delete task');
    return response.json();
  }

  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/milestones`, {
        credentials: 'include',
        headers
    });
    if (!response.ok) throw new Error('Failed to fetch milestones');
    return response.json();
    }

    async createMilestoneStatus(projectId: string, status: Partial<MilestoneStatus>): Promise<MilestoneStatus> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/milestone-statuses`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(status)
      });
      if (!response.ok) throw new Error('Failed to create milestone status');
      return response.json();
  }

  async updateMilestoneStatus(projectId: string, statusId: string, status: Partial<MilestoneStatus>): Promise<MilestoneStatus> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/milestone-statuses/${statusId}`, {
          method: 'PUT',
          credentials: 'include',
          headers,
          body: JSON.stringify(status)
      });
      if (!response.ok) throw new Error('Failed to update milestone status');
      return response.json();
  }

  async deleteMilestoneStatus(projectId: string, statusId: string): Promise<void> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/milestone-statuses/${statusId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
      });
      if (!response.ok) throw new Error('Failed to delete milestone status');
  }

    async createMilestone(milestone: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/milestones`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(milestone)
        });
        if (!response.ok) throw new Error('Failed to create milestone');
        return response.json();
    }

    async deleteMilestone(milestoneId: string): Promise<void> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/milestones/${milestoneId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
      });
      if (!response.ok) throw new Error('Failed to delete milestone');
    }

    async getMilestoneStatuses(projectId: string): Promise<MilestoneStatus[]> {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/projects/${projectId}/milestone-statuses`, {
          credentials: 'include',
          headers
      });
      if (!response.ok) throw new Error('Failed to fetch milestone statuses');
      return response.json();
  }

  async updateMilestone(milestoneId: string, milestoneData: Partial<ProjectMilestone>): Promise<ProjectMilestone> {
    console.log(`Updating milestone ${milestoneId}:`, milestoneData);
    
    try {
        const headers = await this.getAuthHeader();
        
        const sanitizedData: Record<string, any> = {};
        Object.entries(milestoneData).forEach(([key, value]) => {
            if (value !== undefined) {
                sanitizedData[key] = value;
            }
        });
        
        console.log("Sending sanitized data:", sanitizedData);
        
        const response = await fetch(`${this.baseUrl}/milestones/${milestoneId}`, {
            method: 'PUT',
            credentials: 'include',
            headers,
            body: JSON.stringify(sanitizedData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to update milestone (${response.status}):`, errorText);
            throw new Error(`Failed to update milestone: ${response.status} - ${errorText || 'Unknown error'}`);
        }
        
        try {
            return await response.json();
        } catch (e) {
            console.warn("Response not parseable JSON:", e);
            return {
                id: milestoneId,
                ...milestoneData,
                projectId: '', // Required fields must have some value
                name: milestoneData.name || '',
                priority: 0
            } as ProjectMilestone;
        }
    } catch (error) {
        console.error("Error in updateMilestone:", error);
        throw error;
    }
  }

  async searchUsers(term: string, organizationId: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/organizations/${organizationId}/users/search?term=${encodeURIComponent(term)}`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to search users');
    return response.json();
  }

  // Implement updateProjectMember for role changes and activation/deactivation
  async updateProjectMember(projectId: string, memberId: string, data: Partial<ProjectMember>): Promise<ProjectMember> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update project member');
    return response.json();
  }

  // Get project roles
  async getProjectRoles(projectId: string): Promise<ProjectRole[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/roles`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project roles');
    return response.json();
  }

  // Properties methods
  async getProjectProperties(projectId: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/properties`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project properties');
    return response.json();
  }

  async addProjectProperty(projectId: string, data: { name: string; type: string; value: string }): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/properties`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add project property');
    return response.json();
  }

  async updateProjectProperty(projectId: string, propertyId: string, data: Partial<any>): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/properties/${propertyId}`, {
      method: 'PUT', 
      credentials: 'include',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update project property');
    return response.json();
  }

  async deleteProjectProperty(projectId: string, propertyId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/properties/${propertyId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete project property');
  }

  // Tags methods
  async getProjectTags(projectId: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tags`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch project tags');
    return response.json();
  }

  async addProjectTag(projectId: string, data: { name: string; color: string }): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tags`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to add project tag');
    return response.json();
  }

  async updateProjectTag(projectId: string, tagId: string, data: Partial<any>): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tags/${tagId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update project tag');
    return response.json();
  }

  async deleteProjectTag(projectId: string, tagId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tags/${tagId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete project tag');
  }

  async toggleMemberStatus(projectId: string, memberId: string, isActive: boolean): Promise<any> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/members/${memberId}/toggle-status`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive })
    });
    
    if (!response.ok) throw new Error('Failed to update member status');
    return response.json();
  }

  // Organization users
  async getOrganizationUsers(organizationId: string): Promise<any[]> {
    const headers = await this.getAuthHeader();
    try {
      const response = await fetch(`${this.baseUrl}/organizations/${organizationId}/users`, {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch organization users:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to fetch organization users: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error in getOrganizationUsers:', error);
      throw error;
    }
  }
  }