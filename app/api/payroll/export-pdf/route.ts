import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { getCompanyInfo, type CompanyInfo } from '@/lib/company-service';
import puppeteer from 'puppeteer';

// POST /api/payroll/export-pdf - Xuất PDF bảng lương
export async function POST(req: NextRequest) {
  let browser;
  try {
    const userId = await authenticate(req);
    const { month, year, payrollIds } = await req.json();

    // Lấy thông tin công ty từ database
    const companyInfo = await getCompanyInfo();

    // Lấy dữ liệu payroll
    let query = supabaseAdmin
      .from('payroll_records')
      .select(`
        *,
        employee:employees!payroll_records_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
        )
      `);

    if (payrollIds && payrollIds.length > 0) {
      query = query.in('id', payrollIds);
    }

    if (month && year) {
      query = query.eq('month', month).eq('year', year);
    }

    const { data: payrolls, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payroll data:', error);
      return NextResponse.json({ error: 'Lỗi lấy dữ liệu bảng lương' }, { status: 500 });
    }

    if (!payrolls || payrolls.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu bảng lương' }, { status: 404 });
    }

    // Tạo HTML content cho PDF
    const htmlContent = generatePayrollPDFHTML(payrolls, month, year, companyInfo);

    // Tạo PDF từ HTML
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      }
    });

    const fileName = `bang-luong-${month || 'all'}-${year || new Date().getFullYear()}.pdf`;

    // Trả về PDF file với headers chính xác
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Export PDF error:', error);
    // Đảm bảo trả về JSON error khi có lỗi
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi tạo PDF' }, 
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

// GET /api/payroll/export-pdf - Xuất PDF qua query params
export async function GET(req: NextRequest) {
  let browser;
  try {
    const userId = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const payrollIds = searchParams.get('payrollIds')?.split(',');

    // Lấy thông tin công ty từ database
    const companyInfo = await getCompanyInfo();

    // Lấy dữ liệu payroll
    let query = supabaseAdmin
      .from('payroll_records')
      .select(`
        *,
        employee:employees!payroll_records_employee_id_fkey (
          id,
          name,
          employee_code,
          department:departments(name),
          position:positions(name)
        )
      `);

    if (payrollIds && payrollIds.length > 0) {
      query = query.in('id', payrollIds);
    }

    if (month && year) {
      query = query.eq('month', parseInt(month)).eq('year', parseInt(year));
    }

    const { data: payrolls, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payroll data:', error);
      return NextResponse.json({ error: 'Lỗi lấy dữ liệu bảng lương' }, { status: 500 });
    }

    if (!payrolls || payrolls.length === 0) {
      return NextResponse.json({ error: 'Không có dữ liệu bảng lương' }, { status: 404 });
    }

    // Tạo HTML content cho PDF
    const htmlContent = generatePayrollPDFHTML(payrolls, month, year, companyInfo);

    // Tạo PDF từ HTML
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      }
    });

    const fileName = `bang-luong-${month || 'all'}-${year || new Date().getFullYear()}.pdf`;

    // Trả về PDF file với headers chính xác
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Export PDF error:', error);
    // Đảm bảo trả về JSON error khi có lỗi
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Lỗi tạo PDF' }, 
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}

