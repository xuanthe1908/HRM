import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, authenticate, handleError } from '@/lib/supabase-server';
import { auditService } from '@/lib/audit-service';
import * as XLSX from 'xlsx';
import { parseMonthlyCSV, processMonthlyRecords } from './monthly-parser';

interface MitaproCSVRow {
  stt?: string;
  employee_code: string;
  employee_name: string;
  department?: string;
  date: string;
  day_of_week?: string;
  check_in: string;
  check_out: string;
  late?: string;
  early?: string;
  work_factor?: string;
  total_hours: string;
  overtime?: string;
  total_overall?: string;
  shift?: string;
}

interface ProcessResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    employee_code: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    employee_code: string;
    message: string;
  }>;
}

// POST /api/attendance/import - Import CSV/Excel từ máy chấm công
export async function POST(req: NextRequest) {
  try {
    const userId = await authenticate(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string; // 'monthly' or 'daily'
    
    console.log('📁 File received:', file?.name, 'Size:', file?.size, 'Format:', format);
    
    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    console.log('📋 File type detection:', { fileName, isCSV, isExcel });

    if (!isCSV && !isExcel) {
      return NextResponse.json({ error: 'File phải có định dạng CSV hoặc Excel (XLSX/XLS)' }, { status: 400 });
    }

    let result;

    // Handle monthly format
    if (format === 'monthly' && isCSV) {
      console.log('📄 Processing monthly CSV file...');
      const csvContent = await file.text();
      
      // Auto-detect detailed Mitapro format and fallback if present
      const detailRecords = parseMitaproDetailCSV(csvContent);
      if (detailRecords.length > 0) {
        console.log('🧩 Detected detailed Mitapro CSV while format=monthly. Using detailed parser.');
        result = await processImportRecords(detailRecords, userId);
      } else {
        const { records, month, year, dayOfWeekMap } = await parseMonthlyCSV(csvContent);
        result = await processMonthlyRecords(records, month, year, userId, dayOfWeekMap);
      }
    } else {
      // Handle daily format (existing logic)
      let records: any[] = [];

      if (isCSV) {
        console.log('📄 Processing CSV file...');
        const csvContent = await file.text();
        // Try Mitapro detailed block parser first
        const mitaproRecords = parseMitaproDetailCSV(csvContent);
        if (mitaproRecords.length > 0) {
          console.log('🧩 Detected Mitapro detailed CSV format. Parsed records:', mitaproRecords.length);
          records = mitaproRecords;
        } else {
          records = parseCSV(csvContent);
        }
      } else if (isExcel) {
        console.log('📊 Processing Excel file...');
        const arrayBuffer = await file.arrayBuffer();
        records = parseExcel(arrayBuffer);
      }

      console.log('📈 Total records parsed:', records.length);

      result = await processImportRecords(records, userId);
    }

    console.log('📊 Import result:', result);

    // Bỏ qua ghi audit log để tránh lỗi
    // await auditService.log({
    //   user_id: user.id,
    //   action: 'import_attendance_file',
    //   resource: 'attendance_records',
    //   details: JSON.stringify({
    //     filename: file.name,
    //     file_type: isCSV ? 'csv' : 'excel',
    //     success_count: result.success,
    //     failed_count: result.failed
    //   })
    // });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error in import process:', error);
    return handleError(error);
  }
}

// Helper function để parse Excel file
function parseExcel(arrayBuffer: ArrayBuffer): any[] {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('📊 Sheet names:', workbook.SheetNames);
    console.log('📋 Using sheet:', sheetName);
    
    // Chuyển đổi sheet thành JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log('📈 Raw data rows:', jsonData.length);
    console.log('📋 First row (headers):', jsonData[0]);
    console.log('📋 Second row (sample):', jsonData[1]);
    
    if (jsonData.length === 0) {
      console.log('❌ No data found in Excel file');
      return [];
    }

    // Lấy header từ dòng đầu tiên
    const headers = (jsonData[0] as any[]).map((header: any) => {
      const normalized = String(header).toLowerCase().trim();
      console.log('🔍 Processing header:', header, '->', normalized);
      
      // Mapping cho cấu trúc file thực tế
      if (normalized.includes('stt') || normalized.includes('no')) return 'stt';
      if (normalized.includes('mã nhân viên') || normalized.includes('employee code') || normalized.includes('code') || normalized.includes('mã')) return 'employee_code';
      if (normalized.includes('tên nhân viên') || normalized.includes('employee name') || normalized.includes('name') || normalized.includes('tên')) return 'employee_name';
      if (normalized.includes('phòng ban') || normalized.includes('department')) return 'department';
      if (normalized.includes('ngày') || normalized.includes('date')) return 'date';
      if (normalized.includes('thứ') || normalized.includes('day')) return 'day_of_week';
      if (normalized.includes('giờ vào') || normalized.includes('check in') || normalized.includes('in') || normalized.includes('vào')) return 'check_in';
      if (normalized.includes('giờ ra') || normalized.includes('check out') || normalized.includes('out') || normalized.includes('ra')) return 'check_out';
      if (normalized.includes('trễ') || normalized.includes('late')) return 'late';
      if (normalized.includes('sớm') || normalized.includes('early')) return 'early';
      if (normalized.includes('công') || normalized.includes('work factor')) return 'work_factor';
      if (normalized.includes('tổng giờ') || normalized.includes('total hours') || normalized.includes('total')) return 'total_hours';
      if (normalized.includes('tăng ca') || normalized.includes('overtime')) return 'overtime';
      if (normalized.includes('g toàn') || normalized.includes('total overall')) return 'total_overall';
      if (normalized.includes('ca') || normalized.includes('shift')) return 'shift';
      
      return normalized;
    });

    console.log('📋 Mapped headers:', headers);

    // Chuyển đổi dữ liệu thành format chuẩn
    const records = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const record: any = {};
      headers.forEach((header: string, index: number) => {
        record[header] = row[index] ? String(row[index]).trim() : '';
      });
      
      console.log(`📝 Row ${i + 1}:`, record);
      
      // Chỉ thêm record nếu có mã nhân viên
      if (record.employee_code && record.employee_code !== '') {
        records.push(record);
        console.log(`✅ Added record for employee: ${record.employee_code}`);
      } else {
        console.log(`❌ Skipped row ${i + 1} - no employee_code:`, record.employee_code);
      }
    }

    // Nếu không có record nào hợp lệ, thử fallback với cột thứ 2 làm employee_code (cột B)
    if (records.length === 0 && jsonData.length > 1) {
      console.log('🔄 No valid records found, trying fallback with column B as employee_code...');
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row[1] && String(row[1]).trim() !== '') { // Cột B (index 1) là mã nhân viên
          const record: any = {
            employee_code: String(row[1]).trim(), // Cột B
            employee_name: row[2] ? String(row[2]).trim() : '', // Cột C
            department: row[3] ? String(row[3]).trim() : '', // Cột D
            date: row[4] ? String(row[4]).trim() : '', // Cột E
            day_of_week: row[5] ? String(row[5]).trim() : '', // Cột F
            check_in: row[6] ? String(row[6]).trim() : '', // Cột G
            check_out: row[7] ? String(row[7]).trim() : '', // Cột H
            late: row[8] ? String(row[8]).trim() : '', // Cột I
            early: row[9] ? String(row[9]).trim() : '', // Cột J
            work_factor: row[10] ? String(row[10]).trim() : '', // Cột K
            total_hours: row[11] ? String(row[11]).trim() : '', // Cột L
            overtime: row[12] ? String(row[12]).trim() : '', // Cột M
            total_overall: row[13] ? String(row[13]).trim() : '', // Cột N
            shift: row[14] ? String(row[14]).trim() : '' // Cột O
          };
          records.push(record);
          console.log(`✅ Added fallback record for employee: ${record.employee_code}`);
        }
      }
    }

    console.log(`📊 Total valid records: ${records.length}`);
    return records;
  } catch (error) {
    console.error('❌ Error parsing Excel file:', error);
    throw new Error(`Lỗi đọc file Excel: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
  }
}

// Helper function để parse CSV thủ công
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((header: string) => {
    const normalized = header.toLowerCase().trim().replace(/"/g, '');
    if (normalized.includes('mã') || normalized.includes('code')) return 'employee_code';
    if (normalized.includes('tên') || normalized.includes('name')) return 'employee_name';
    if (normalized.includes('ngày') || normalized.includes('date')) return 'date';
    if (normalized.includes('vào') || normalized.includes('in')) return 'check_in';
    if (normalized.includes('ra') || normalized.includes('out')) return 'check_out';
    if (normalized.includes('tổng') || normalized.includes('total')) return 'total_hours';
    if (normalized.includes('trạng thái') || normalized.includes('status')) return 'status';
    if (normalized.includes('ghi chú') || normalized.includes('notes')) return 'notes';
    return normalized;
  });

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((val: string) => val.trim().replace(/"/g, ''));
    const record: any = {};
    headers.forEach((header: string, index: number) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }

  return records;
}

// Parser for Mitapro detailed CSV blocks (per-employee sections)
function parseMitaproDetailCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n');
  if (lines.length === 0) return [];

  const records: any[] = [];
  let currentEmployeeCode: string | null = null;
  let currentEmployeeName: string | null = null;
  let inDetailTable = false;

  const stripCommas = (s: string) => s.replace(/,+$/g, '');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Detect employee header line: contains employee code and name
    // Example: "Mã nhân viên: 00002         Tên nhân viên: Dung         Phòng ban: --------,,,,,"
    if (/nh[aâ]n\s*vi[eê]n\s*:\s*\d{5}/i.test(line) || /:\s*\d{5}.*t[eê]n\s*nh[aâ]n\s*vi[eê]n/i.test(line)) {
      // Extract 5-digit code
      const codeMatch = line.match(/(\d{5})/);
      // Extract name between "Tên nhân viên:" and next comma/spacing
      const nameMatch = stripCommas(line).match(/t[eê]n\s*nh[aâ]n\s*vi[eê]n\s*:\s*([^,]+)/i);
      currentEmployeeCode = codeMatch ? codeMatch[1] : null;
      currentEmployeeName = nameMatch ? nameMatch[1].trim() : null;
      inDetailTable = false; // reset until we hit the header
      continue;
    }

    // Detect the start of the detail table header
    if (/^ng[aà]y\s*,\s*th/i.test(line)) {
      // Next line is subheaders, data starts after that
      inDetailTable = true;
      // Skip the subheader line if present
      // Ensure we don't go out of bounds
      if (i + 1 < lines.length && /v[àa]o\s*,\s*ra/i.test(lines[i + 1])) {
        i += 1;
      }
      continue;
    }

    // Parse detail rows when inside a table and with an active employee
    if (inDetailTable && currentEmployeeCode) {
      // Data rows start with a date like DD/MM/YYYY
      const parts = line.split(',');
      if (parts.length < 4) continue;
      const dateStr = parts[0]?.trim();
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        // Possibly reached the end of this block
        // If a new section header appears, stop table mode
        if (/^b[aă]?ng\s*chi\s*ti[eê]?t/i.test(line) || /nh[aâ]n\s*vi[eê]n\s*:\s*\d{5}/i.test(line)) {
          inDetailTable = false;
        }
        continue;
      }

      // Columns: 0 Ngày, 1 Thứ, 2 Vào1, 3 Ra1, 4 Vào2, 5 Ra2, 6 Vào3, 7 Ra3, ...
      const checkIn = (parts[2] || '').trim();
      const checkOut = (parts[3] || '').trim();

      if (checkIn && checkOut && checkIn !== '-' && checkOut !== '-') {
        records.push({
          employee_code: currentEmployeeCode,
          employee_name: currentEmployeeName || '',
          date: dateStr,
          check_in: checkIn,
          check_out: checkOut,
          // Optionally pass shift symbol if present near end columns, but not required
        });
      }
    }
  }

  return records;
}

async function processImportRecords(records: any[], userId: string): Promise<ProcessResult> {
  try {
    // Lấy danh sách nhân viên để mapping - sử dụng query đơn giản
    console.log('🔍 Fetching employees from database...');
    
    // Thử query đơn giản trước
    const { data: employees, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, name')
      .eq('status', 'active');

    if (employeeError) {
      console.error('❌ Error with status filter, trying without filter...');
      
      // Thử query không có filter
      const { data: allEmployees, error: allEmployeeError } = await supabaseAdmin
        .from('employees')
        .select('id, employee_code, name');
      
      if (allEmployeeError) {
        console.error('❌ Error fetching employees:', allEmployeeError);
        console.error('❌ Error details:', {
          message: allEmployeeError.message,
          details: allEmployeeError.details,
          hint: allEmployeeError.hint
        });
        throw new Error(`Lỗi khi lấy danh sách nhân viên: ${allEmployeeError.message}`);
      }
      
      if (!allEmployees || allEmployees.length === 0) {
        console.error('❌ No employees found in database');
        throw new Error('Không tìm thấy nhân viên nào trong hệ thống');
      }
      
      console.log('📊 Total employees in database:', allEmployees.length);
      console.log('📋 Sample employees:', allEmployees.slice(0, 5));
      
      const employeeMap = new Map(
        allEmployees.map(emp => [emp.employee_code, emp])
      );
      
      console.log('🔍 Employee codes in map:', Array.from(employeeMap.keys()));
      
      return processRecordsWithMap(records, employeeMap, userId);
    }

    if (!employees || employees.length === 0) {
      console.error('❌ No active employees found in database');
      throw new Error('Không tìm thấy nhân viên active nào trong hệ thống');
    }

    console.log('📊 Total active employees in database:', employees.length);
    console.log('📋 Sample employees:', employees.slice(0, 5));

    const employeeMap = new Map<string, any>();
    employees.forEach(emp => {
      const code = emp.employee_code || '';
      employeeMap.set(code, emp);
      // Also index by numeric part without prefix
      const numeric = code.replace(/\D/g, '');
      if (numeric) employeeMap.set(numeric, emp);
      // Also index by NV + 5-digit (normalized)
      if (numeric) employeeMap.set(`NV${numeric.padStart(5, '0')}`, emp);
    });

    console.log('🔍 Employee codes in map:', Array.from(employeeMap.keys()));
    
    return processRecordsWithMap(records, employeeMap, userId);
  } catch (error) {
    console.error('❌ Error in processImportRecords:', error);
    throw error;
  }
}

// Tách logic xử lý records ra function riêng
async function processRecordsWithMap(records: any[], employeeMap: Map<string, any>, userId: string): Promise<ProcessResult> {
  const result: ProcessResult = {
    success: 0,
    failed: 0,
    errors: [],
    warnings: []
  };

  for (let i = 0; i < records.length; i++) {
    const row = records[i] as MitaproCSVRow;
    const rowNumber = i + 2; // +2 vì bắt đầu từ row 2 (có header)

    console.log(`📝 Processing row ${rowNumber}:`, {
      employee_code: row.employee_code,
      date: row.date,
      check_in: row.check_in,
      check_out: row.check_out
    });

    try {
      const attendanceRecord = await processRow(row, employeeMap, userId);
      
      if (attendanceRecord.warnings.length > 0) {
        result.warnings.push(...attendanceRecord.warnings.map(w => ({
          row: rowNumber,
          employee_code: row.employee_code,
          message: w
        })));
      }

      if (attendanceRecord.data) {
        await insertOrUpdateAttendance(attendanceRecord.data);
        result.success++;
        console.log(`✅ Successfully processed row ${rowNumber} for employee ${row.employee_code}`);
      }
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
      console.error(`❌ Error processing row ${rowNumber}:`, errorMessage);
      result.errors.push({
        row: rowNumber,
        employee_code: row.employee_code,
        error: errorMessage
      });
    }
  }

  return result;
}

async function processRow(
  row: MitaproCSVRow,
  employeeMap: Map<string, any>,
  userId: string
) {
  const warnings: string[] = [];
  
  try {
    console.log(`🔍 Looking for employee with code: "${row.employee_code}"`);
    console.log(`📋 Available employee codes:`, Array.from(employeeMap.keys()));
    
    // Normalize and validate employee exists
    const rawCode = (row.employee_code || '').trim();
    const numeric = rawCode.replace(/\D/g, '');
    const candidates = [rawCode];
    if (numeric) {
      if (numeric.length === 5) {
        candidates.unshift(`NV${numeric}`);
      }
      candidates.push(`NV${numeric.padStart(5, '0')}`);
      candidates.push(numeric);
    }
    let employee: any | undefined;
    for (const key of candidates) {
      employee = employeeMap.get(key);
      if (employee) break;
    }
    if (!employee) {
      console.log(`❌ Employee not found in map. Searching for: "${row.employee_code}"`);
      console.log(`📋 Map contains:`, Array.from(employeeMap.entries()));
      throw new Error(`Không tìm thấy nhân viên với mã: ${row.employee_code}`);
    }

    console.log(`✅ Found employee:`, employee);

    // Parse date
    const date = parseDate(row.date);
    if (!date) {
      throw new Error(`Định dạng ngày không hợp lệ: ${row.date}`);
    }

    console.log(`📅 Parsed date:`, date);

    // Parse times
    const checkIn = parseTime(row.check_in, date);
    const checkOut = parseTime(row.check_out, date);

    console.log(`⏰ Parsed times:`, {
      check_in: checkIn,
      check_out: checkOut,
      original_check_in: row.check_in,
      original_check_out: row.check_out
    });

    // Determine status từ dữ liệu Mitapro
    const status = determineAttendanceStatus(row, checkIn, checkOut, warnings);

    console.log(`📊 Determined status:`, status);

    // Calculate overtime
    const overtimeHours = calculateOvertime(checkIn, checkOut, status);

    console.log(`⏰ Calculated overtime:`, overtimeHours);

    // Sửa lỗi múi giờ: Sử dụng format YYYY-MM-DD theo múi giờ local thay vì UTC
    const formatDateToLocal = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const result = {
      data: {
        employee_id: employee.id,
        date: formatDateToLocal(date),
        status,
        check_in_time: checkIn?.toISOString(),
        check_out_time: checkOut?.toISOString(),
        overtime_hours: overtimeHours,
        notes: row.shift || null // Sử dụng shift làm notes
        // Bỏ qua created_by để tránh lỗi foreign key constraint
      },
      warnings
    };

    console.log(`✅ Processed row result:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error processing row:`, error);
    throw error;
  }
}

function parseDate(dateStr: string): Date | null {
  // Kiểm tra nếu là số serial của Excel (số ngày từ 1/1/1900)
  if (/^\d+$/.test(dateStr)) {
    const serialNumber = parseInt(dateStr);
    // Excel bắt đầu từ 1/1/1900, nhưng có lỗi leap year nên cần điều chỉnh
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (serialNumber - 2) * 24 * 60 * 60 * 1000);
    
    console.log(`📅 Converting Excel serial ${serialNumber} to date:`, date);
    
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Hỗ trợ các format ngày phổ biến từ Mitapro
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;
      if (format.source.startsWith('^(\\d{4})')) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else {
        // DD/MM/YYYY or DD-MM-YYYY
        [, day, month, year] = match;
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  console.log(`❌ Could not parse date: ${dateStr}`);
  return null;
}

function parseTime(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr || timeStr === '' || timeStr === '-') return null;
  
  // Hỗ trợ format HH:MM hoặc HH:MM:SS
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  
  const [, hours, minutes, seconds = '0'] = match;
  const date = new Date(baseDate);
  date.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds));
  
  return date;
}

function determineAttendanceStatus(
  row: MitaproCSVRow,
  checkIn: Date | null,
  checkOut: Date | null,
  warnings: string[]
): string {
  // Kiểm tra shift để xác định trạng thái cơ bản
  if (row.shift) {
    const shiftLower = row.shift.toLowerCase();
    // V = nghỉ không lương
    if (shiftLower === 'v' || shiftLower.includes('nghỉ') || shiftLower.includes('vắng')) return 'absent';
    // P = nghỉ phép có lương
    if (shiftLower === 'p' || shiftLower.includes('phép')) return 'paid_leave';
    // S = nghỉ ốm
    if (shiftLower === 's' || shiftLower.includes('ốm') || shiftLower.includes('sick')) return 'sick_leave';
    // HC (hành chính) - cần tính toán dựa trên thời gian thực tế
    if (shiftLower === 'hc' || shiftLower.includes('việc') || shiftLower.includes('hành chính')) {
      // Nếu có thời gian check-in/check-out, tính toán dựa trên thời gian thực tế
      if (checkIn && checkOut) {
        const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        if (workHours >= 7) {
          return 'present_full';
        } else if (workHours >= 2) {
          return 'present_half';
        } else {
          warnings.push(`HC nhưng giờ làm việc quá ít (${workHours.toFixed(1)}h), đánh dấu nghỉ cả ngày`);
          return 'absent';
        }
      }
      // Nếu không có thời gian, mặc định là làm cả ngày cho HC
      return 'present_full';
    }
    // M = meeting/họp
    if (shiftLower === 'm' || shiftLower.includes('meeting') || shiftLower.includes('họp')) {
      return 'meeting_full';
    }
  }

  // Kiểm tra work_factor
  if (row.work_factor) {
    const workFactor = parseFloat(row.work_factor);
    if (workFactor === 0) return 'absent';
    if (workFactor < 0.5) return 'present_half';
    if (workFactor >= 0.5) return 'present_full';
  }

  // Kiểm tra total_hours nếu có
  if (row.total_hours) {
    const totalHours = parseFloat(row.total_hours);
    if (totalHours === 0) return 'absent';
    if (totalHours < 4) return 'present_half';
    if (totalHours >= 4) return 'present_full';
  }

  // Nếu không có check-in và check-out
  if (!checkIn && !checkOut) {
    warnings.push('Không có thời gian check-in và check-out, đánh dấu vắng mặt');
    return 'absent';
  }

  // Nếu chỉ có một trong hai
  if (!checkIn || !checkOut) {
    warnings.push('Thiếu thời gian check-in hoặc check-out');
    return 'present_half';
  }

  // Tính giờ làm việc thực tế
  const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  
  // Logic mới: Dựa trên thời gian làm việc thực tế
  if (workHours >= 6) {
    return 'present_full';
  } else if (workHours >= 3) {
    return 'present_half';
  } else {
    warnings.push(`Giờ làm việc quá ít (${workHours.toFixed(1)}h), đánh dấu làm nửa ngày`);
    return 'present_half';
  }
}

function calculateOvertime(
  checkIn: Date | null,
  checkOut: Date | null,
  status: string
): number {
  if (!checkIn || !checkOut || status === 'absent') return 0;

  const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  const standardHours = 8;
  
  return Math.max(0, workHours - standardHours);
}

async function insertOrUpdateAttendance(attendanceData: any) {
  try {
    console.log('📝 Processing attendance data:', {
      employee_id: attendanceData.employee_id,
      date: attendanceData.date,
      status: attendanceData.status,
      check_in_time: attendanceData.check_in_time,
      check_out_time: attendanceData.check_out_time
    });

    // Kiểm tra xem đã có record cho ngày này chưa
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('employee_id', attendanceData.employee_id)
      .eq('date', attendanceData.date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing record:', checkError);
      throw new Error(`Lỗi kiểm tra record hiện tại: ${checkError.message}`);
    }

    if (existing) {
      console.log('🔄 Updating existing record:', existing.id);
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('attendance_records')
        .update({
          status: attendanceData.status,
          check_in_time: attendanceData.check_in_time,
          check_out_time: attendanceData.check_out_time,
          overtime_hours: attendanceData.overtime_hours,
          notes: attendanceData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error('❌ Error updating record:', updateError);
        throw new Error(`Lỗi cập nhật record: ${updateError.message}`);
      }
      
      console.log('✅ Record updated successfully');
    } else {
      console.log('➕ Inserting new record');
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('attendance_records')
        .insert({
          employee_id: attendanceData.employee_id,
          date: attendanceData.date,
          status: attendanceData.status,
          check_in_time: attendanceData.check_in_time,
          check_out_time: attendanceData.check_out_time,
          overtime_hours: attendanceData.overtime_hours,
          notes: attendanceData.notes
          // Bỏ qua created_by để tránh lỗi foreign key constraint
        });
      
      if (insertError) {
        console.error('❌ Error inserting record:', insertError);
        throw new Error(`Lỗi thêm record: ${insertError.message}`);
      }
      
      console.log('✅ Record inserted successfully');
    }
  } catch (error) {
    console.error('❌ Error in insertOrUpdateAttendance:', error);
    throw error;
  }
} 