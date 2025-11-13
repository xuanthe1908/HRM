// Corrected parser for monthly attendance format with day-by-day processing
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Parses a CSV file with a complex, multi-line header structure.
 * It detects the month/year, day-of-week headers, and data rows automatically.
 * @param csvContent The string content of the CSV file.
 * @returns An object containing the parsed records, detected month, and year.
 */
export async function parseMonthlyCSV(csvContent: string) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  let month = new Date().getMonth() + 1;
  let year = new Date().getFullYear();
  const dateLine = lines.find(line => line.toLowerCase().includes('từ ngày'));
  if (dateLine) {
    const match = dateLine.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    }
  }

  let dayNumberHeaderIndex = -1, dayOfWeekHeaderIndex = -1, dataStartIndex = -1, dayDataStartCol = -1;
  for (let i = 0; i < lines.length; i++) {
    const values = lines[i].split(',');
    const dayOneIndex = values.findIndex(v => v.trim() === '1');
    const dayTwoIndex = values.findIndex(v => v.trim() === '2');
    if (dayOneIndex !== -1 && dayTwoIndex === dayOneIndex + 1) {
      dayNumberHeaderIndex = i;
      dayOfWeekHeaderIndex = i + 1;
      dataStartIndex = i + 2;
      dayDataStartCol = dayOneIndex;
      break;
    }
  }

  if (dataStartIndex === -1) {
    throw new Error('Không thể xác định được cấu trúc file. Không tìm thấy dòng tiêu đề chứa ngày (1, 2, 3...).');
  }

  const dayOfWeekValues = lines[dayOfWeekHeaderIndex]?.split(',') || [];
  const dayOfWeekMap = new Map<number, string>();
  for (let day = 1; day <= 31; day++) {
    const colIndex = dayDataStartCol + day - 1;
    if (colIndex < dayOfWeekValues.length && dayOfWeekValues[colIndex]?.trim()) {
      dayOfWeekMap.set(day, dayOfWeekValues[colIndex].trim());
    }
  }
  
  const records: any[] = [];
  const EMPLOYEE_CODE_COL = 1;
  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const stt = values[0];
    const employeeCode = values[EMPLOYEE_CODE_COL];
    
    if (!employeeCode || !stt || !/^\d+$/.test(stt)) continue;

    const employeeData: { [key: string]: any } = {
      'MÃ NHÂN VIÊN': employeeCode,
      'row_number': i + 1
    };
    for (let day = 1; day <= 31; day++) {
      const colIndex = dayDataStartCol + day - 1;
      if (values.length > colIndex && values[colIndex]) {
        employeeData[day.toString()] = values[colIndex];
      }
    }
    records.push(employeeData);
  }

  if (records.length === 0) {
      throw new Error("Không tìm thấy bản ghi chấm công hợp lệ nào trong file CSV.");
  }
  
  return { records, month, year, dayOfWeekMap };
}

/**
 * Processes records day-by-day for resilience.
 */
export async function processMonthlyRecords(
  records: any[],
  month: number,
  year: number,
  userId: string,
  dayOfWeekMap: Map<number, string>
) {
  const result = { success_employees: 0, failed_employees: 0, total_errors: 0, errors: [] as any[], warnings: [] as any[], month, year };

  const { data: employees, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id, employee_code');
    
  if (employeeError || !employees) {
    throw new Error('Không thể lấy danh sách nhân viên từ database.');
  }
  
  const employeeMap = new Map<string, any>();
  employees.forEach(emp => {
    employeeMap.set(emp.employee_code, emp);
    employeeMap.set(String(parseInt(emp.employee_code, 10)), emp);
  });
  
  for (const row of records) {
    const employeeCode = row['MÃ NHÂN VIÊN'];
    const originalRowNumber = row['row_number'];
    let employeeHasSuccess = false;
    let employeeHasError = false;

    const employee = employeeMap.get(employeeCode) || employeeMap.get(String(parseInt(employeeCode, 10)));
    if (!employee) {
      result.failed_employees++;
      result.errors.push({
        row: originalRowNumber,
        employee_code: employeeCode,
        error: `Không tìm thấy nhân viên với mã: ${employeeCode}`
      });
      continue; // Skip to the next employee
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayValueStr = row[day.toString()];
      if (dayValueStr === undefined || dayValueStr.trim() === '') continue;
      
      const workValue = parseFloat(dayValueStr);
      if (isNaN(workValue)) continue;

      try {
        const dayOfWeekFromFile = dayOfWeekMap.get(day);
        const isWeekend = (dayOfWeekFromFile === 'CN' || dayOfWeekFromFile === 'T.7');
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let status: string;
        if (workValue > 0 && isWeekend) {
            status = 'weekend_overtime';
        } else if (workValue >= 1) {
            status = 'present_full';
        } else if (workValue > 0) {
            status = 'present_half';
        } else {
            status = 'absent';
        }
        
        const recordToUpsert = {
          employee_id: employee.id,
          date: dateStr,
          status,
          work_value: workValue,
          day_of_week: dayOfWeekFromFile,
          overtime_hours: isWeekend ? workValue * 8 : 0,
        };

        const { error } = await supabaseAdmin
          .from('attendance_records')
          .upsert(recordToUpsert, { onConflict: 'employee_id, date' });

        if (error) {
          throw error; // Throw to be caught by the catch block below
        }
        
        employeeHasSuccess = true;

      } catch (error) {
        employeeHasError = true;
        result.total_errors++;
        result.errors.push({
            row: originalRowNumber,
            employee_code: employeeCode,
            error: `Lỗi ngày ${day}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
        });
      }
    }

    if (employeeHasSuccess && !employeeHasError) {
      result.success_employees++;
    } else if (employeeHasError) {
      // If there were any errors for this employee, count them as failed.
      result.failed_employees++;
    }
  }
  
  // To match the old result interface, let's remap the final counts.
  return {
    success: result.success_employees,
    failed: result.failed_employees + result.errors.filter(e => e.error.startsWith('Không tìm thấy')).length, // A bit of a fudge to align counts
    errors: result.errors,
    warnings: result.warnings,
    month: result.month,
    year: result.year
  };
}