function generatePayrollPDFHTML(payrolls: any[], month?: string | null, year?: string | null, companyInfo?: CompanyInfo): string {
  const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1;
  const currentYear = year ? parseInt(year) : new Date().getFullYear();
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const totalGross = payrolls.reduce((sum, p) => sum + (p.gross_income || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.total_deductions || 0), 0);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Lương ${monthNames[currentMonth - 1]} ${currentYear}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 15px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
        }
        
        .company-name {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
            margin: 8px 0;
            color: #374151;
        }
        
        .period {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .print-date {
            font-size: 10px;
            color: #9ca3af;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            text-align: center;
        }
        
        .summary-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .summary-value {
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
        }
        
        .summary-value.positive {
            color: #059669;
        }
        
        .summary-value.negative {
            color: #dc2626;
        }
        
        .table-container {
            overflow-x: visible;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 25px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
        }
        
        th {
            background: #1e40af;
            color: white;
            font-weight: bold;
            padding: 8px 4px;
            text-align: center;
            border: 1px solid #1e40af;
            font-size: 7px;
        }
        
        td {
            padding: 5px 3px;
            border: 1px solid #e2e8f0;
            text-align: center;
            vertical-align: middle;
            font-size: 7px;
        }
        
        .text-left {
            text-align: left !important;
        }
        
        .text-right {
            text-align: right !important;
        }
        
        .font-medium {
            font-weight: 600;
        }
        
        .text-green {
            color: #059669;
        }
        
        .text-red {
            color: #dc2626;
        }
        
        .bg-gray {
            background-color: #f8fafc;
        }
        
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
        }
        
        .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin-top: 30px;
            text-align: center;
        }
        
        .signature-box {
            padding: 15px;
        }
        
        .signature-title {
            font-weight: bold;
            margin-bottom: 40px;
            color: #374151;
            font-size: 12px;
        }
        
        .signature-line {
            border-top: 1px solid #374151;
            margin-top: 8px;
            font-size: 10px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">${companyInfo?.name?.toUpperCase() || 'CÔNG TY ABC'}</div>
            ${companyInfo?.address ? `<div class="company-address" style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${companyInfo.address}</div>` : ''}
            ${companyInfo?.taxId ? `<div class="company-tax" style="font-size: 10px; color: #9ca3af; margin-bottom: 8px;">Mã số thuế: ${companyInfo.taxId}</div>` : ''}
            <div class="title">BẢNG LƯƠNG NHÂN VIÊN</div>
            <div class="period">${monthNames[currentMonth - 1]} năm ${currentYear}</div>
            <div class="print-date">In ngày: ${new Date().toLocaleDateString('vi-VN')}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-label">Tổng Thu Nhập Gộp</div>
                <div class="summary-value">${formatCurrency(totalGross)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Tổng Khấu Trừ</div>
                <div class="summary-value negative">${formatCurrency(totalDeductions)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Tổng Thực Lĩnh</div>
                <div class="summary-value positive">${formatCurrency(totalNet)}</div>
            </div>
        </div>
        
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th rowspan="2">STT</th>
                        <th rowspan="2">Mã NV</th>
                        <th rowspan="2">Họ và Tên</th>
                        <th rowspan="2">Phòng Ban</th>
                        <th rowspan="2">Chức Vụ</th>
                        <th rowspan="2">Lương Cơ Bản</th>
                        <th colspan="7">Phụ Cấp (VNĐ)</th>
                        <th rowspan="2">Tăng Ca</th>
                        <th rowspan="2">Thu Nhập Gộp</th>
                        <th colspan="4">Khấu Trừ Nhân Viên (VNĐ)</th>
                        <th rowspan="2">Thuế TNCN</th>
                        <th rowspan="2">Tổng Khấu Trừ</th>
                        <th rowspan="2">Thực Lĩnh</th>
                        <th rowspan="2">Trạng Thái</th>
                    </tr>
                    <tr>
                        <th>Nhà ở</th>
                        <th>Đi lại</th>
                        <th>Ăn trưa</th>
                        <th>Điện thoại</th>
                        <th>Chức vụ</th>
                        <th>Chuyên cần</th>
                        <th>Khác</th>
                        <th>BHXH</th>
                        <th>BHYT</th>
                        <th>BHTN</th>
                        <th>CĐ</th>
                    </tr>
                </thead>
                <tbody>
                    ${payrolls.map((payroll, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td class="text-left font-medium">${payroll.employee?.employee_code || ''}</td>
                            <td class="text-left font-medium">${payroll.employee?.name || ''}</td>
                            <td class="text-left">${payroll.employee?.department?.name || ''}</td>
                            <td class="text-left">${payroll.employee?.position?.name || ''}</td>
                            <td class="text-right">${formatCurrency(payroll.base_salary || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.housing_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.transport_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.meal_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.phone_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.position_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.attendance_allowance || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.other_allowances || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.overtime_pay || 0)}</td>
                            <td class="text-right font-medium text-green">${formatCurrency(payroll.gross_income || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.social_insurance_employee || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.health_insurance_employee || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.unemployment_insurance_employee || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.union_fee_employee || 0)}</td>
                            <td class="text-right">${formatCurrency(payroll.income_tax || 0)}</td>
                            <td class="text-right text-red">${formatCurrency(payroll.total_deductions || 0)}</td>
                            <td class="text-right font-medium text-green">${formatCurrency(payroll.net_salary || 0)}</td>
                            <td class="text-center">
                                <span class="${payroll.status === 'paid' ? 'text-green' : payroll.status === 'approved' ? 'text-blue' : payroll.status === 'rejected' ? 'text-red' : ''}">
                                    ${payroll.status === 'pending' ? 'Chờ duyệt' : 
                                      payroll.status === 'approved' ? 'Đã duyệt' : 
                                      payroll.status === 'paid' ? 'Đã thanh toán' : 
                                      payroll.status === 'rejected' ? 'Từ chối' : 'Không xác định'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="bg-gray">
                        <td colspan="14" class="text-right font-medium">TỔNG CỘNG:</td>
                        <td class="text-right font-medium text-green">${formatCurrency(totalGross)}</td>
                        <td colspan="5"></td>
                        <td class="text-right font-medium text-red">${formatCurrency(totalDeductions)}</td>
                        <td class="text-right font-medium text-green">${formatCurrency(totalNet)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        
        <div class="signatures">
            <div class="signature-box">
                <div class="signature-title">Người lập</div>
                <div class="signature-line">(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="signature-box">
                <div class="signature-title">Kế toán trưởng</div>
                <div class="signature-line">(Ký và ghi rõ họ tên)</div>
            </div>
            <div class="signature-box">
                <div class="signature-title">Giám đốc</div>
                <div class="signature-line">(Ký và ghi rõ họ tên)</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Báo cáo được tạo tự động từ hệ thống quản lý nhân sự</p>
            <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
        </div>
    </div>
</body>
</html>`;
}