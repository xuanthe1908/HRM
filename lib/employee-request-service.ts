import { apiClient } from './api';
import type { EmployeeRequest, CreateDependentPersonsRequest, ReviewRequest } from '@/types/employee-request';

export class EmployeeRequestService {
  // Get all employee requests
  static async getEmployeeRequests(filters?: {
    status?: string;
    type?: string;
    employeeId?: string;
  }): Promise<EmployeeRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);

    const response = await apiClient.get<EmployeeRequest[]>(`/employee-requests?${params.toString()}`);
    return response.data as EmployeeRequest[];
  }

  // Get specific request
  static async getEmployeeRequest(id: string): Promise<EmployeeRequest> {
    const response = await apiClient.get<EmployeeRequest>(`/employee-requests/${id}`);
    return response.data as EmployeeRequest;
  }

  // Create dependent persons request
  static async createDependentPersonsRequest(data: CreateDependentPersonsRequest): Promise<EmployeeRequest> {
    const response = await apiClient.post<EmployeeRequest>('/employee-requests', {
      request_type: 'dependent_persons',
      request_data: data
    });
    return response.data as EmployeeRequest;
  }

  // Review request (HR/Admin only)
  static async reviewRequest(id: string, review: ReviewRequest): Promise<EmployeeRequest> {
    const response = await apiClient.put<EmployeeRequest>(`/employee-requests/${id}`, review);
    return response.data as EmployeeRequest;
  }

  // Check if employee has pending dependent persons request
  static async hasPendingDependentRequest(employeeId: string): Promise<boolean> {
    try {
      const requests = await this.getEmployeeRequests({
        employeeId,
        type: 'dependent_persons',
        status: 'pending'
      });
      return requests.length > 0;
    } catch (error) {
      console.error('Error checking pending dependent request:', error);
      return false;
    }
  }
}
