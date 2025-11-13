"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Save, FileText, Calculator, Shield, DollarSign, Clock, Users, AlertCircle, ArrowLeft, Loader2 } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { useRouter } from "next/navigation"
import { salaryRegulationsService } from "@/lib/services"
import { toast } from "@/hooks/use-toast"

const toCamelCase = (s: string) => s.replace(/([-_][a-z])/ig, ($1) => {
    return $1.toUpperCase().replace('-', '').replace('_', '');
});

const convertObjectKeysToCamelCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => convertObjectKeysToCamelCase(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce((result: any, key: string) => {
            result[toCamelCase(key)] = convertObjectKeysToCamelCase(obj[key]);
            return result;
        }, {});
    }
    return obj;
};

const RegulationInput = ({ label, value, onChange, currency = false }: { label: string, value: number, onChange: (value: number) => void, currency?: boolean }) => {
    const { formatCurrency } = useLanguage();
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input type="number" value={value || 0} onChange={(e) => onChange(Number(e.target.value))} />
            {currency && <p className="text-sm text-muted-foreground">Hiện tại: {formatCurrency(value)}</p>}
        </div>
    )
}

const RegulationRateInput = ({ label, value, onChange }: { label: string, value: number, onChange: (value: number) => void }) => (
    <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-2">
            <Input type="number" step="0.1" className="w-24" value={value || 0} onChange={(e) => onChange(Number(e.target.value))} />
            <span className="text-sm text-muted-foreground">%</span>
        </div>
    </div>
)

const RegulationToggle = ({ label, value, onChange, description }: { 
    label: string, 
    value: boolean, 
    onChange: (value: boolean) => void,
    description?: string 
}) => (
    <div className="flex items-center justify-between">
        <div className="space-y-1">
            <Label>{label}</Label>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Switch checked={value} onCheckedChange={onChange} />
    </div>
)

