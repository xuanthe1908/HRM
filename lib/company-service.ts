import { supabaseAdmin } from './supabase-server';

export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  email: string;
  phone: string;
}

/**
 * Lấy thông tin công ty từ database
 * Trả về thông tin mặc định nếu không tìm thấy
 */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  try {
    const { data: companySettings, error } = await supabaseAdmin
      .from('company_settings')
      .select('company_name, company_address, tax_id, company_email, company_phone')
      .single();

    if (!error && companySettings) {
      return {
        name: companySettings.company_name || 'CÔNG TY ABC',
        address: companySettings.company_address || '',
        taxId: companySettings.tax_id || '',
        email: companySettings.company_email || '',
        phone: companySettings.company_phone || ''
      };
    }

    // Fallback to default values
    return {
      name: 'CÔNG TY ABC',
      address: '',
      taxId: '',
      email: '',
      phone: ''
    };
  } catch (error) {
    console.error('Error fetching company info:', error);
    // Return default values on error
    return {
      name: 'CÔNG TY ABC',
      address: '',
      taxId: '',
      email: '',
      phone: ''
    };
  }
}

/**
 * Cập nhật thông tin công ty
 */
export async function updateCompanyInfo(updates: Partial<CompanyInfo>): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.company_name = updates.name;
    if (updates.address !== undefined) updateData.company_address = updates.address;
    if (updates.taxId !== undefined) updateData.tax_id = updates.taxId;
    if (updates.email !== undefined) updateData.company_email = updates.email;
    if (updates.phone !== undefined) updateData.company_phone = updates.phone;

    const { error } = await supabaseAdmin
      .from('company_settings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      console.error('Error updating company info:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating company info:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
