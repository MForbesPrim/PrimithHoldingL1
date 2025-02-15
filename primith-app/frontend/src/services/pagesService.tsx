import AuthService from '@/services/auth'
import { PageNode } from '@/types/pages'

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

  async getPages(organizationId: string): Promise<PageNode[]> {
    const headers = await this.getAuthHeader();
    console.log('Fetching pages for org:', organizationId);
    const response = await fetch(`${this.baseUrl}/pages?organizationId=${organizationId}`, {
        credentials: 'include',
        headers
    });
    if (!response.ok) throw new Error('Failed to fetch pages');
    const data = await response.json();
    console.log('Received pages:', data);
    return data;
    }

  async createPage(title: string, parentId: string | null, organizationId: string): Promise<PageNode> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/pages`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ title, parentId, organizationId })
    });
    if (!response.ok) throw new Error('Failed to create page');
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
    return data.templates;
  }
}