export default function SalaryRegulationsPage() {
  const { formatCurrency } = useLanguage()
  const router = useRouter()
  const [initialRegulations, setInitialRegulations] = useState<any>({})
  const [regulations, setRegulations] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchRegulations = async () => {
      try {
        setIsLoading(true)
        const response = await salaryRegulationsService.getLatest()
        
        console.log('API Response:', response) // Debug log
        
        // Check if response has error
        if (response.error) {
          throw new Error(response.error)
        }
        
        // Extract actual data from response
        const data = response.data
        console.log('Actual data:', data) // Debug log
        
        if (data) {
          const camelCaseData = convertObjectKeysToCamelCase(data);
          console.log('Converted data:', camelCaseData) // Debug log
          setRegulations(camelCaseData);
          setInitialRegulations(camelCaseData);
        }
      } catch (error) {
        console.error('Fetch error:', error) // Debug log
        toast({ title: "Lỗi", description: "Không thể tải quy định lương.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegulations();
  }, []);
  
  const hasChanges = useMemo(() => {
    return JSON.stringify(initialRegulations) !== JSON.stringify(regulations);
  }, [initialRegulations, regulations]);

  const handleInputChange = (field: string, value: any, section?: string) => {
    setRegulations((prev: any) => {
      if (section) {
        return {
      ...prev,
      [section]: {
            ...prev[section],
        [field]: value,
      },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const saveRegulations = async () => {
    if (!regulations) return;
    setIsSaving(true);
    
    // Helper function to convert keys to snake_case for saving
    const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    const convertObjectKeysToSnakeCase = (obj: any): any => {
        if (Array.isArray(obj)) {
            return obj.map(v => convertObjectKeysToSnakeCase(v));
        } else if (obj !== null && obj.constructor === Object) {
            return Object.keys(obj).reduce((result: any, key: string) => {
                result[toSnakeCase(key)] = convertObjectKeysToSnakeCase(obj[key]);
                return result;
            }, {});
        }
        return obj;
    };

    try {
        const newEffectiveDate = new Date();
        newEffectiveDate.setHours(0, 0, 0, 0); // Set time to start of day
        
        const dataToSend = {
            ...regulations,
            effectiveDate: newEffectiveDate.toISOString(),
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            createdBy: undefined,
        };

        // We no longer need to convert in the API route, so we send snake_case directly
        // The service and API route can be simplified later if needed, but this works for now.
        await salaryRegulationsService.create(dataToSend);
        
        // Fetch the latest data again to confirm and update UI
        const latestResponse = await salaryRegulationsService.getLatest();
        
        if (latestResponse.error) {
          throw new Error(latestResponse.error)
        }
        
        if (latestResponse.data) {
          const camelCaseData = convertObjectKeysToCamelCase(latestResponse.data);
          setRegulations(camelCaseData);
          setInitialRegulations(camelCaseData);
        }

        toast({ title: "Thành công", description: "Đã lưu và áp dụng quy định mới." });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Đã có lỗi xảy ra.";
        toast({ title: "Lỗi", description: errorMessage, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!regulations || !regulations.effectiveDate) {
    return <div className="flex-1 flex items-center justify-center">Không thể tải dữ liệu quy định.</div>
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
         {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quy định lương, bảo hiểm & thuế</h1>
            <p className="text-muted-foreground">Áp dụng từ ngày: {new Date(regulations.effectiveDate).toLocaleDateString('vi-VN')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveRegulations} disabled={!hasChanges || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {hasChanges ? "Lưu và áp dụng quy định mới" : "Đã lưu"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800">Bạn có thay đổi chưa được lưu. Một quy định mới sẽ được tạo với ngày hiệu lực là hôm nay.</span>
        </div>
      )}

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Lương & Công</TabsTrigger>
          <TabsTrigger value="overtime">Làm thêm giờ</TabsTrigger>
          <TabsTrigger value="insurance">Bảo hiểm</TabsTrigger>
          <TabsTrigger value="tax">Thuế TNCN</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card><CardHeader><CardTitle>Quy định lương và ngày công</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <RegulationInput label="Lương cơ sở (VNĐ)" value={regulations.basicSalary} onChange={v => handleInputChange('basicSalary', v)} currency />
              <RegulationInput label="Tỷ lệ lương thử việc (%)" value={regulations.probationSalaryRate} onChange={v => handleInputChange('probationSalaryRate', v)} />
              <RegulationInput label="Lương tối đa đóng BHXH (VNĐ)" value={regulations.maxInsuranceSalary} onChange={v => handleInputChange('maxInsuranceSalary', v)} currency />
              <RegulationInput label="Lương tối đa đóng BHTN (VNĐ)" value={regulations.maxUnemploymentSalary} onChange={v => handleInputChange('maxUnemploymentSalary', v)} currency />
              <RegulationInput label="Ngày công chuẩn/tháng" value={regulations.workingDaysPerMonth} onChange={v => handleInputChange('workingDaysPerMonth', v)} />
              <RegulationInput label="Giờ công chuẩn/ngày" value={regulations.workingHoursPerDay} onChange={v => handleInputChange('workingHoursPerDay', v)} />
              <RegulationInput label="Giờ tối đa 1 ngày" value={regulations.maxHoursPerDay} onChange={v => handleInputChange('maxHoursPerDay', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime">
          <Card><CardHeader><CardTitle>Tỷ lệ hưởng lương làm thêm giờ</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <RegulationRateInput label="Ngày thường" value={regulations.overtimeWeekdayRate} onChange={v => handleInputChange('overtimeWeekdayRate', v)} />
                <RegulationRateInput label="Cuối tuần" value={regulations.overtimeWeekendRate} onChange={v => handleInputChange('overtimeWeekendRate', v)} />
                <RegulationRateInput label="Ngày lễ, Tết" value={regulations.overtimeHolidayRate} onChange={v => handleInputChange('overtimeHolidayRate', v)} />
                <RegulationRateInput label="Ban đêm (thêm vào)" value={regulations.overtimeNightRate} onChange={v => handleInputChange('overtimeNightRate', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
            <div className="grid md:grid-cols-2 gap-6">
            <Card>
                    <CardHeader><CardTitle>Tỷ lệ đóng của Doanh nghiệp</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                        <RegulationRateInput label="BHXH" value={regulations.companySocialInsuranceRate} onChange={v => handleInputChange('companySocialInsuranceRate', v)} />
                        <RegulationRateInput label="BHYT" value={regulations.companyHealthInsuranceRate} onChange={v => handleInputChange('companyHealthInsuranceRate', v)} />
                        <RegulationRateInput label="BHTN" value={regulations.companyUnemploymentInsuranceRate} onChange={v => handleInputChange('companyUnemploymentInsuranceRate', v)} />
                        <RegulationRateInput label="Kinh phí Công đoàn" value={regulations.companyUnionFeeRate} onChange={v => handleInputChange('companyUnionFeeRate', v)} />
              </CardContent>
            </Card>
            <Card>
                    <CardHeader><CardTitle>Tỷ lệ đóng của Nhân viên</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                        <RegulationRateInput label="BHXH" value={regulations.employeeSocialInsuranceRate} onChange={v => handleInputChange('employeeSocialInsuranceRate', v)} />
                        <RegulationRateInput label="BHYT" value={regulations.employeeHealthInsuranceRate} onChange={v => handleInputChange('employeeHealthInsuranceRate', v)} />
                        <RegulationRateInput label="BHTN" value={regulations.employeeUnemploymentInsuranceRate} onChange={v => handleInputChange('employeeUnemploymentInsuranceRate', v)} />
                        <RegulationRateInput label="Kinh phí Công đoàn" value={regulations.employeeUnionFeeRate} onChange={v => handleInputChange('employeeUnionFeeRate', v)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tax">
          <Card>
                <CardHeader><CardTitle>Thuế Thu nhập cá nhân (TNCN)</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <RegulationInput label="Giảm trừ bản thân (VNĐ/tháng)" value={regulations.personalDeduction} onChange={v => handleInputChange('personalDeduction', v)} currency />
                        <RegulationInput label="Giảm trừ người phụ thuộc (VNĐ/tháng)" value={regulations.dependentDeduction} onChange={v => handleInputChange('dependentDeduction', v)} currency />
                        <RegulationRateInput label="Thuế suất cho người không cư trú (%)" value={regulations.nonResidentTaxRate} onChange={v => handleInputChange('nonResidentTaxRate', v)} />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                        <RegulationToggle 
                            label="Tính thuế lũy tiến" 
                            value={regulations.enableProgressiveTax} 
                            onChange={v => handleInputChange('enableProgressiveTax', v)}
                            description="Bật: Tính thuế theo bậc lũy tiến. Tắt: Tính thuế cố định 10%"
                        />
                        {!regulations.enableProgressiveTax && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>Chế độ thuế cố định:</strong> Tất cả thu nhập chịu thuế sẽ được tính thuế suất cố định 10%.
                                </p>
                            </div>
                        )}
                        {regulations.enableProgressiveTax && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong>Chế độ thuế lũy tiến:</strong> Thuế được tính theo bậc lũy tiến từ 5% đến 35% tùy theo thu nhập.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
