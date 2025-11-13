"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import {
  Calculator,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Play,
  Save,
  Download,
  Settings,
  Info,
  Shield,
  Gift,
  Loader2,
} from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { salaryRegulationsService, payrollService } from "@/lib/services"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// Progressive tax calculation function
const calculateProgressiveTax = (taxableIncome: number) => {
  let tax = 0
  let remainingIncome = taxableIncome

  const taxBrackets = [
    { min: 0, max: 5000000, rate: 5 },
    { min: 5000000, max: 10000000, rate: 10 },
    { min: 10000000, max: 18000000, rate: 15 },
    { min: 18000000, max: 32000000, rate: 20 },
    { min: 32000000, max: 52000000, rate: 25 },
    { min: 52000000, max: 80000000, rate: 30 },
    { min: 80000000, max: Number.POSITIVE_INFINITY, rate: 35 },
  ]

  for (const bracket of taxBrackets) {
    if (remainingIncome <= 0) break

    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min)
    tax += taxableAtThisBracket * (bracket.rate / 100)
    remainingIncome -= taxableAtThisBracket
  }

  return tax
}

// Flat tax calculation function (10% fixed rate)
const calculateFlatTax = (taxableIncome: number) => {
  return taxableIncome * 0.10
}

export default function CalculatePayrollPage() {
  const { t, formatCurrency, formatCurrencyShort } = useLanguage()
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([])
  const [apiSalaryRegulations, setApiSalaryRegulations] = useState<any>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationProgress, setCalculationProgress] = useState(0)
  const [calculationResults, setCalculationResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false)
  const [pendingOverwriteRecords, setPendingOverwriteRecords] = useState<any[]>([])
  const [overwriteLoading, setOverwriteLoading] = useState(false)

  const fetchInitialData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const regulationsRes = await salaryRegulationsService.getLatest()
      if (regulationsRes.data) {
        setApiSalaryRegulations(regulationsRes.data)
      } else if (regulationsRes.error) {
        console.error('Error fetching regulations:', regulationsRes.error)
        setError('Không thể tải quy định lương')
      }

      const employeesRes = await payrollService.getEmployeesForPayroll(
        parseInt(selectedMonth),
        parseInt(selectedYear)
      )
      
      if (employeesRes && employeesRes.data && Array.isArray(employeesRes.data)) {
        setSelectedEmployees(employeesRes.data.map((emp: any) => ({ 
          ...emp, 
          selected: true,
          bonuses: emp.bonuses || {}
        })))
      } else {
        setSelectedEmployees([])
        console.warn("Employees data is not an array or is missing:", employeesRes)
      }
    } catch (error) {
      console.error('Error fetching initial data:', error)
      setError('Đã có lỗi xảy ra khi tải dữ liệu')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear])

  const handleEmployeeSelection = (employeeId: number, checked: boolean) => {
    setSelectedEmployees((prev) => prev.map((emp) => (emp.id === employeeId ? { ...emp, selected: checked } : emp)))
  }

  const selectAllEmployees = (checked: boolean) => {
    setSelectedEmployees((prev) => prev.map((emp) => ({ ...emp, selected: checked })))
  }

  const calculatePayroll = async () => {
    try {
      setIsCalculating(true)
      setCalculationProgress(0)
      setShowResults(false)

      // Get latest regulations
      const latestRegulationsRes = await salaryRegulationsService.getLatest();
      if (!latestRegulationsRes || latestRegulationsRes.error) {
        toast({ title: "Lỗi", description: "Không thể tải quy định lương mới nhất.", variant: "destructive" });
        return;
      }
      
      const latestRegulations = latestRegulationsRes.data;
      setApiSalaryRegulations(latestRegulations);

      const selectedEmps = selectedEmployees.filter((emp) => emp.selected)
      const results = []

      for (let i = 0; i < selectedEmps.length; i++) {
        const employee = selectedEmps[i]
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Ensure all input fields have valid values
        const basicSalary = Number(employee.basicSalary) || 0;
        const workingDays = Number(employee.workingDays) || 1;
        
        // Get actual attendance data from API
        let presentDays = Number(employee.presentDays) || 0;
        let overtimeHours = Number(employee.overtimeHours) || 0;
        let weekdayOvertimeHours = Number(employee.weekdayOvertimeHours) || 0;
        let weekendOvertimeHours = Number(employee.weekendOvertimeHours) || 0;

        try {
          const attendanceResponse = await fetch(`/api/attendance/employee/${employee.id}?month=${selectedMonth}&year=${selectedYear}`);
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            if (attendanceData.summary) {
              presentDays = attendanceData.summary.totalPresentDays;
              overtimeHours = attendanceData.summary.totalOvertimeHours;
              weekdayOvertimeHours = attendanceData.summary.weekdayOvertimeHours || 0;
              weekendOvertimeHours = attendanceData.summary.weekendOvertimeHours || 0;
            }
          }
        } catch (error) {
          console.error('Error fetching attendance data:', error);
        }
        
        // Employee information for deduction calculation
        const childrenCount = Number(employee.children_count) || 0;
        const maritalStatus = employee.marital_status || '';
        const personalDeductionFromEmployee = Number(employee.personal_deduction) || 0;
        
        // Calculate dependents
        let dependents = Number(employee.dependents) || 0;
        
        if (dependents === 0) {
          dependents = 0;
          
          if (maritalStatus && maritalStatus.toLowerCase().includes('đã kết hôn')) {
            dependents += 1; // Spouse
          }
          
          dependents += childrenCount; // Children
        }
        
        const allowances = employee.allowances || {};
        const bonuses = employee.bonuses || {};
        const position = employee.position || '';
        const isIntern = position.toLowerCase().includes('intern');
        const isProbation = position.toLowerCase().includes('thử việc');

        // Get regulations
        const workingDaysPerMonth = Number(latestRegulations.workingDaysPerMonth) || 22;
        const workingHoursPerDay = Number(latestRegulations.workingHoursPerDay) || 8;
        const overtimeWeekdayRate = Number(latestRegulations.overtimeWeekdayRate) || 150;
        const overtimeWeekendRate = Number(latestRegulations.overtimeWeekendRate) || 200;
        const maxInsuranceSalary = Number(latestRegulations.maxInsuranceSalary) || basicSalary;
        const maxUnemploymentSalary = Number(latestRegulations.maxUnemploymentSalary) || basicSalary;
        const employeeSocialInsuranceRate = Number(latestRegulations.employeeSocialInsuranceRate) || 8;
        const employeeHealthInsuranceRate = Number(latestRegulations.employeeHealthInsuranceRate) || 1.5;
        const employeeUnemploymentInsuranceRate = Number(latestRegulations.employeeUnemploymentInsuranceRate) || 1;
        const employeeUnionFeeRate = Number(latestRegulations.employeeUnionFeeRate) || 1;
        const companySocialInsuranceRate = Number(latestRegulations.companySocialInsuranceRate) || 17.5;
        const companyHealthInsuranceRate = Number(latestRegulations.companyHealthInsuranceRate) || 3;
        const companyUnemploymentInsuranceRate = Number(latestRegulations.companyUnemploymentInsuranceRate) || 1;
        const personalDeduction = Number(latestRegulations.personalDeduction) || 11000000;
        const dependentDeduction = Number(latestRegulations.dependentDeduction) || 4400000;
        const enableProgressiveTax = latestRegulations.enableProgressiveTax !== false;

        // Calculate overtime rates and hours
        const weekdayOvertimeDays = workingHoursPerDay > 0 ? weekdayOvertimeHours / workingHoursPerDay : 0;
        const weekendOvertimeDays = workingHoursPerDay > 0 ? weekendOvertimeHours / workingHoursPerDay : 0;
        
        // Standard daily rate based on basic salary
        const standardDailyRate = basicSalary / workingDaysPerMonth;
        
        // Calculate overtime pay
        const weekdayOvertimeMultiplier = (overtimeWeekdayRate - 100) / 100; // 150% means 50% extra
        const weekendOvertimeMultiplier = (overtimeWeekendRate - 100) / 100; // 200% means 100% extra
        
        const weekdayOvertimePay = weekdayOvertimeDays * standardDailyRate * weekdayOvertimeMultiplier;
        const weekendOvertimePay = weekendOvertimeDays * standardDailyRate * weekendOvertimeMultiplier;
        const totalOvertimePay = weekdayOvertimePay + weekendOvertimePay;

        if (isIntern) {
          // Intern calculation: basic salary + allowances + overtime, no insurance, flat 10% tax
          const actualBasicSalary = (workingDaysPerMonth > 0) ? basicSalary * (presentDays / workingDaysPerMonth) : 0;
          
          // Calculate allowances from employee info proportionally
          const employeeAllowances = {
            meal: Number(employee.meal_allowance) || 0,
            transport: Number(employee.transport_allowance) || 0,
            phone: Number(employee.phone_allowance) || 0,
            attendance: Number(employee.attendance_allowance) || 0,
          };
          
          const attendanceRatio = workingDaysPerMonth > 0 ? presentDays / workingDaysPerMonth : 0;
          const employeeAllowancesTotal = Object.values(employeeAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const adjustedEmployeeAllowances = employeeAllowancesTotal * attendanceRatio;
          
          // Additional allowances from form (not proportional)
          const formAllowances = allowances || {};
          const formAllowancesTotal = Object.values(formAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          const totalAllowances = adjustedEmployeeAllowances + formAllowancesTotal;
          const totalBonuses = Object.values(bonuses).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          const grossSalary = actualBasicSalary + totalAllowances + totalBonuses + totalOvertimePay;
          
          // Intern: No insurance, no personal deduction
          const totalInsuranceDeductions = 0;
          const incomeAfterInsurance = grossSalary;
          const totalPersonalDeductions = 0;
          const basicDeduction = 0;
          const dependentDeductionAmount = 0;
          
          // Intern: Fixed 10% tax
          const taxableIncome = Math.max(0, incomeAfterInsurance);
          const incomeTax = calculateFlatTax(taxableIncome);
          const totalDeductions = totalInsuranceDeductions + incomeTax;
          const netSalary = grossSalary - totalDeductions;
          
          results.push({
            employee,
            calculations: {
              actualBasicSalary,
              totalAllowances,
              overtimePay: totalOvertimePay,
              actualOvertimeHours: overtimeHours,
              weekdayOvertimeHours: weekdayOvertimeHours,
              weekendOvertimeHours: weekendOvertimeHours,
              weekdayOvertimeDays: weekdayOvertimeDays,
              weekendOvertimeDays: weekendOvertimeDays,
              weekdayOvertimePay: weekdayOvertimePay,
              weekendOvertimePay: weekendOvertimePay,
              standardDailyRate: standardDailyRate,
              grossSalary,
              socialInsuranceEmp: 0,
              healthInsuranceEmp: 0,
              unemploymentInsuranceEmp: 0,
              unionFeeEmp: 0,
              incomeTax,
              totalDeductions,
              netSalary,
              standardPresentDays: presentDays,
              attendanceRate: (workingDaysPerMonth > 0) ? (presentDays / workingDaysPerMonth) * 100 : 0,
              socialInsuranceCom: 0,
              healthInsuranceCom: 0,
              unemploymentInsuranceCom: 0,
              unionFeeCom: 0,
              incomeAfterInsurance,
              basicDeduction,
              dependentDeduction: dependentDeductionAmount,
              taxableIncome,
              isIntern: true,
              isProbation: false,
            },
          });
        } else if (isProbation) {
          // Probation calculation: 85% basic salary + allowances + overtime, no insurance, flat 10% tax
          const actualBasicSalary = (workingDaysPerMonth > 0) ? basicSalary * 0.85 * (presentDays / workingDaysPerMonth) : 0;
          
          // Recalculate overtime for probation (based on 85% basic salary)
          const probationStandardDailyRate = (basicSalary * 0.85) / workingDaysPerMonth;
          const probationWeekdayOvertimePay = weekdayOvertimeDays * probationStandardDailyRate * weekdayOvertimeMultiplier;
          const probationWeekendOvertimePay = weekendOvertimeDays * probationStandardDailyRate * weekendOvertimeMultiplier;
          const probationTotalOvertimePay = probationWeekdayOvertimePay + probationWeekendOvertimePay;
          
          // Calculate allowances from employee info proportionally
          const employeeAllowances = {
            meal: Number(employee.meal_allowance) || 0,
            transport: Number(employee.transport_allowance) || 0,
            phone: Number(employee.phone_allowance) || 0,
            attendance: Number(employee.attendance_allowance) || 0,
          };
          
          const attendanceRatio = workingDaysPerMonth > 0 ? presentDays / workingDaysPerMonth : 0;
          const employeeAllowancesTotal = Object.values(employeeAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const adjustedEmployeeAllowances = employeeAllowancesTotal * attendanceRatio;
          
          // Additional allowances from form (not proportional)
          const formAllowances = allowances || {};
          const formAllowancesTotal = Object.values(formAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          const totalAllowances = adjustedEmployeeAllowances + formAllowancesTotal;
          const totalBonuses = Object.values(bonuses).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          const grossSalary = actualBasicSalary + totalAllowances + totalBonuses + probationTotalOvertimePay;
          
          // Probation: No insurance, no personal deduction (like Intern)
          const totalInsuranceDeductions = 0;
          const incomeAfterInsurance = grossSalary;
          const totalPersonalDeductions = 0;
          const basicDeduction = 0;
          const dependentDeductionAmount = 0;
          
          // Probation: Fixed 10% tax (like Intern)
          const taxableIncome = Math.max(0, incomeAfterInsurance);
          const incomeTax = calculateFlatTax(taxableIncome);
          const totalDeductions = totalInsuranceDeductions + incomeTax;
          const netSalary = grossSalary - totalDeductions;
          
          results.push({
            employee,
            calculations: {
              actualBasicSalary,
              totalAllowances,
              overtimePay: probationTotalOvertimePay,
              actualOvertimeHours: overtimeHours,
              weekdayOvertimeHours: weekdayOvertimeHours,
              weekendOvertimeHours: weekendOvertimeHours,
              weekdayOvertimeDays: weekdayOvertimeDays,
              weekendOvertimeDays: weekendOvertimeDays,
              weekdayOvertimePay: probationWeekdayOvertimePay,
              weekendOvertimePay: probationWeekendOvertimePay,
              standardDailyRate: probationStandardDailyRate,
              grossSalary,
              socialInsuranceEmp: 0,
              healthInsuranceEmp: 0,
              unemploymentInsuranceEmp: 0,
              unionFeeEmp: 0,
              incomeTax,
              totalDeductions,
              netSalary,
              standardPresentDays: presentDays,
              attendanceRate: (workingDaysPerMonth > 0) ? (presentDays / workingDaysPerMonth) * 100 : 0,
              socialInsuranceCom: 0,
              healthInsuranceCom: 0,
              unemploymentInsuranceCom: 0,
              unionFeeCom: 0,
              incomeAfterInsurance,
              basicDeduction,
              dependentDeduction: dependentDeductionAmount,
              taxableIncome,
              isIntern: false,
              isProbation: true,
            },
          });
        } else {
          // Regular employee calculation
          const standardPresentDays = presentDays;
          const actualBasicSalary = (workingDaysPerMonth > 0) ? basicSalary * (standardPresentDays / workingDaysPerMonth) : 0;
          
          // Calculate allowances from employee info proportionally
          const employeeAllowances = {
            meal: Number(employee.meal_allowance) || 0,
            transport: Number(employee.transport_allowance) || 0,
            phone: Number(employee.phone_allowance) || 0,
            attendance: Number(employee.attendance_allowance) || 0,
          };
          
          const attendanceRatio = workingDaysPerMonth > 0 ? standardPresentDays / workingDaysPerMonth : 0;
          const employeeAllowancesTotal = Object.values(employeeAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const adjustedEmployeeAllowances = employeeAllowancesTotal * attendanceRatio;
          
          // Additional allowances from form (not proportional)
          const formAllowances = allowances || {};
          const formAllowancesTotal = Object.values(formAllowances).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          const totalAllowances = adjustedEmployeeAllowances + formAllowancesTotal;
          const totalBonuses = Object.values(bonuses).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);

          const grossSalary = actualBasicSalary + totalAllowances + totalOvertimePay + totalBonuses;

          // Insurance calculations
          const insuranceBaseSalary = Math.min(basicSalary, maxInsuranceSalary);
          const unemploymentInsuranceBase = Math.min(basicSalary, maxUnemploymentSalary);

          const socialInsuranceEmp = insuranceBaseSalary * (employeeSocialInsuranceRate / 100);
          const healthInsuranceEmp = insuranceBaseSalary * (employeeHealthInsuranceRate / 100);
          const unemploymentInsuranceEmp = unemploymentInsuranceBase * (employeeUnemploymentInsuranceRate / 100);
          const unionFeeEmp = insuranceBaseSalary * (employeeUnionFeeRate / 100);

          const socialInsuranceCom = insuranceBaseSalary * (companySocialInsuranceRate / 100);
          const healthInsuranceCom = insuranceBaseSalary * (companyHealthInsuranceRate / 100);
          const unemploymentInsuranceCom = unemploymentInsuranceBase * (companyUnemploymentInsuranceRate / 100);

          const totalInsuranceDeductions = socialInsuranceEmp + healthInsuranceEmp + unemploymentInsuranceEmp + unionFeeEmp;
          const incomeAfterInsurance = grossSalary - totalInsuranceDeductions;

          // Calculate actual meal allowance (proportional to attendance)
          const actualMealAllowance = (employee.meal_allowance || 0) * attendanceRatio;
          
          // Income for tax calculation = Income after insurance - actual meal allowance
          const incomeForTax = incomeAfterInsurance - actualMealAllowance;

          // Use personal deduction from employee if available, otherwise use regulation
          const actualPersonalDeduction = personalDeductionFromEmployee > 0 ? personalDeductionFromEmployee : personalDeduction;
          const dependentDeductionAmount = dependents * dependentDeduction;
          const totalPersonalDeductions = actualPersonalDeduction + dependentDeductionAmount;
          const basicDeduction = actualPersonalDeduction;

          const taxableIncome = Math.max(0, incomeForTax - totalPersonalDeductions);
          const incomeTax = enableProgressiveTax ? calculateProgressiveTax(taxableIncome) : calculateFlatTax(taxableIncome);
          const totalDeductions = totalInsuranceDeductions + incomeTax;
          const netSalary = grossSalary - totalDeductions;

          results.push({
            employee,
            calculations: {
              actualBasicSalary,
              totalAllowances,
              overtimePay: totalOvertimePay,
              actualOvertimeHours: overtimeHours,
              weekdayOvertimeHours: weekdayOvertimeHours,
              weekendOvertimeHours: weekendOvertimeHours,
              weekdayOvertimeDays: weekdayOvertimeDays,
              weekendOvertimeDays: weekendOvertimeDays,
              weekdayOvertimePay: weekdayOvertimePay,
              weekendOvertimePay: weekendOvertimePay,
              standardDailyRate: standardDailyRate,
              grossSalary,
              socialInsuranceEmp,
              healthInsuranceEmp,
              unemploymentInsuranceEmp,
              unionFeeEmp,
              incomeTax,
              totalDeductions,
              netSalary,
              standardPresentDays: standardPresentDays,
              attendanceRate: (workingDaysPerMonth > 0) ? (standardPresentDays / workingDaysPerMonth) * 100 : 0,
              overtimeMultiplier: weekdayOvertimeMultiplier,
              socialInsuranceCom,
              healthInsuranceCom,
              unemploymentInsuranceCom,
              incomeAfterInsurance,
              incomeForTax,
              actualMealAllowance,
              basicDeduction,
              dependentDeduction: dependentDeductionAmount,
              taxableIncome,
              isIntern: false,
              isProbation: false,
            },
          });
        }
        
        setCalculationProgress(((i + 1) / selectedEmps.length) * 100)
      }
      setCalculationResults(results)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra khi tính lương.";
      toast({ title: "Lỗi", description: errorMessage, variant: "destructive" });
    } finally {
      setIsCalculating(false)
      setShowResults(true)
    }
  }

  const handleBonusChange = (employeeId: number, bonusType: string, value: number) => {
    setSelectedEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              bonuses: {
                ...emp.bonuses,
                [bonusType]: value,
              },
            }
          : emp,
      ),
    )
  }

  const selectedCount = selectedEmployees.filter((emp) => emp.selected).length
  const totalGross = calculationResults.reduce((sum, result) => sum + result.calculations.grossSalary, 0)
  const totalNet = calculationResults.reduce((sum, result) => sum + result.calculations.netSalary, 0)
  const totalDeductions = calculationResults.reduce((sum, result) => sum + result.calculations.totalDeductions, 0)

  const savePayrollResults = async () => {
    if (calculationResults.length === 0) {
      toast({
        title: "Chưa có dữ liệu",
        description: "Vui lòng tính lương trước khi lưu.",
        variant: "default",
      })
      return
    }

    const payrollRecords = calculationResults.map((result) => {
      const { employee, calculations } = result;
      return {
        employee_id: employee.id,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        base_salary: employee.basicSalary,
        working_days: employee.workingDays,
        actual_working_days: employee.presentDays,
        actual_base_salary: calculations.actualBasicSalary,
        total_allowances: calculations.totalAllowances,
        meal_allowance: (employee.meal_allowance || 0) * (calculations.attendanceRate / 100),
        transport_allowance: (employee.transport_allowance || 0) * (calculations.attendanceRate / 100),
        phone_allowance: (employee.phone_allowance || 0) * (calculations.attendanceRate / 100),
        attendance_allowance: (employee.attendance_allowance || 0) * (calculations.attendanceRate / 100),
        overtime_hours: employee.overtimeHours,
        overtime_pay: calculations.overtimePay,
        gross_income: calculations.grossSalary,
        income_after_insurance: calculations.incomeAfterInsurance,
        personal_deduction: calculations.basicDeduction,
        dependent_deduction: calculations.dependentDeduction,
        number_of_dependents: employee.dependents,
        taxable_income: calculations.taxableIncome,
        income_tax: calculations.incomeTax,
        total_deductions: calculations.totalDeductions,
        net_salary: calculations.netSalary,
        social_insurance_employee: calculations.socialInsuranceEmp,
        health_insurance_employee: calculations.healthInsuranceEmp,
        unemployment_insurance_employee: calculations.unemploymentInsuranceEmp,
        union_fee_employee: calculations.unionFeeEmp,
        social_insurance_company: calculations.socialInsuranceCom,
        health_insurance_company: calculations.healthInsuranceCom,
        unemployment_insurance_company: calculations.unemploymentInsuranceCom,
      }
    })

    const response = await payrollService.createBatch(payrollRecords);
    if (response.error) {
      if (response.error.includes('duplicate key')) {
        setPendingOverwriteRecords(payrollRecords)
        setShowOverwriteDialog(true)
      } else {
        toast({
          title: "Lỗi",
          description: response.error || "Không thể lưu bảng lương.",
          variant: "destructive",
        })
      }
      return;
    }
    toast({
      title: "Thành công",
      description: "Đã lưu bảng lương.",
      variant: "default",
    })
  }

  // Function to handle overwrite if user agrees
  const handleOverwritePayroll = async () => {
    setOverwriteLoading(true);
    try {
      const response = await payrollService.createBatch(pendingOverwriteRecords, true);
      if (response.error) {
        toast({
          title: "Lỗi",
          description: response.error || "Không thể ghi đè bảng lương.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Thành công",
        description: "Đã ghi đè bảng lương thành công.",
        variant: "default",
      });
      setShowOverwriteDialog(false);
      setPendingOverwriteRecords([]);
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể ghi đè bảng lương.",
        variant: "destructive",
      });
    } finally {
      setOverwriteLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchInitialData}>Thử lại</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tính lương nhân viên</h1>
          <p className="text-muted-foreground">Tính toán lương tháng cho nhân viên dựa trên chấm công và quy định</p>
        </div>
        <div className="flex gap-2">
          {showResults && (
            <>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Xuất kết quả
              </Button>
              <Button onClick={savePayrollResults}>
                <Save className="mr-2 h-4 w-4" />
                Lưu vào bảng lương
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Regulations Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Info className="h-5 w-5" />
            Quy định áp dụng
          </CardTitle>
          <CardDescription>
            Tính lương dựa trên quy định hiện tại.{" "}
            <Link href="/salary-regulations" className="text-blue-600 hover:underline">
              Xem chi tiết quy định
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiSalaryRegulations ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ngày công/tháng: </span>
                <span className="font-medium">{apiSalaryRegulations.workingDaysPerMonth} ngày</span>
            </div>
            <div>
              <span className="text-muted-foreground">BHXH NV: </span>
                <span className="font-medium">{apiSalaryRegulations.employeeSocialInsuranceRate}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Giảm trừ bản thân: </span>
                <span className="font-medium">{formatCurrency(apiSalaryRegulations.personalDeduction)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">OT Ngày thường: </span>
                <span className="font-medium">{apiSalaryRegulations.overtimeWeekdayRate}%</span>
            </div>
          </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải quy định...</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calculation Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cài đặt tính lương
              </CardTitle>
              <CardDescription>Thiết lập tháng và quy định áp dụng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month">Tháng tính lương</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                        <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Tháng {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Năm tính lương</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn năm" />
                      </SelectTrigger>
                      <SelectContent>
                        {[2025, 2024, 2023, 2022].map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Quy định tính toán</Label>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Ngày công/tháng:</span>
                    <span>{apiSalaryRegulations?.workingDaysPerMonth} ngày</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Giờ công/ngày:</span>
                    <span>{apiSalaryRegulations?.workingHoursPerDay} giờ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OT ngày thường:</span>
                    <span>{apiSalaryRegulations?.overtimeWeekdayRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OT cuối tuần:</span>
                    <span>{apiSalaryRegulations?.overtimeWeekendRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHXH NV:</span>
                    <span>{apiSalaryRegulations?.employeeSocialInsuranceRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BHYT NV:</span>
                    <span>{apiSalaryRegulations?.employeeHealthInsuranceRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thuế:</span>
                    <span>{apiSalaryRegulations?.enableProgressiveTax !== false ? 'Lũy tiến' : 'Cố định 10%'}</span>
                  </div>
                </div>
                <Link href="/salary-regulations">
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    <Settings className="mr-2 h-4 w-4" />
                    Cập nhật quy định
                  </Button>
                </Link>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Nhân viên đã chọn</Label>
                  <Badge variant="outline">
                    {selectedCount} được chọn
                  </Badge>
                </div>
                <Button onClick={calculatePayroll} disabled={selectedCount === 0 || isCalculating} className="w-full">
                  {isCalculating ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Đang tính toán...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Tính lương
                    </>
                  )}
                </Button>
              </div>

              {isCalculating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Tiến độ tính toán</span>
                    <span>{Math.round(calculationProgress)}%</span>
                  </div>
                  <Progress value={calculationProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          {showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tóm tắt tính lương
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tổng nhân viên:</span>
                    <span className="font-medium">{calculationResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tổng lương gốc:</span>
                    <span className="font-medium">{formatCurrency(totalGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tổng khấu trừ:</span>
                    <span className="font-medium text-red-600">{formatCurrency(totalDeductions)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Tổng lương thực nhận:</span>
                    <span className="font-bold text-green-600">{formatCurrency(totalNet)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Employee Selection & Results */}
        <div className="lg:col-span-2 space-y-6">
          {!showResults ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Chọn nhân viên
                </CardTitle>
                <CardDescription>Chọn nhân viên để tính lương cho tháng này</CardDescription>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAll"
                    checked={selectedEmployees.length > 0 && selectedEmployees.every((emp) => emp.selected)}
                    onCheckedChange={selectAllEmployees}
                  />
                  <Label htmlFor="selectAll">Chọn tất cả</Label>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Chọn</TableHead>
                        <TableHead>Nhân viên</TableHead>
                        <TableHead>Phòng ban</TableHead>
                        <TableHead>Lương cơ bản</TableHead>
                        <TableHead>Chấm công</TableHead>
                        <TableHead>Làm thêm</TableHead>
                        <TableHead>Người phụ thuộc</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmployees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <Checkbox
                              checked={employee.selected}
                              onCheckedChange={(checked) => handleEmployeeSelection(employee.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <div>{employee.name}</div>
                              <div className="text-xs text-gray-500">{employee.position}</div>
                            </div>
                          </TableCell>
                          <TableCell>{employee.department || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(employee.basicSalary || 0)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={(employee.presentDays || 0) === (employee.workingDays || 0) ? "default" : "secondary"}>
                                {employee.presentDays || 0}/{employee.workingDays || 0}
                              </Badge>
                              <div className="text-xs text-gray-500">
                                {employee.workingDays > 0 ? ((employee.presentDays || 0) / employee.workingDays * 100).toFixed(1) : 0}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={(employee.overtimeHours || 0) > 0 ? "default" : "outline"}>
                              {employee.overtimeHours || 0}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.dependents || 0} người</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Kết quả tính lương
                </CardTitle>
                <CardDescription>
                  Hoàn thành tính lương tháng {selectedMonth}/{selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {calculationResults.map((result) => (
                    <div key={result.employee.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Employee Header */}
                      <div className={`px-6 py-4 border-b ${
                        result.calculations.isIntern 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                          : result.calculations.isProbation 
                          ? 'bg-gradient-to-r from-yellow-50 to-amber-50' 
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-full text-white flex items-center justify-center font-bold ${
                              result.calculations.isIntern 
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                                : result.calculations.isProbation 
                                ? 'bg-gradient-to-br from-yellow-500 to-amber-600' 
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                            }`}>
                              {result.employee.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{result.employee.name}</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span>{result.employee.department}</span>
                                <span>•</span>
                                <span>{result.employee.position}</span>
                                <span>•</span>
                                <span className="font-medium text-blue-600">
                                  {result.calculations.standardPresentDays}/{result.employee.workingDays} ngày
                                </span>
                                {!result.calculations.isIntern && !result.calculations.isProbation && (
                                  <>
                                    <span>•</span>
                                    <span>{result.employee.dependents || 0} người phụ thuộc</span>
                                  </>
                                )}
                                {result.calculations.isIntern && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                    Intern
                                  </Badge>
                                )}
                                {result.calculations.isProbation && (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                    Thử việc
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Lương thực nhận</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(Math.round(result.calculations.netSalary || 0))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Calculation Details */}
                      <div className="p-6">
                        <div className="grid gap-6 lg:grid-cols-4">
                          {/* Income */}
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-6 w-6 rounded bg-green-500 flex items-center justify-center">
                                <DollarSign className="h-3 w-3 text-white" />
                              </div>
                              <h4 className="font-semibold text-green-700">THU NHẬP</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Lương cơ bản:</span>
                                <span className="font-medium">
                                  {formatCurrency(Math.round(result.calculations.actualBasicSalary || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Phụ cấp:</span>
                                <span className="font-medium">
                                  {formatCurrency(result.calculations.totalAllowances || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Làm thêm:</span>
                                <span className="font-medium">
                                  {formatCurrency(Math.round(result.calculations.overtimePay || 0))}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 ml-2">
                                <div>Ngày thường: {result.calculations.weekdayOvertimeHours}h</div>
                                <div>Cuối tuần: {result.calculations.weekendOvertimeHours}h</div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Thưởng:</span>
                                <span className="font-medium">
                                  {formatCurrency(
                                    Object.values(result.employee.bonuses || {}).reduce(
                                      (sum: number, val: any) => sum + (val || 0),
                                      0,
                                    ),
                                  )}
                                </span>
                              </div>
                              <div className="border-t border-green-300 pt-2 mt-2">
                                <div className="flex justify-between font-bold text-green-700">
                                  <span>TỔNG THU NHẬP:</span>
                                  <span>{formatCurrency(Math.round(result.calculations.grossSalary || 0))}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Insurance */}
                          <div className={`rounded-lg p-4 border ${
                            result.calculations.isIntern || result.calculations.isProbation 
                              ? 'bg-gray-50 border-gray-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`h-6 w-6 rounded flex items-center justify-center ${
                                result.calculations.isIntern || result.calculations.isProbation 
                                  ? 'bg-gray-500' 
                                  : 'bg-red-500'
                              }`}>
                                <Shield className="h-3 w-3 text-white" />
                              </div>
                              <h4 className={`font-semibold ${
                                result.calculations.isIntern || result.calculations.isProbation 
                                  ? 'text-gray-700' 
                                  : 'text-red-700'
                              }`}>
                                BẢO HIỂM
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              {result.calculations.isIntern || result.calculations.isProbation ? (
                                <div className="text-center py-4">
                                  <p className="text-gray-500 italic">
                                    {result.calculations.isIntern ? 'Intern không có bảo hiểm' : 'Thử việc không có bảo hiểm'}
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">BHXH:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.socialInsuranceEmp || 0))}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">BHYT:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.healthInsuranceEmp || 0))}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">BHTN:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.unemploymentInsuranceEmp || 0))}
                                    </span>
                                  </div>
                                  <div className="border-t border-red-300 pt-2 mt-2">
                                    <div className="flex justify-between font-semibold text-red-700">
                                      <span>Tổng BH:</span>
                                      <span>
                                        {formatCurrency(
                                          Math.round(
                                            (result.calculations.socialInsuranceEmp || 0) +
                                            (result.calculations.healthInsuranceEmp || 0) +
                                            (result.calculations.unemploymentInsuranceEmp || 0)
                                          )
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tax */}
                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center">
                                <Calculator className="h-3 w-3 text-white" />
                              </div>
                              <h4 className="font-semibold text-orange-700">
                                THUẾ TNCN
                                <span className="text-xs ml-2 px-2 py-1 rounded bg-orange-200 text-orange-800">
                                  {result.calculations.isIntern || result.calculations.isProbation 
                                    ? 'Cố định 10%' 
                                    : apiSalaryRegulations?.enableProgressiveTax !== false ? 'Lũy tiến' : 'Cố định 10%'
                                  }
                                </span>
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              {result.calculations.isIntern || result.calculations.isProbation ? (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Thu nhập chịu thuế:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.taxableIncome || 0))}
                                    </span>
                                  </div>
                                  <div className="border-t border-orange-300 pt-2 mt-2">
                                    <div className="flex justify-between font-semibold text-orange-700">
                                      <span>Thuế TNCN:</span>
                                      <span>{formatCurrency(Math.round(result.calculations.incomeTax || 0))}</span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Thu nhập sau BH:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.incomeAfterInsurance || 0))}
                                    </span>
                                  </div>
                                  {result.calculations.actualMealAllowance && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-gray-600">- Phụ cấp ăn trưa:</span>
                                      <span className="font-medium">
                                        {formatCurrency(Math.round(result.calculations.actualMealAllowance || 0))}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Giảm trừ bản thân:</span>
                                    <span className="font-medium">
                                      {formatCurrency(result.calculations.basicDeduction || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Giảm trừ người PT:</span>
                                    <span className="font-medium">
                                      {formatCurrency(result.calculations.dependentDeduction || 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Thu nhập chịu thuế:</span>
                                    <span className="font-medium">
                                      {formatCurrency(Math.round(result.calculations.taxableIncome || 0))}
                                    </span>
                                  </div>
                                    <div className="border-t border-orange-300 pt-2 mt-2">
                                      <div className="flex justify-between font-semibold text-orange-700">
                                        <span>Thuế TNCN:</span>
                                        <span>{formatCurrency(Math.round(result.calculations.incomeTax || 0))}</span>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                          </div>

                          {/* Tổng kết */}
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center">
                                <Users className="h-3 w-3 text-white" />
                              </div>
                              <h4 className="font-semibold text-blue-700">TỔNG KẾT</h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Ngày công chuẩn:</span>
                                <Badge variant="outline" className="text-xs">
                                  {result.calculations.standardPresentDays || result.employee.presentDays}/{result.employee.workingDays} ngày
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tỷ lệ chấm công:</span>
                                <Badge
                                  variant={(result.calculations.attendanceRate || 0) === 100 ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {(result.calculations.attendanceRate || 0).toFixed(1)}%
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Làm thêm:</span>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge variant="outline" className="text-xs">
                                    {result.employee.overtimeHours}h
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    ({result.calculations.weekdayOvertimeDays?.toFixed(2)} ngày thường + {result.calculations.weekendOvertimeDays?.toFixed(2)} ngày cuối tuần)
                                  </span>
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Tổng khấu trừ:</span>
                                <span className="font-medium text-red-600">
                                  {formatCurrency(Math.round(result.calculations.totalDeductions || 0))}
                                </span>
                              </div>
                              <div className="border-t border-blue-300 pt-2 mt-2">
                                <div className="bg-blue-100 rounded p-2">
                                  <div className="flex justify-between font-bold text-blue-700">
                                    <span>Thực lĩnh:</span>
                                    <span>{formatCurrency(Math.round(result.calculations.netSalary || 0))}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Chi phí bảo hiểm công ty */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <div className="h-5 w-5 rounded bg-gray-500 flex items-center justify-center">
                              <Shield className="h-3 w-3 text-white" />
                            </div>
                            Chi phí bảo hiểm công ty
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                BHXH CTY ({apiSalaryRegulations?.companySocialInsuranceRate}%):
                              </span>
                              <span className="font-medium">
                                {formatCurrency(Math.round(result.calculations.socialInsuranceCom || 0))}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                BHYT CTY ({apiSalaryRegulations?.companyHealthInsuranceRate}%):
                              </span>
                              <span className="font-medium">
                                {formatCurrency(Math.round(result.calculations.healthInsuranceCom || 0))}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                BHTN CTY ({apiSalaryRegulations?.companyUnemploymentInsuranceRate}%):
                              </span>
                              <span className="font-medium">
                                {formatCurrency(Math.round(result.calculations.unemploymentInsuranceCom || 0))}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span className="text-gray-700">Tổng CTY:</span>
                              <span className="text-blue-600">
                                {formatCurrency(
                                  Math.round(
                                    result.calculations.socialInsuranceCom +
                                      result.calculations.healthInsuranceCom +
                                      result.calculations.unemploymentInsuranceCom,
                                  ),
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bonus Configuration Section */}
          {selectedEmployees.filter((emp) => emp.selected).length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Cấu hình Thưởng - {selectedMonth}
                </CardTitle>
                <CardDescription>Thiết lập các khoản thưởng cho nhân viên được chọn trong tháng này</CardDescription>

                {/* Search Box */}
                <div className="mt-4">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Tìm kiếm nhân viên..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <div className="absolute left-3 top-2.5 h-4 w-4 text-gray-400">
                      <Users className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="h-[50vh] overflow-y-auto border rounded-lg bg-gray-50/50">
                  <div className="space-y-4 p-4">
                    {selectedEmployees
                      .filter((emp) => emp.selected)
                      .filter(
                        (emp) =>
                          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((employee) => (
                        <div
                          key={employee.id}
                          className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                              {employee.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{employee.name}</h4>
                              <p className="text-sm text-gray-600">
                                {employee.department} • {employee.position}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng hiệu suất</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.performance || 0}
                                  onChange={(e) =>
                                    handleBonusChange(employee.id, "performance", Number(e.target.value))
                                  }
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng doanh số</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.sales || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "sales", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng lễ, tết</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.holiday || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "holiday", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng sinh nhật</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.birthday || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "birthday", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng dự án</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.project || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "project", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng đột xuất</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.special || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "special", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng giới thiệu</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.referral || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "referral", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Thưởng thâm niên</Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={employee.bonuses?.seniority || 0}
                                  onChange={(e) => handleBonusChange(employee.id, "seniority", Number(e.target.value))}
                                  className="pr-8"
                                />
                                <span className="absolute right-2 top-2 text-xs text-gray-500">VNĐ</span>
                              </div>
                            </div>
                          </div>

                          {/* Total Bonus Display */}
                          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-green-700">Tổng thưởng tháng này:</span>
                              <span className="font-bold text-green-600 text-lg">
                                {formatCurrency(
                                  (employee.bonuses?.performance || 0) +
                                    (employee.bonuses?.sales || 0) +
                                    (employee.bonuses?.holiday || 0) +
                                    (employee.bonuses?.birthday || 0) +
                                    (employee.bonuses?.project || 0) +
                                    (employee.bonuses?.special || 0) +
                                    (employee.bonuses?.referral || 0) +
                                    (employee.bonuses?.seniority || 0),
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* No results message */}
                    {selectedEmployees
                      .filter((emp) => emp.selected)
                      .filter(
                        (emp) =>
                          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
                      ).length === 0 &&
                      searchTerm && (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>Không tìm thấy nhân viên nào với từ khóa "{searchTerm}"</p>
                        </div>
                      )}
                  </div>
                </div>

                {/* Summary footer */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700">
                      Hiển thị:{" "}
                      {
                        selectedEmployees
                          .filter((emp) => emp.selected)
                          .filter(
                            (emp) =>
                              emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
                          ).length
                      }{" "}
                      / {selectedEmployees.filter((emp) => emp.selected).length} nhân viên
                    </span>
                    <span className="text-blue-600 font-medium">
                      Tổng thưởng:{" "}
                      {formatCurrency(
                        selectedEmployees
                          .filter((emp) => emp.selected)
                          .filter(
                            (emp) =>
                              emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
                          )
                          .reduce((total: number, emp: any) => {
                            return total + Object.values(emp.bonuses || {}).reduce((sum: number, val: any) => sum + (val || 0), 0)
                          }, 0),
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Dialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đã tồn tại bảng lương</DialogTitle>
            <DialogDescription>
              Một số nhân viên đã được tính lương cho tháng/năm này trước đó. Bạn có muốn ghi đè kết quả mới không?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowOverwriteDialog(false)} disabled={overwriteLoading}>Huỷ</Button>
            <Button onClick={handleOverwritePayroll} disabled={overwriteLoading}>Ghi đè</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


