export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface User {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
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

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdBy: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  version: number;
  status: 'active' | 'inactive';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface License {
  id: string;
  organizationId: string;
  licenseKey: string;
  licenseType: string;
  seatsAllowed: number | null;
  seatsUsed: number;
  startsAt: string | Date;
  expiresAt: string | Date;
  isActive: boolean;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillingTransaction {
  id: string;
  organizationId: string;
  amount: number;
  currency: string;
  description?: string;
  invoiceNumber?: string;
  paymentMethod?: string;
  paymentStatus: string;
  transactionId?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  createdAt: string;
}

class AuthService {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly USER_KEY = 'user';
  private static readonly ADMIN_STATUS_KEY = 'isAdmin';
  private static readonly RDM_ACCESS_TOKEN_KEY = 'rdm_access_token'
  private static readonly RDM_REFRESH_TOKEN_KEY = 'rdm_refresh_token'
  private static readonly RDM_USER_KEY = 'rdm_user'

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
    console.log('Attempting to refresh portal access token');
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.log('No refresh token found, redirecting to login');
      this.clearAll();
      window.location.href = '/login';
      return null;
    }
  
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Refresh-Token': refreshToken
        }
      });
  
      console.log('Refresh token response status:', response.status);
  
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.token && data.refreshToken) {
          console.log('Successfully refreshed portal tokens');
          const tokens = {
            token: data.token,
            refreshToken: data.refreshToken
          };
          this.setTokens(tokens);
          return tokens;
        }
      }
      
      console.log('Failed to refresh portal tokens, redirecting to login');
      this.clearAll();
      window.location.href = '/login';
      return null;
    } catch (error) {
      console.error('Error refreshing portal tokens:', error);
      this.clearAll();
      window.location.href = '/login';
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

  // RDM Project Methods
  static async getProjects(): Promise<Project[]> {
    const rdmAuth = this.getRdmTokens();
    if (!rdmAuth?.tokens) throw new Error('No authentication tokens');
  
    const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/projects`, {
      headers: {
        'Authorization': `Bearer ${rdmAuth.tokens.token}`
      }
    });
  
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data = await response.json();
    return data.projects;
  }

  static async createProject(projectData: Partial<Project>): Promise<Project> {
    const rdmAuth = this.getRdmTokens();
    if (!rdmAuth) throw new Error('No authentication tokens');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${rdmAuth.tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) throw new Error('Failed to create project');
    return await response.json();
  }

  // Document Methods
  static async getDocuments(projectId: string): Promise<Document[]> {
    const rdmAuth = this.getRdmTokens();
    if (!rdmAuth) throw new Error('No authentication tokens');

    const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/projects/${projectId}/documents`, {
      headers: {
        'Authorization': `Bearer ${rdmAuth.tokens.token}`,
      }
    });

    if (!response.ok) throw new Error('Failed to fetch documents');
    const data = await response.json();
    return data.documents;
  }

  static async uploadDocument(
    projectId: string, 
    file: File, 
    metadata: Partial<Document>
  ): Promise<Document> {
    const rdmAuth = this.getRdmTokens();
    if (!rdmAuth) throw new Error('No authentication tokens');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/rdm/projects/${projectId}/documents`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${rdmAuth.tokens.token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) throw new Error('Failed to upload document');
    return await response.json();
  }

  static setRdmTokens(tokens: AuthTokens, user: User) {
    localStorage.setItem(this.RDM_ACCESS_TOKEN_KEY, tokens.token)
    localStorage.setItem(this.RDM_REFRESH_TOKEN_KEY, tokens.refreshToken)
    localStorage.setItem(this.RDM_USER_KEY, JSON.stringify(user))
  }

  static getRdmTokens(): { tokens: AuthTokens; user: User } | null {
    const token = localStorage.getItem(this.RDM_ACCESS_TOKEN_KEY)
    const refreshToken = localStorage.getItem(this.RDM_REFRESH_TOKEN_KEY)
    const userStr = localStorage.getItem(this.RDM_USER_KEY)

    if (!token || !refreshToken || !userStr) return null

    return {
      tokens: { token, refreshToken },
      user: JSON.parse(userStr) as User,
    }
  }

  static clearRdmTokens() {
    localStorage.removeItem(this.RDM_ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.RDM_REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.RDM_USER_KEY)
  }

  static async navigateToRdm(navigate: (path: string) => void): Promise<void> {
    try {
      const tokens = this.getTokens()
      const user = this.getUser()
  
      if (!tokens || !user) {
        throw new Error('No authentication data available')
      }
  
      // Check access to RDM
      const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/access`, {
        headers: {
          Authorization: `Bearer ${tokens.token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error('No access to RDM')
      }
  
      // If access is granted, store RDM tokens if needed
      this.setRdmTokens({ token: tokens.token, refreshToken: tokens.refreshToken }, user)
  
      // Then do a client-side navigation to /rdm
      navigate('/rdm')  // <-- This is the key change
    } catch (error) {
      console.error('Navigation error:', error)
      throw error
    }
  }
  
static async checkRdmAccess(): Promise<boolean> {
  const rdmAuth = this.getRdmTokens()
  if (!rdmAuth?.tokens) {
    console.log('No RDM tokens available for access check')
    return false
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/access`, {
      headers: {
        Authorization: `Bearer ${rdmAuth.tokens.token}`,
      },
    })
    return response.ok
  } catch (error) {
    console.error('RDM access check error:', error)
    return false
  }
}


