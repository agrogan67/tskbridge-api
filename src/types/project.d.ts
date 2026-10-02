/**
 * Request to create a tenant-owned project.
 */
export interface CreateProjectRequest {
  name: string;
  description?: string;
  teamId: string;
}

/**
 * Request to update a project's status.
 */
export interface UpdateStatusRequest {
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ON_HOLD';
}

/**
 * Project data returned by the service.
 */
export interface ProjectResponse {
  id: string;
  name: string;
  description?: string | null;
  teamId: string;
  tenantId: string;
  status: UpdateStatusRequest['status'];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Paginated project search result.
 */
export interface PaginatedProjectResponse {
  projects: ProjectResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
