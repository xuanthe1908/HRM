"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, RefreshCw, Sparkles, CheckCircle, XCircle, Download, Upload, BarChart3, Package, Zap } from "lucide-react"
import { BudgetCodeGenerator } from "@/lib/budget-code-generator"
import { useToast } from "@/components/ui/use-toast"

interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  parent_id?: string;
  level: number;
  category_type: number;
}

// Mock data cho demo
const mockCategories: BudgetCategory[] = [
  { id: '1', code: '100000', name: 'Chi phí bán hàng', level: 1, category_type: 1 },
  { id: '2', code: '101000', name: 'Chi phí sự kiện', level: 1, category_type: 1 },
  { id: '3', code: '10000001', name: 'Chi phí dụng cụ', parent_id: '1', level: 2, category_type: 1 },
  { id: '4', code: '10000002', name: 'Chi phí nhân sự', parent_id: '1', level: 2, category_type: 1 },
  { id: '5', code: '200000', name: 'Doanh thu', level: 1, category_type: 2 },
  { id: '6', code: '20000001', name: 'Doanh thu chính', parent_id: '5', level: 2, category_type: 2 },
]

export default function BudgetCodeDemo() {
  const { toast } = useToast()
  const [codeGenerator] = useState(new BudgetCodeGenerator(mockCategories))
  const [selectedParent, setSelectedParent] = useState<string>('')
  const [categoryType, setCategoryType] = useState<number>(1)
  const [customCode, setCustomCode] = useState<string>('')
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([])
  const [validation, setValidation] = useState<any>(null)

  // Auto generate codes when parent or type changes
  useEffect(() => {
    generateCodes()
  }, [selectedParent, categoryType])

  const generateCodes = () => {
    const parent = mockCategories.find(cat => cat.id === selectedParent)
    const codes = codeGenerator.getNextAvailableCodes(parent, categoryType, 10)
    setGeneratedCodes(codes)
  }

  const validateCustomCode = (code: string) => {
    const parent = mockCategories.find(cat => cat.id === selectedParent)
    const result = codeGenerator.validateCode(code, parent, categoryType)
    setValidation(result)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Đã copy", description: `Mã ${text} đã được copy vào clipboard` })
  }

  const parentCategories = mockCategories.filter(cat => cat.level <= 2) // Chỉ cho phép tạo con đến level 3

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Demo Sinh Mã Tự Động</span>
          </CardTitle>
          <CardDescription>
            Test logic sinh mã danh mục ngân sách tự động, tránh trùng lặp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cấu hình */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Loại danh mục</Label>
              <Select value={categoryType.toString()} onValueChange={(value) => setCategoryType(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">Chi phí</Badge>
                      <span>Mã bắt đầu 1xxxxx</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="default">Doanh thu</Badge>
                      <span>Mã bắt đầu 2xxxxx</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Danh mục cha (tùy chọn)</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn để tạo danh mục con" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Không có (tạo cấp 1)</SelectItem>
                  {parentCategories
                    .filter(cat => cat.category_type === categoryType)
                    .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{cat.code}</Badge>
                        <span>{cat.name}</span>
                        <Badge variant="secondary">Cấp {cat.level}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generateCodes} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tạo lại mã
              </Button>
            </div>
          </div>

          <Separator />

          {/* Kết quả sinh mã tự động */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">🎯 Mã được sinh tự động</h3>
            
            {generatedCodes.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {generatedCodes.map((code, index) => (
                  <Button
                    key={code}
                    variant={index === 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => copyToClipboard(code)}
                    className="justify-between"
                  >
                    <span>{code}</span>
                    {index === 0 && <Badge variant="secondary" className="ml-2">Đề xuất</Badge>}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Chọn cấu hình để sinh mã</p>
            )}

            {/* Thông tin cấu trúc */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800">📋 Cấu trúc mã:</h4>
              <p className="text-sm text-blue-700 mt-1">
                {selectedParent 
                  ? `Cấp ${(mockCategories.find(cat => cat.id === selectedParent)?.level || 0) + 1}: ${codeGenerator.getCodeStructureInfo((mockCategories.find(cat => cat.id === selectedParent)?.level || 0) + 1, categoryType)}`
                  : `Cấp 1: ${codeGenerator.getCodeStructureInfo(1, categoryType)}`
                }
              </p>
            </div>
          </div>

          <Separator />

          {/* Test validation mã tự nhập */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">✅ Test Validation Mã</h3>
            
            <div className="flex space-x-2">
              <Input
                placeholder="Nhập mã để test validation"
                value={customCode}
                onChange={(e) => {
                  setCustomCode(e.target.value)
                  if (e.target.value) {
                    validateCustomCode(e.target.value)
                  } else {
                    setValidation(null)
                  }
                }}
                className={validation && !validation.isValid ? "border-red-500" : validation?.isValid ? "border-green-500" : ""}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const parent = mockCategories.find(cat => cat.id === selectedParent)
                  const autoCode = codeGenerator.generateCode(parent, categoryType)
                  setCustomCode(autoCode)
                  validateCustomCode(autoCode)
                }}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Auto
              </Button>
            </div>

            {validation && (
              <div className={`p-3 rounded-lg ${validation.isValid ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center space-x-2">
                  {validation.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-medium ${validation.isValid ? 'text-green-800' : 'text-red-800'}`}>
                    {validation.isValid ? 'Mã hợp lệ!' : validation.error}
                  </span>
                </div>
                
                {!validation.isValid && validation.suggestion && (
                  <div className="mt-2">
                    <p className="text-sm text-red-700">Gợi ý:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomCode(validation.suggestion)
                        validateCustomCode(validation.suggestion)
                      }}
                      className="mt-1"
                    >
                      {validation.suggestion}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Bulk Generation */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">🚀 Tạo hàng loạt (Bulk Generation)</h3>
            
            <BulkGenerator 
              codeGenerator={codeGenerator}
              parentCategory={selectedParent ? mockCategories.find(cat => cat.id === selectedParent) : undefined}
              categoryType={categoryType}
            />
          </div>

          <Separator />

          {/* Pattern Analysis */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">📈 Phân tích mẫu mã</h3>
            
            <PatternAnalysis codeGenerator={codeGenerator} />
          </div>

          <Separator />

          {/* Export/Import */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">💾 Export/Import</h3>
            
            <ExportImportDemo codeGenerator={codeGenerator} />
          </div>

          <Separator />

          {/* Danh sách mã hiện có */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">📊 Danh mục hiện có (Mock Data)</h3>
            
            <div className="grid gap-2">
              {mockCategories
                .filter(cat => cat.category_type === categoryType)
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{cat.code}</Badge>
                    <span>{cat.name}</span>
                    <Badge variant="secondary">Cấp {cat.level}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cat.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Component con cho Bulk Generation
function BulkGenerator({ 
  codeGenerator, 
  parentCategory, 
  categoryType 
}: { 
  codeGenerator: BudgetCodeGenerator
  parentCategory?: BudgetCategory
  categoryType: number 
}) {
  const { toast } = useToast()
  const [bulkNames, setBulkNames] = useState('')
  const [bulkResults, setBulkResults] = useState<any[]>([])
  const [autoPrefix, setAutoPrefix] = useState(true)

  const handleBulkGenerate = () => {
    const names = bulkNames
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0)

    if (names.length === 0) {
      toast({ 
        title: "Lỗi", 
        description: "Vui lòng nhập tên danh mục", 
        variant: "destructive" 
      })
      return
    }

    const results = codeGenerator.bulkGenerateCodes(parentCategory, categoryType, names, autoPrefix)
    setBulkResults(results)
    
    toast({ 
      title: "Thành công", 
      description: `Đã tạo ${results.length} mã danh mục` 
    })
  }

  const copyAllCodes = () => {
    const codes = bulkResults.map(r => r.code).join(', ')
    navigator.clipboard.writeText(codes)
    toast({ title: "Đã copy", description: "Tất cả mã đã được copy" })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Danh sách tên danh mục (mỗi dòng một tên)</Label>
          <Textarea
            placeholder={`Chi phí văn phòng phẩm
Chi phí điện thoại
Chi phí internet
Chi phí bảo trì
Chi phí đào tạo`}
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            rows={6}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoPrefix"
              checked={autoPrefix}
              onChange={(e) => setAutoPrefix(e.target.checked)}
            />
            <Label htmlFor="autoPrefix" className="text-sm">
              Tự động thêm prefix từ danh mục cha
            </Label>
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={handleBulkGenerate} className="w-full" disabled={!bulkNames.trim()}>
            <Zap className="w-4 h-4 mr-2" />
            Tạo hàng loạt
          </Button>

          {bulkResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Kết quả: {bulkResults.length} mã</span>
                <Button variant="outline" size="sm" onClick={copyAllCodes}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy tất cả
                </Button>
              </div>
              
              <div className="max-h-40 overflow-y-auto space-y-1">
                {bulkResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <Badge variant="outline" className="mr-2">{result.code}</Badge>
                      <span className="font-medium">{result.suggestedName}</span>
                      {result.suggestedName !== result.originalName && (
                        <span className="text-gray-500 ml-2">← {result.originalName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Component con cho Pattern Analysis
function PatternAnalysis({ codeGenerator }: { codeGenerator: BudgetCodeGenerator }) {
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => {
    const result = codeGenerator.analyzeCodePatterns()
    setAnalysis(result)
  }, [codeGenerator])

  if (!analysis) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Thống kê tổng quan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>Tổng danh mục:</span>
            <Badge variant="outline">{analysis.totalCategories}</Badge>
          </div>
          
          {Object.entries(analysis.byType).map(([type, count]) => (
            <div key={type} className="flex justify-between">
              <span>{type === '1' ? 'Chi phí' : 'Doanh thu'}:</span>
              <Badge variant={type === '1' ? 'destructive' : 'default'}>{count as number}</Badge>
            </div>
          ))}
          
          {Object.entries(analysis.byLevel).map(([level, count]) => (
            <div key={level} className="flex justify-between">
              <span>Cấp {level}:</span>
              <Badge variant="secondary">{count as number}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Khoảng mã & Gợi ý</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(analysis.codeRanges).map(([type, range]) => (
            <div key={type}>
              <span className="text-sm font-medium">
                {type === '1' ? 'Chi phí' : 'Doanh thu'}:
              </span>
              <div className="text-sm text-gray-600">
                {(range as any).min} → {(range as any).max}
              </div>
            </div>
          ))}
          
          {analysis.gaps.length > 0 && (
            <div>
              <span className="text-sm font-medium">Gaps:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.gaps.map((gap: string) => (
                  <Badge key={gap} variant="outline" className="text-xs">
                    {gap}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {analysis.suggestions.length > 0 && (
            <div>
              <span className="text-sm font-medium">Gợi ý:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysis.suggestions.map((suggestion: string) => (
                  <Badge key={suggestion} variant="default" className="text-xs">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Component con cho Export/Import
function ExportImportDemo({ codeGenerator }: { codeGenerator: BudgetCodeGenerator }) {
  const { toast } = useToast()
  const [exportData, setExportData] = useState<any>(null)
  const [importData, setImportData] = useState('')
  const [importResult, setImportResult] = useState<any>(null)

  const handleExport = () => {
    const data = codeGenerator.exportStructure()
    setExportData(data)
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-categories-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast({ title: "Xuất thành công", description: "File JSON đã được tải xuống" })
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importData)
      const result = codeGenerator.importStructure(data)
      setImportResult(result)
      
      toast({ 
        title: result.success ? "Import thành công" : "Import có lỗi",
        description: result.summary,
        variant: result.success ? "default" : "destructive"
      })
    } catch (error) {
      toast({ 
        title: "Lỗi", 
        description: "Dữ liệu JSON không hợp lệ", 
        variant: "destructive" 
      })
    }
  }

  const generateTemplate = () => {
    const template = codeGenerator.generateImportTemplate()
    
    // Convert to CSV
    const csvContent = [
      template.headers.join(','),
      ...template.sampleData.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'budget-categories-template.csv'
    a.click()
    URL.revokeObjectURL(url)
    
    toast({ title: "Template đã tạo", description: "File CSV template đã được tải xuống" })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
        
        <Button onClick={generateTemplate} variant="outline">
          <Package className="w-4 h-4 mr-2" />
          Tạo Template CSV
        </Button>
        
        <Button onClick={handleImport} disabled={!importData.trim()}>
          <Upload className="w-4 h-4 mr-2" />
          Import & Validate
        </Button>
      </div>

      {exportData && (
        <Alert>
          <AlertDescription>
            📤 Đã export {exportData.metadata.totalCategories} danh mục vào {exportData.metadata.exportDate}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Import JSON Data (để test validation)</Label>
        <Textarea
          placeholder='{"categories": [{"id": "test", "code": "107000", "name": "Test category", "level": 1, "category_type": 1}]}'
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          rows={4}
        />
      </div>

      {importResult && (
        <Alert variant={importResult.success ? "default" : "destructive"}>
          <AlertDescription>
            <div className="space-y-2">
              <div>{importResult.summary}</div>
              
              {importResult.conflicts.length > 0 && (
                <div>
                  <strong>Conflicts:</strong>
                  <ul className="list-disc list-inside text-sm">
                    {importResult.conflicts.map((conflict: string, index: number) => (
                      <li key={index}>{conflict}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {importResult.newCategories.length > 0 && (
                <div>
                  <strong>New Categories:</strong> {importResult.newCategories.length} danh mục mới
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
