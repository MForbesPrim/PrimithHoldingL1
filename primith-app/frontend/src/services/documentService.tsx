import { DocumentMetadata, FolderNode, TrashItem } from '@/types/document'
import AuthService from '@/services/auth'

export class DocumentService {
  private baseUrl = import.meta.env.VITE_API_URL;
  
  private async getAuthHeader() {
    let rdmAuth = AuthService.getRdmTokens();
    
    if (!rdmAuth?.tokens) {
      // Try to refresh tokens
      const refreshed = await AuthService.refreshRdmAccessToken();
      if (!refreshed) {
        throw new Error('No RDM authentication tokens available');
      }
      rdmAuth = AuthService.getRdmTokens();
      if (!rdmAuth) {
        throw new Error('Failed to get RDM tokens after refresh');
      }
    }
  
    // Check if token is about to expire
    try {
      const token = rdmAuth.tokens.token;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (expirationTime - Date.now() < fiveMinutes) {
        const refreshed = await AuthService.refreshRdmAccessToken();
        if (refreshed) {
          const newRdmAuth = AuthService.getRdmTokens();
          if (newRdmAuth) {
            rdmAuth = newRdmAuth;
          }
        }
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  
    if (!rdmAuth?.tokens?.token) {
      throw new Error('No valid RDM token available');
    }
  
    return {
      'Authorization': `Bearer ${rdmAuth.tokens.token}`,
      'Content-Type': 'application/json'
    };
  }
  
  async getDocuments(folderId: string | null = null, organizationId: string): Promise<DocumentMetadata[]> {
    const url = new URL(`${this.baseUrl}/documents`);
    if (folderId) url.searchParams.append('folderId', folderId);
    url.searchParams.append('organizationId', organizationId);

    const headers = await this.getAuthHeader();
    const response = await fetch(url.toString(), {
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch documents');
    return response.json();
  }

  async uploadDocument(file: File, folderId: string | null, organizationId: string): Promise<DocumentMetadata> {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)
    formData.append('organizationId', organizationId)

    const headers = await this.getAuthHeader()
    const response = await fetch(`${this.baseUrl}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Authorization': headers.Authorization },
      body: formData,
    })
    
    if (!response.ok) throw new Error('Failed to upload document')
    return response.json()
  }

  async getFolders(organizationId: string): Promise<FolderNode[]> {
    const headers = await this.getAuthHeader();
    const url = `${this.baseUrl}/folders?organizationId=${organizationId}`;
  
    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
  
      if (!response.ok) {
        console.error('Failed to fetch folders. Status:', response.status);
        throw new Error('Failed to fetch folders');
      }
  
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in getFolders:', error);
      throw error;
    }
  } 
  
  async createFolder(name: string, parentId: string | null = null, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/folders`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ name, parentId, organizationId }),
    });
    if (!response.ok) throw new Error('Failed to create folder');
  }

  async deleteFolder(folderId: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/folders/${folderId}?organizationId=${organizationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete folder');
  }

  async renameFolder(folderId: string, newName: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/folders/${folderId}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ name: newName, organizationId }),
    });
    if (!response.ok) throw new Error('Failed to rename folder');
  }

  async moveFolder(folderId: string, newParentId: string | null, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/folders/${folderId}/move`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ newParentId, organizationId }),
    });
    if (!response.ok) throw new Error('Failed to move folder');
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const headers = await this.getAuthHeader();
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/download`, {
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      
      // Read the entire response as a blob
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      return blob;
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/documents/${documentId}?organizationId=${organizationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete document');
  }

  async trashItem(id: string, type: 'folder' | 'document', organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/${type}s/${id}/trash?organizationId=${organizationId}`, {
      method: 'PUT',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error(`Failed to trash ${type}`);
  }

  async getTrashItems(organizationId: string): Promise<TrashItem[]> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/trash?organizationId=${organizationId}`, {
      credentials: 'include',
      headers
    });
    if (!response.ok) {
      throw new Error('Failed to fetch trash items');
    }
    const text = await response.text();
    console.log('Raw trash response:', text);
    try {
      const data = JSON.parse(text);
      return data || [];
    } catch (e) {
      console.error('Error parsing JSON:', e);
      throw e;
    }
  } 

  async restoreItem(id: string, type: 'folder' | 'document', organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/${type}s/${id}/restore?organizationId=${organizationId}`, {
      method: 'PUT',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error(`Failed to restore ${type}`);
  }

  async permanentlyDelete(id: string, type: 'folder' | 'document', organizationId: string): Promise<void> {
    const headers = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/trash/${type}s/${id}?organizationId=${organizationId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers
    });
    if (!response.ok) throw new Error(`Failed to permanently delete ${type}`);
  }
}