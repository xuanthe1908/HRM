import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    await authenticate(req);

    console.log('🚀 Bắt đầu khởi tạo dữ liệu phòng ban và chức vụ...');

    // Thêm phòng ban mới
    const newDepartments = [
      {
        name: 'Headhunter',
        description: 'Phòng ban chuyên về tuyển dụng và tìm kiếm nhân tài'
      },
      {
        name: 'BD',
        description: 'Phòng ban Business Development - Phát triển kinh doanh'
      }
    ];

    console.log('📝 Thêm phòng ban...');
    const departmentResults = [];
    for (const dept of newDepartments) {
      const { data: deptData, error: deptError } = await supabaseAdmin
        .from('departments')
        .insert(dept)
        .select()
        .single();

      if (deptError) {
        console.error(`❌ Lỗi thêm phòng ban ${dept.name}:`, deptError);
        departmentResults.push({ name: dept.name, success: false, error: deptError.message });
      } else {
        console.log(`✅ Đã thêm phòng ban: ${dept.name} (ID: ${deptData.id})`);
        departmentResults.push({ name: dept.name, success: true, id: deptData.id });
      }
    }

    // Thêm chức vụ mới
    const newPositions = [
      {
        name: 'Chuyên Viên',
        description: 'Chuyên viên trong các lĩnh vực chuyên môn'
      },
      {
        name: 'Intern',
        description: 'Thực tập sinh'
      }
    ];

    console.log('📝 Thêm chức vụ...');
    const positionResults = [];
    for (const pos of newPositions) {
      const { data: posData, error: posError } = await supabaseAdmin
        .from('positions')
        .insert(pos)
        .select()
        .single();

      if (posError) {
        console.error(`❌ Lỗi thêm chức vụ ${pos.name}:`, posError);
        positionResults.push({ name: pos.name, success: false, error: posError.message });
      } else {
        console.log(`✅ Đã thêm chức vụ: ${pos.name} (ID: ${posData.id})`);
        positionResults.push({ name: pos.name, success: true, id: posData.id });
      }
    }

    // Lấy danh sách hiện tại để hiển thị
    const { data: allDepartments } = await supabaseAdmin
      .from('departments')
      .select('id, name, description')
      .order('name');

    const { data: allPositions } = await supabaseAdmin
      .from('positions')
      .select('id, name, description, department_id')
      .order('name');

    console.log('🎉 Hoàn thành khởi tạo dữ liệu!');

    return NextResponse.json({
      success: true,
      message: 'Đã khởi tạo dữ liệu phòng ban và chức vụ thành công',
      departments: {
        added: departmentResults,
        all: allDepartments
      },
      positions: {
        added: positionResults,
        all: allPositions
      }
    });

  } catch (error) {
    console.error('💥 Lỗi:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Đã có lỗi xảy ra khi khởi tạo dữ liệu',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 