static async verifyAndNavigateToRdm(navigate: (path: string) => void) {
  const tokens = AuthService.getTokens()
  const user = AuthService.getUser()

  if (!tokens || !user) {
    throw new Error('No authentication data available')
  }

  // Optional: verify the user has RDM access
  const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/access`, {
    headers: { Authorization: `Bearer ${tokens.token}` },
  })

  if (!response.ok) {
    throw new Error('No access to RDM')
  }

  // If user has access, store the separate RDM tokens in localStorage
  // (You may or may not want a different token from the server—this is up to you.)
  this.setRdmTokens({ token: tokens.token, refreshToken: tokens.refreshToken }, user)

  // Then navigate client-side to /rdm
  navigate('/rdm')
} 

static async refreshRdmAccessToken(): Promise<AuthTokens | null> {
  console.log('Attempting to refresh RDM access token');
  const refreshToken = localStorage.getItem(this.RDM_REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    console.log('No RDM refresh token found, redirecting to login');
    this.clearRdmTokens();
    window.location.href = '/login';
    return null;
  }

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Refresh-Token': refreshToken
      }
    });

    console.log('RDM refresh token response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token && data.refreshToken) {
        console.log('Successfully refreshed RDM tokens');
        const tokens = {
          token: data.token,
          refreshToken: data.refreshToken
        };
        const user = this.getUser();
        if (user) {
          this.setRdmTokens(tokens, user);
        }
        return tokens;
      }
    }

    console.log('Failed to refresh RDM tokens, redirecting to login');
    this.clearRdmTokens();
    window.location.href = '/login';
    return null;
  } catch (error) {
    console.error('Error refreshing RDM tokens:', error);
    this.clearRdmTokens();
    window.location.href = '/login';
    return null;
  }
}

static async getRdmOrganizations(): Promise<Organization[]> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");
  
  const response = await fetch(`${import.meta.env.VITE_API_URL}/rdm/organizations`, {
    headers: {
      Authorization: `Bearer ${tokens.token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to fetch RDM organizations");
  const data = await response.json();
  return data.organizations;
}

static async updateUser(userData: { firstName: string, lastName: string, email: string }): Promise<any> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/account/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update profile");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

// Update user password
static async updatePassword(currentPassword: string, newPassword: string): Promise<any> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/account/password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update password");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
}

static async getUserAvatar(): Promise<{hasAvatar: boolean, avatarUrl?: string, avatarName?: string}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/account/avatar`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to get avatar");
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting user avatar:", error);
    throw error;
  }
}

// Upload user avatar
static async uploadAvatar(file: File): Promise<{avatarUrl: string}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");

  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/account/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to upload avatar");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading avatar:", error);
    throw error;
  }
}

// Delete user avatar
static async deleteAvatar(): Promise<{success: boolean, message: string}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error("No authentication tokens");

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/account/avatar`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${tokens.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete avatar");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting avatar:", error);
    throw error;
  }
}

static async getOrganizationLicenses(): Promise<License[]> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/licenses`, {
    headers: {
      'Authorization': `Bearer ${tokens.token}`
    }
  });

  if (!response.ok) throw new Error('Failed to fetch licenses');
  const data = await response.json();
  return data.licenses;
}

static async addOrganizationLicense(organizationId: string, licenseData: Partial<License>): Promise<License> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/licenses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(licenseData),
  });

  if (!response.ok) throw new Error('Failed to add license');
  return await response.json();
}

static async updateOrganizationLicense(organizationId: string, licenseId: string, licenseData: Partial<License>): Promise<void> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/licenses/${licenseId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(licenseData),
  });

  if (!response.ok) throw new Error('Failed to update license');
}

static async getBillingHistory(organizationId: string, limit: number = 10, offset: number = 0): Promise<{
  transactions: BillingTransaction[],
  pagination: { total: number, limit: number, offset: number }
}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/organizations/${organizationId}/billing?limit=${limit}&offset=${offset}`, 
    {
      headers: {
        'Authorization': `Bearer ${tokens.token}`
      }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch billing history');
  return await response.json();
}

static async addBillingTransaction(organizationId: string, transactionData: Partial<BillingTransaction>): Promise<{id: string}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/billing`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transactionData),
  });

  if (!response.ok) throw new Error('Failed to add transaction');
  return await response.json();
}

static async addBillingTransactionWithInvoice(organizationId: string, formData: FormData): Promise<{id: string}> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/billing/with-invoice`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
      // Don't set Content-Type here as FormData will set it automatically with the boundary
    },
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to add transaction with invoice');
  return await response.json();
}

static async deleteBillingTransaction(organizationId: string, transactionId: string): Promise<void> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/organizations/${organizationId}/billing/${transactionId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${tokens.token}`,
    },
  });

  if (!response.ok) throw new Error('Failed to delete transaction');
}

static getInvoiceDownloadUrl(transactionId: string): string {
  // Basic URL for direct browser navigation
  return `${import.meta.env.VITE_API_URL}/billing/transactions/${transactionId}/download`;
}

static async downloadInvoice(transactionId: string): Promise<Blob> {
  const tokens = this.getTokens();
  if (!tokens) throw new Error('No authentication tokens');

  const response = await fetch(`${import.meta.env.VITE_API_URL}/billing/transactions/${transactionId}/download`, {
    headers: {
      'Authorization': `Bearer ${tokens.token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to download invoice');
  }
  
  return await response.blob();
}

}

export default AuthService;