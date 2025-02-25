import AuthService from '@/services/auth'
import { PageNode, FolderNode, TemplateCategory, PageParent } from '@/types/pages'

export class PagesService {
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

  async getPages(organizationId: string, projectId: string | null = null): Promise<PageNode[]> {
    try {
      if (!organizationId) {
        console.error('No organization ID provided');
        throw new Error('Organization ID is required');
      }
  
      const headers = await this.getAuthHeader();
      const url = new URL(`${this.baseUrl}/pages`);
      url.searchParams.append('organizationId', organizationId);
      if (projectId) url.searchParams.append('projectId', projectId);
      
      const response = await fetch(url.toString(), {
        credentials: 'include',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pages: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error in getPages:', error);
      throw error;
    }
  }

  async associatePageWithProject(pageId: string, projectId: string | null): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/${pageId}/project`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ projectId }),
    });
    if (!response.ok) throw new Error('Failed to associate page with project');
  }

  async createPage(
    title: string, 
    parent: PageParent,
    organizationId: string
  ): Promise<PageNode> {
    const headers = await this.getAuthHeader();
    const requestBody = { 
      name: title,  
      parentId: parent.parentId ?? null,
      type: "page", 
      organizationId 
    };
    
    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', response.status, errorText);
        throw new Error(`Failed to create page: ${response.status} - ${errorText}`);
      }
    return response.json();
  }

  async updatePage(pageId: string, content: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/${pageId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ content, organizationId })
    });
    if (!response.ok) throw new Error('Failed to update page');
  }

  async deletePage(pageId: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/${pageId}?organizationId=${organizationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete page');
  }

  async renamePage(pageId: string, newTitle: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/${pageId}/rename`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ title: newTitle, organizationId })
    });
    if (!response.ok) throw new Error('Failed to rename page');
  }

  async movePage(pageId: string, newParentId: string | null, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/${pageId}/move`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ newParentId, organizationId })
    });
    if (!response.ok) throw new Error('Failed to move page');
  }

  async uploadImage(file: File, pageId: string, organizationId: string): Promise<{id: string, url: string, name: string}> {
    const authHeader = await this.getAuthHeader();
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('pageId', pageId);
    formData.append('organizationId', organizationId);

    console.log('Uploading image with headers:', authHeader); // Add this for debugging
    console.log('FormData:', {
      pageId,
      organizationId,
      fileName: file.name
    }); // Add this for debugging

    const response = await fetch(`${this.baseUrl}/pages/images/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Authorization': authHeader.Authorization
            // Remove Content-Type header - let browser set it for FormData
        },
        body: formData
    });

    if (!response.ok) {
        console.error('Upload failed with status:', response.status);
        console.error('Response:', await response.text()); // Add this for debugging
        throw new Error('Failed to upload image');
    }
    return response.json();
}

async refreshImageTokens(pageId: string, organizationId: string): Promise<{images: {id: string, url: string}[]}> {
    const headers = await this.getAuthHeader();
    console.log(organizationId)
    const response = await fetch(
        `${this.baseUrl}/pages/images/refresh-tokens?pageId=${pageId}&organizationId=${organizationId}`,
        {
            credentials: 'include',
            headers
        }
    );

    if (!response.ok) throw new Error('Failed to refresh image tokens');
    return response.json();
}

async deleteImage(imageId: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(
      `${this.baseUrl}/pages/images/${imageId}?organizationId=${organizationId}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers
      }
    );
  
    if (!response.ok) throw new Error('Failed to delete image');
  }

  async getTemplates(organizationId: string): Promise<PageNode[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/templates?organizationId=${organizationId}`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch templates');

    const data = await response.json();
    console.log(data.templates)
    return data.templates;
  }

  async toggleFavoriteTemplate(templateId: string): Promise<boolean> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/templates/${templateId}/favorite`, {
      method: 'POST',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to toggle template favorite');
    const data = await response.json();
    return data.isFavorite;
  }

  async getFolders(organizationId: string): Promise<FolderNode[]> {
    try {
        console.log('PagesService: Fetching folders for org:', organizationId);
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/pages/folders?organizationId=${organizationId}`, {
            credentials: 'include',
            headers
        });

        if (!response.ok) {
            console.error('Failed to fetch folders:', response.status, response.statusText);
            throw new Error('Failed to fetch folders');
        }

        const data = await response.json();
        console.log('PagesService: Received folder data:', data);
        // Ensure data.folders is an array; default to [] if not
        return Array.isArray(data.folders) ? data.folders : [];
    } catch (error) {
        console.error('Error in getFolders:', error);
        throw error;
    }
}

  async createFolder(
    name: string, 
    parentId: string | null, 
    organizationId: string,
    parentTable?: 'pages' | 'folders' | null
    ): Promise<FolderNode> {
        const headers = await this.getAuthHeader();
        const requestBody = { 
            name, 
            parentId: parentId || null, 
            organizationId,
            parentTable: parentId ? parentTable : null // Only include parentTable if there's a parentId
        };
        console.log('Creating folder with payload:', requestBody);
        
        const response = await fetch(`${this.baseUrl}/pages/folders`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error('Failed to create folder');
        }
        const data = await response.json();
        console.log('Raw response from server:', data);
        return data;
    }
    async updateFolder(folderId: string, name: string, parentId: string | null, organizationId: string) {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/pages/folders/${folderId}`, {
            method: 'PUT',
            credentials: 'include',
            headers,
            body: JSON.stringify({ name, parentId, organizationId })
        });
        if (!response.ok) throw new Error('Failed to update folder');
    }

    async deleteFolder(folderId: string) {
        const headers = await this.getAuthHeader();
        const response = await fetch(`${this.baseUrl}/pages/folders/${folderId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers
        });
        if (!response.ok) throw new Error('Failed to delete folder');
    }

// In PagesService class
async createTemplate(
    name: string,
    content: string,
    description: string,
    categoryId: number,
    organizationId: string
  ): Promise<PageNode> {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/pages/templates`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
            name,
            content,
            description,
            categoryId,
            organizationId,
            status: 'template'
        })
      });
  
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to create templates in this organization.');
        }
        throw new Error('Failed to create template');
      }
  
      return response.json();
    } catch (error) {
      console.error('Error in createTemplate:', error);
      throw error;
    }
  }

  async getTemplateCategories(): Promise<TemplateCategory[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages/template-categories`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch template categories');
    return response.json();
  }

  async getTemplateById(templateId: string, organizationId: string): Promise<PageNode> {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(
        `${this.baseUrl}/pages/templates/${templateId}?organizationId=${organizationId}`,
        {
          credentials: 'include',
          headers
        }
      );
      if (!response.ok) {
        if (response.status === 403) throw new Error('Access denied');
        throw new Error(`Failed to fetch template: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error in getTemplateById:', error);
      throw error;
    }
  }

  async updateTemplate(
    templateId: string,
    name: string,
    content: string,
    description: string,
    categoryId: number,
    organizationId: string
  ): Promise<void> {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch(`${this.baseUrl}/pages/templates/${templateId}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
            name,
            content,
            description,
            categoryId,
            organizationId,
            status: 'template'
        })
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error('Access denied');
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error in updateTemplate:', error);
      throw error;
    }
  }
}