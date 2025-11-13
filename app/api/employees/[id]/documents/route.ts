import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST /api/employees/[id]/documents - Upload tài liệu cho nhân viên
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: employeeId } = params;
  
  try {
    const userId = await authenticate(req);
    
    // Kiểm tra quyền truy cập
    const { data: requestingUser } = await supabaseAdmin
      .from('employees')
      .select('role, id')
      .eq('auth_user_id', userId)
      .single();

    const { data: targetEmployee } = await supabaseAdmin
      .from('employees')
      .select('auth_user_id')
      .eq('id', employeeId)
      .single();

    // Chỉ cho phép admin/hr hoặc chính user đó upload
    const canUpload = requestingUser && 
      (['admin', 'hr'].includes(requestingUser.role) || 
       targetEmployee?.auth_user_id === userId);

    if (!canUpload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file || !documentType) {
      return NextResponse.json({ 
        error: 'File và loại tài liệu là bắt buộc' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Loại file không được hỗ trợ. Chỉ chấp nhận: JPG, PNG, PDF, DOC, DOCX' 
      }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File quá lớn. Tối đa 10MB' 
      }, { status: 400 });
    }

    // Create file path
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${documentType}_${timestamp}.${fileExtension}`;
    const filePath = `${employeeId}/${fileName}`;

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from('employee-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Lỗi upload file' 
      }, { status: 500 });
    }

    // Update employee record based on document type
    const updateData: any = {};
    
    switch (documentType) {
      case 'id_card_front':
        updateData.id_card_front_url = filePath;
        break;
      case 'id_card_back':
        updateData.id_card_back_url = filePath;
        break;
      case 'work_permit':
        updateData.work_permit_url = filePath;
        break;
      case 'contract':
        updateData.contract_file_url = filePath;
        break;
      default:
        // For other documents, add to related_files array
        const { data: currentEmployee } = await supabaseAdmin
          .from('employees')
          .select('related_files')
          .eq('id', employeeId)
          .single();
        
        const relatedFiles = currentEmployee?.related_files || [];
        relatedFiles.push(filePath);
        updateData.related_files = relatedFiles;
    }

    // Update employee record
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', employeeId);

    if (updateError) {
      console.error('Database update error:', updateError);
      // Try to delete the uploaded file
      await supabaseAdmin.storage
        .from('employee-documents')
        .remove([filePath]);
      
      return NextResponse.json({ 
        error: 'Lỗi cập nhật cơ sở dữ liệu' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath: filePath,
      documentType: documentType
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return handleError(error);
  }
}

// GET /api/employees/[id]/documents - Lấy danh sách tài liệu
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: employeeId } = params;
  
  try {
    const userId = await authenticate(req);
    
    // Kiểm tra quyền truy cập
    const { data: requestingUser } = await supabaseAdmin
      .from('employees')
      .select('role, id')
      .eq('auth_user_id', userId)
      .single();

    const { data: targetEmployee } = await supabaseAdmin
      .from('employees')
      .select('auth_user_id, id_card_front_url, id_card_back_url, work_permit_url, contract_file_url, related_files')
      .eq('id', employeeId)
      .single();

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Chỉ cho phép admin/hr hoặc chính user đó xem
    const canView = requestingUser && 
      (['admin', 'hr'].includes(requestingUser.role) || 
       targetEmployee?.auth_user_id === userId);

    if (!canView) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate signed URLs for documents
    const documents = [];
    
    if (targetEmployee.id_card_front_url) {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('employee-documents')
        .createSignedUrl(targetEmployee.id_card_front_url, 3600);
      
      documents.push({
        type: 'id_card_front',
        name: 'CCCD mặt trước',
        url: signedUrl?.signedUrl,
        path: targetEmployee.id_card_front_url
      });
    }

    if (targetEmployee.id_card_back_url) {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('employee-documents')
        .createSignedUrl(targetEmployee.id_card_back_url, 3600);
      
      documents.push({
        type: 'id_card_back',
        name: 'CCCD mặt sau',
        url: signedUrl?.signedUrl,
        path: targetEmployee.id_card_back_url
      });
    }

    if (targetEmployee.work_permit_url) {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('employee-documents')
        .createSignedUrl(targetEmployee.work_permit_url, 3600);
      
      documents.push({
        type: 'work_permit',
        name: 'Giấy phép lao động',
        url: signedUrl?.signedUrl,
        path: targetEmployee.work_permit_url
      });
    }

    if (targetEmployee.contract_file_url) {
      const { data: signedUrl } = await supabaseAdmin.storage
        .from('employee-documents')
        .createSignedUrl(targetEmployee.contract_file_url, 3600);
      
      documents.push({
        type: 'contract',
        name: 'Hợp đồng lao động',
        url: signedUrl?.signedUrl,
        path: targetEmployee.contract_file_url
      });
    }

    // Handle related files
    if (targetEmployee.related_files && targetEmployee.related_files.length > 0) {
      for (const filePath of targetEmployee.related_files) {
        const { data: signedUrl } = await supabaseAdmin.storage
          .from('employee-documents')
          .createSignedUrl(filePath, 3600);
        
        const fileName = filePath.split('/').pop() || 'Tài liệu khác';
        documents.push({
          type: 'other',
          name: fileName,
          url: signedUrl?.signedUrl,
          path: filePath
        });
      }
    }

    return NextResponse.json({ documents });

  } catch (error) {
    console.error('Get documents error:', error);
    return handleError(error);
  }
}

// DELETE /api/employees/[id]/documents - Xóa tài liệu
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { id: employeeId } = params;
  
  try {
    const userId = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('filePath');
    const documentType = searchParams.get('documentType');

    if (!filePath || !documentType) {
      return NextResponse.json({ 
        error: 'FilePath và documentType là bắt buộc' 
      }, { status: 400 });
    }

    // Kiểm tra quyền truy cập
    const { data: requestingUser } = await supabaseAdmin
      .from('employees')
      .select('role')
      .eq('auth_user_id', userId)
      .single();

    const { data: targetEmployee } = await supabaseAdmin
      .from('employees')
      .select('auth_user_id')
      .eq('id', employeeId)
      .single();

    // Chỉ cho phép admin/hr hoặc chính user đó xóa
    const canDelete = requestingUser && 
      (['admin', 'hr'].includes(requestingUser.role) || 
       targetEmployee?.auth_user_id === userId);

    if (!canDelete) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete file from storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('employee-documents')
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete file error:', deleteError);
    }

    // Update employee record
    const updateData: any = {};
    
    switch (documentType) {
      case 'id_card_front':
        updateData.id_card_front_url = null;
        break;
      case 'id_card_back':
        updateData.id_card_back_url = null;
        break;
      case 'work_permit':
        updateData.work_permit_url = null;
        break;
      case 'contract':
        updateData.contract_file_url = null;
        break;
      default:
        // Remove from related_files array
        const { data: currentEmployee } = await supabaseAdmin
          .from('employees')
          .select('related_files')
          .eq('id', employeeId)
          .single();
        
        const relatedFiles = (currentEmployee?.related_files || [])
          .filter((file: string) => file !== filePath);
        updateData.related_files = relatedFiles;
    }

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', employeeId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ 
        error: 'Lỗi cập nhật cơ sở dữ liệu' 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete document error:', error);
    return handleError(error);
  }
}
