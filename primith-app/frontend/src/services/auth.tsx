export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive?: boolean;
  roles?: Role[];
  organizations?: Organization[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  organizationId: string | null; 
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  services?: Service[];
}

// In auth.ts
export interface Service {
  id: string;
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
  organizations?: Organization[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  message: string;
}

export interface ChatResponse {
  response: string;
}

class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';
  private static readonly ADMIN_STATUS_KEY = 'isAdmin';

  static getTokens(): AuthTokens | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (!token || !refreshToken) return null;
    
    return { token, refreshToken };
  }

  static setTokens(tokens: AuthTokens) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setUser(user: User) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static clearAll() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.ADMIN_STATUS_KEY);
  }

  static async refreshAccessToken(): Promise<AuthTokens | null> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-Token': refreshToken
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token && data.refreshToken) {
          const tokens = {
            token: data.token,
            refreshToken: data.refreshToken
          };
          this.setTokens(tokens);
          return tokens;
        }
      }
      return null;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      return null;
    }
  }

  // New admin-related methods
  static async isSuperAdmin(): Promise<boolean> {
    try {
      const tokens = this.getTokens();
      if (!tokens) return false;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/check`, {
        headers: {
          'Authorization': `Bearer ${tokens.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(this.ADMIN_STATUS_KEY, JSON.stringify(data.success));
        return data.success;
      }
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  static getCachedAdminStatus(): boolean {
    const status = localStorage.getItem(this.ADMIN_STATUS_KEY);
    return status ? JSON.parse(status) : false;
  }

  // Admin API methods
  static async getOrganizations(): Promise<Organization[]> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/organizations`, {
      headers: {
        'Authorization': `Bearer ${tokens.token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch organizations');
    const data = await response.json();
    return data.organizations;
  }

  static async getServices(): Promise<Service[]> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/services`, {
      headers: {
        'Authorization': `Bearer ${tokens.token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch services');
    const data = await response.json();
    return data.services;
  }

  static async getRoles(): Promise<Role[]> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles`, {
      headers: {
        'Authorization': `Bearer ${tokens.token}`
      }
    });

    if (!response.ok) throw new Error('Failed to fetch roles');
    const data = await response.json();
    return data.roles;
  }

  static async getUsers(): Promise<User[]> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${tokens.token}`
        }
      });
  
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      return data.users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async createUser(userData: Partial<User>): Promise<User> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  
    if (!response.ok) throw new Error('Failed to create user');
    const data = await response.json();
    return data.user;
  }
  
  static async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
  
    if (!response.ok) throw new Error('Failed to update user');
    const data = await response.json();
    return data.user;
  }
  
  static async deleteUser(id: string): Promise<void> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    });
  
    if (!response.ok) throw new Error('Failed to delete user');
  }

  static async assignOrganizationService(orgId: string, serviceId: string, status: string): Promise<void> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/services/${serviceId}/organizations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organizationId: orgId, status }),
    });
  
    if (!response.ok) throw new Error('Failed to assign organization to service');
  }
  
  static async removeOrganizationService(orgId: string, serviceId: string): Promise<void> {
    const tokens = this.getTokens();
    if (!tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/services/${serviceId}/organizations/${orgId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    });
  
    if (!response.ok) throw new Error('Failed to remove organization from service');
  }

  // For Organizations
static async createOrganization(orgData: Partial<Organization>): Promise<Organization> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/organizations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orgData),
  });

  if (!response.ok) throw new Error('Failed to create organization');
  const data = await response.json();
  return data.organization;
}

static async updateOrganization(id: string, orgData: Partial<Organization>): Promise<Organization> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/organizations/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orgData),
  });

  if (!response.ok) throw new Error('Failed to update organization');
  const data = await response.json();
  return data.organization;
}

static async deleteOrganization(id: string): Promise<void> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/organizations/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
    },
  });

  if (!response.ok) throw new Error('Failed to delete organization');
}

// For Roles
static async createRole(roleData: Partial<Role>): Promise<Role> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  // Ensure organizationId is explicitly null for global roles
  const dataToSend = {
    ...roleData,
    organizationId: roleData.organizationId || null
  };

  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(dataToSend),
  });

  if (!response.ok) throw new Error('Failed to create role');
  const data = await response.json();
  return data.role;
}

static async updateRole(id: string, roleData: Partial<Role>): Promise<Role> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  console.log('Updating role with ID:', id);
  console.log('Request payload:', roleData);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorResponse = await response.json();
      console.error('Error response from server:', errorResponse);
      throw new Error('Failed to update role');
    }

    const updatedRole = await response.json();
    console.log('Updated role received:', updatedRole);
    return updatedRole;
  } catch (error) {
    console.error('Error in updateRole:', error);
    throw error;
  }
}

static async deleteRole(id: string): Promise<void> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/roles/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
    },
  });

  if (!response.ok) throw new Error('Failed to delete role');
}

static async sendChatMessage(message: string): Promise<ChatResponse> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
          method: 'POST',
          headers: {
              'Authorization': `Bearer ${tokens.token}`,
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
      });

      if (!response.ok) throw new Error('Failed to get chat response');
      return await response.json();
  } catch (error) {
      console.error('Error in chat:', error);
      throw error;
  }
}
  
}

export default AuthService;