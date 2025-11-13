import { Employee } from './services'

export function isProfileComplete(employee: Employee | null): boolean {
  if (!employee) return false
  
  const requiredFields = [
    'phone', 'gender', 'birth_date', 'marital_status', 'ethnicity', 
    'religion', 'nationality', 'education_level', 'id_number', 
    'id_card_issue_date', 'id_card_issue_place',
    'permanent_address', 'current_address', 'bank_account', 'bank_name',
    'id_card_front_url', 'id_card_back_url'
  ]
  
  const basicFieldsComplete = requiredFields.every(field => {
    const value = employee[field as keyof Employee]
    return value !== null && value !== undefined && value !== ''
  })

  // If employee has dependents (children_count > 0), they must have submitted a request
  // This will be checked asynchronously in the component
  return basicFieldsComplete
}

export function getMissingFields(employee: Employee | null): string[] {
  if (!employee) return []
  
  const requiredFields = [
    { field: 'phone', label: 'Số điện thoại' },
    { field: 'gender', label: 'Giới tính' },
    { field: 'birth_date', label: 'Ngày sinh' },
    { field: 'marital_status', label: 'Tình trạng hôn nhân' },
    { field: 'ethnicity', label: 'Dân tộc' },
    { field: 'religion', label: 'Tôn giáo' },
    { field: 'nationality', label: 'Quốc tịch' },
    { field: 'education_level', label: 'Trình độ học vấn' },
    { field: 'id_number', label: 'Số CCCD/CMND' },
    { field: 'id_card_issue_date', label: 'Ngày cấp CCCD' },
    { field: 'id_card_issue_place', label: 'Nơi cấp CCCD' },
    { field: 'permanent_address', label: 'Địa chỉ thường trú' },
    { field: 'current_address', label: 'Địa chỉ tạm trú' },
    { field: 'bank_account', label: 'Số tài khoản' },
    { field: 'bank_name', label: 'Tên ngân hàng' },
    { field: 'id_card_front_url', label: 'Ảnh mặt trước CCCD' },
    { field: 'id_card_back_url', label: 'Ảnh mặt sau CCCD' }
  ]
  
  return requiredFields
    .filter(({ field }) => {
      const value = employee[field as keyof Employee]
      return value === null || value === undefined || value === ''
    })
    .map(({ label }) => label)
}
