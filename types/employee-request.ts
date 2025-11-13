export interface EmployeeRequest {
  id: string;
  employee_id: string;
  request_type: 'dependent_persons';
  status: 'pending' | 'approved' | 'rejected';
  request_data: DependentPersonsRequestData;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  employee?: {
    id: string;
    name: string;
    employee_code: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    employee_code: string;
  };
}

export interface DependentPersonsRequestData {
  current_count: number;
  requested_count: number;
  reason?: string;
  supporting_documents?: string[];
}

export interface CreateDependentPersonsRequest {
  current_count: number;
  requested_count: number;
  reason?: string;
  supporting_documents?: string[];
}

export interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
