"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Calculator,
  TrendingUp,
  TrendingDown,
  Building2,
  Loader2
} from "lucide-react"
import { budgetCategoriesService, budgetAllocationsService } from "@/lib/services"
import { formatCurrency } from "@/utils/currency"
import { BudgetCodeGenerator } from "@/lib/budget-code-generator"

interface BudgetCategory {
  id: string
  code: string
  name: string
  parent_id?: string
  level: number
  category_type: number // 1=chi phí, 2=doanh thu
  description?: string
  is_active: boolean
  sort_order: number
  path?: string
  full_name?: string
  children?: BudgetCategory[]
}

interface BudgetAllocation {
  id: string
  budget_id: string
  category_id: string
  allocated_amount: number
  spent_amount: number
  remaining_amount: number
  notes?: string
  budget_categories: BudgetCategory
}

interface BudgetCategoryManagerProps {
  budgetId?: string
  onCategorySelect?: (category: BudgetCategory) => void
  mode?: 'manage' | 'select' | 'allocate'
  selectedCategoryId?: string
}

export default function BudgetCategoryManager({
  budgetId,
  onCategorySelect,
  mode = 'manage',
  selectedCategoryId
}: BudgetCategoryManagerProps) {
  const { toast } = useToast()
  
  // State
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [parentCategory, setParentCategory] = useState<BudgetCategory | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [codeGenerator, setCodeGenerator] = useState<BudgetCodeGenerator | null>(null)
  const [suggestedCodes, setSuggestedCodes] = useState<string[]>([])
  const [codeValidation, setCodeValidation] = useState<{isValid: boolean, error?: string, suggestion?: string} | null>(null)

  // Form state
  const [newCategory, setNewCategory] = useState({
    code: '',
    name: '',
    category_type: 1,
    description: '',
    sort_order: 0
  })

  const [editCategory, setEditCategory] = useState({
    name: '',
    description: '',
    sort_order: 0,
    is_active: true
  })

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Try to fetch categories tree first, fallback to flat if tree function doesn't exist
      let categoriesResult
      try {
        categoriesResult = await budgetCategoriesService.getCategories({ tree: true })
        console.log('Tree API response:', categoriesResult)
      } catch (treeError) {
        console.warn('Tree API failed, falling back to flat:', treeError)
        // Fallback to flat categories if tree function doesn't exist
        categoriesResult = await budgetCategoriesService.getCategories({})
        console.log('Flat API response:', categoriesResult)
      }
      
      if (categoriesResult.data) {
        // Handle nested data structure: {data: {data: Array}} or {data: Array}
        let actualData = categoriesResult.data
        
        // If data has nested data property, use that
        if (actualData.data && Array.isArray(actualData.data)) {
          actualData = actualData.data
        }
        
        if (Array.isArray(actualData)) {
          console.log(`📊 Processing ${actualData.length} categories`)
          // Build tree structure from flat array
          const treeData = buildCategoryTree(actualData)
          setCategories(treeData)
        } else {
          console.error('Expected array but got:', actualData)
          setCategories([])
        }
      } else {
        console.warn('No categories data returned from API')
        setCategories([])
      }

      // Fetch allocations if budgetId is provided
      if (budgetId && mode === 'allocate') {
        console.log('🔄 Fetching allocations for budget:', budgetId)
        const allocationsResult = await budgetAllocationsService.getAllocations({ budget_id: budgetId })
        console.log('📊 Allocations API response:', allocationsResult)
        
        if (allocationsResult.data) {
          // Handle nested data structure if needed
          let actualData = allocationsResult.data
          if (actualData.data && Array.isArray(actualData.data)) {
            actualData = actualData.data
          }
          
          if (Array.isArray(actualData)) {
            console.log('✅ Setting allocations:', actualData.length, 'items')
            setAllocations(actualData)
          } else {
            console.error('❌ Allocations data is not an array:', actualData)
            setAllocations([])
          }
        } else {
          console.log('⚠️ No allocations data received')
          setAllocations([])
        }
      } else {
        // Reset allocations if not in allocate mode
        setAllocations([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Lỗi",
        description: "Không thể tải dữ liệu danh mục",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [budgetId, mode])

  // Initialize code generator when categories change
  useEffect(() => {
    if (categories.length > 0) {
      const flatCategories = flattenCategories(categories)
      setCodeGenerator(new BudgetCodeGenerator(flatCategories))
    }
  }, [categories])

  // Flatten categories for code generator
  const flattenCategories = (treeCategories: BudgetCategory[]): BudgetCategory[] => {
    const result: BudgetCategory[] = []
    
    const flatten = (cats: BudgetCategory[]) => {
      cats.forEach(cat => {
        result.push(cat)
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children)
        }
      })
    }
    
    flatten(treeCategories)
    return result
  }

  // Build tree structure
  const buildCategoryTree = (flatCategories: any[]): BudgetCategory[] => {
    
    if (!Array.isArray(flatCategories)) {
      console.error('flatCategories is not an array:', flatCategories)
      return []
    }
    
    const categoryMap = new Map<string, BudgetCategory>()
    const rootCategories: BudgetCategory[] = []

    // First pass: create all category objects
    flatCategories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree structure
    flatCategories.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        const parent = categoryMap.get(cat.parent_id)!
        parent.children!.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    console.log('✅ Built tree structure:', {
      totalCategories: flatCategories.length,
      rootCategories: rootCategories.length,
      roots: rootCategories.map(r => ({ name: r.name, children: r.children?.length || 0 }))
    })

    // Sort root categories by sort_order and code
    rootCategories.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      return a.code.localeCompare(b.code)
    })

    // Sort children recursively
    const sortChildren = (categories: BudgetCategory[]) => {
      categories.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          cat.children.sort((a, b) => {
            if (a.sort_order !== b.sort_order) {
              return a.sort_order - b.sort_order
            }
            return a.code.localeCompare(b.code)
          })
          sortChildren(cat.children)
        }
      })
    }

    sortChildren(rootCategories)

    return rootCategories
  }

  // Toggle expand/collapse
  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedNodes(newExpanded)
  }

  // Handle create category
  const handleCreateCategory = async () => {
    if (isSubmitting) return
    
    try {
      setIsSubmitting(true)
      const result = await budgetCategoriesService.createCategory({
        code: newCategory.code,
        name: newCategory.name,
        parent_id: parentCategory?.id,
        category_type: newCategory.category_type,
        description: newCategory.description,
        sort_order: newCategory.sort_order
      })
      
      if (result.data) {
        toast({
          title: "Thành công",
          description: "Đã tạo danh mục mới"
        })
        setIsCreateDialogOpen(false)
        setParentCategory(null)
        setNewCategory({
          code: '',
          name: '',
          category_type: 1,
          description: '',
          sort_order: 0
        })
        fetchData()
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo danh mục",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit category
  const handleEditCategory = async () => {
    if (!editingCategory || isSubmitting) return
    
    try {
      setIsSubmitting(true)
      const result = await budgetCategoriesService.updateCategory(editingCategory.id, {
        name: editCategory.name,
        description: editCategory.description,
        sort_order: editCategory.sort_order,
        is_active: editCategory.is_active
      })
      
      if (result.data) {
        toast({
          title: "Thành công", 
          description: "Đã cập nhật danh mục"
        })
        setIsEditDialogOpen(false)
        setEditingCategory(null)
        fetchData()
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật danh mục",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle delete category
  const handleDeleteCategory = async (category: BudgetCategory) => {
    try {
      const result = await budgetCategoriesService.deleteCategory(category.id)
      if (result.data) {
        toast({
          title: "Thành công",
          description: "Đã xóa danh mục"
        })
        fetchData()
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xóa danh mục",
        variant: "destructive"
      })
    }
  }

  // Auto-generate code when opening create dialog
  const generateCodeForNewCategory = (parent?: BudgetCategory, categoryType: number = 1) => {
    if (!codeGenerator) return ''
    return codeGenerator.generateCode(parent, categoryType)
  }

  // Validate code and show suggestions
  const validateCode = (code: string, parent?: BudgetCategory, categoryType: number = 1) => {
    if (!codeGenerator) return
    
    const validation = codeGenerator.validateCode(code, parent, categoryType)
    setCodeValidation(validation)
    
    if (!validation.isValid) {
      // Show alternative suggestions
      const suggestions = codeGenerator.getNextAvailableCodes(parent, categoryType, 3)
      setSuggestedCodes(suggestions)
    } else {
      setSuggestedCodes([])
    }
  }

  // Open dialogs
  const openCreateDialog = (parent?: BudgetCategory) => {
    setParentCategory(parent || null)
    const categoryType = parent?.category_type || 1
    const autoCode = generateCodeForNewCategory(parent, categoryType)
    
    setNewCategory({
      code: autoCode,
      name: '',
      category_type: categoryType,
      description: '',
      sort_order: 0
    })
    
    // Generate suggested codes
    if (codeGenerator) {
      const suggestions = codeGenerator.getNextAvailableCodes(parent, categoryType, 5)
      setSuggestedCodes(suggestions)
    }
    
    setCodeValidation(null)
    setIsCreateDialogOpen(true)
  }

  const openEditDialog = (category: BudgetCategory) => {
    setEditingCategory(category)
    setEditCategory({
      name: category.name,
      description: category.description || '',
      sort_order: category.sort_order,
      is_active: category.is_active
    })
    setIsEditDialogOpen(true)
  }

  // Get allocation for category
  const getAllocationForCategory = (categoryId: string): BudgetAllocation | undefined => {
    if (!Array.isArray(allocations)) {
      console.warn('⚠️ getAllocationForCategory: allocations is not an array:', allocations)
      return undefined
    }
    return allocations.find(alloc => alloc.category_id === categoryId)
  }

  // Render category tree
  const renderCategoryTree = (cats: BudgetCategory[], level: number = 0): React.ReactNode => {
    return cats.map((category, index) => {
      const isExpanded = expandedNodes.has(category.id)
      const hasChildren = category.children && category.children.length > 0
      const allocation = getAllocationForCategory(category.id)
      const isSelected = selectedCategoryId === category.id

      return (
        <div key={`${category.id}-${level}-${index}`} className={`mb-1 ${level > 0 ? 'ml-6' : ''}`}>
          <div 
            className={`
              flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer
              ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
            `}
            onClick={() => onCategorySelect?.(category)}
          >
            <div className="flex items-center space-x-2 flex-1">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 w-6 h-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(category.id)
                  }}
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              
              <div className="flex items-center space-x-2">
                {category.category_type === 1 ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
                <Badge variant="outline" className="text-xs font-mono">
                  {category.code}
                </Badge>
              </div>
              
              <div className="flex-1">
                <div className="font-medium">{category.name}</div>
                {category.description && (
                  <div className="text-sm text-muted-foreground">{category.description}</div>
                )}
              </div>
            </div>

            {mode === 'allocate' && allocation && (
              <div className="text-right mr-4">
                <div className="text-sm font-medium">
                  {formatCurrency(allocation.allocated_amount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Đã chi: {formatCurrency(allocation.spent_amount)}
                </div>
                <div className={`text-xs ${allocation.remaining_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Còn lại: {formatCurrency(allocation.remaining_amount)}
                </div>
              </div>
            )}

            {mode === 'manage' && (
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCreateDialog(category)
                  }}
                >
                  <FolderPlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEditDialog(category)
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteCategory(category)
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {isExpanded && hasChildren && (
            <div key={`children-${category.id}`} className="mt-1">
              {renderCategoryTree(category.children!, level + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Đang tải...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Danh mục Ngân sách</span>
              </CardTitle>
              <CardDescription>
                Quản lý cấu trúc danh mục thu chi theo mã kế toán
              </CardDescription>
            </div>
            {mode === 'manage' && (
              <Button onClick={() => openCreateDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm danh mục
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Đang tải danh mục...
              </div>
            ) : categories.length > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-2">
                  Hiển thị {categories.length} danh mục gốc
                </div>
                {renderCategoryTree(categories)}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có danh mục nào
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Thêm danh mục mới
              {parentCategory && (
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}vào {parentCategory.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Tạo danh mục ngân sách mới với mã và cấu trúc phân cấp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Mã danh mục</Label>
                    <div className="space-y-2">
                      <Input
                        id="code"
                        placeholder={codeGenerator?.getCodeStructureInfo(parentCategory ? parentCategory.level + 1 : 1, newCategory.category_type) || "VD: 101001"}
                        value={newCategory.code}
                        onChange={(e) => {
                          const newCode = e.target.value
                          setNewCategory({...newCategory, code: newCode})
                          validateCode(newCode, parentCategory, newCategory.category_type)
                        }}
                        className={codeValidation && !codeValidation.isValid ? "border-red-500" : ""}
                        required
                      />
                      
                      {/* Code validation message */}
                      {codeValidation && !codeValidation.isValid && (
                        <p className="text-sm text-red-600">{codeValidation.error}</p>
                      )}
                      
                      {/* Auto-generate button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const autoCode = generateCodeForNewCategory(parentCategory, newCategory.category_type)
                          setNewCategory({...newCategory, code: autoCode})
                          validateCode(autoCode, parentCategory, newCategory.category_type)
                        }}
                      >
                        🎯 Tự động sinh mã
                      </Button>
                      
                      {/* Code suggestions */}
                      {suggestedCodes.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Gợi ý mã khả dụng:</p>
                          <div className="flex flex-wrap gap-1">
                            {suggestedCodes.slice(0, 5).map((code) => (
                              <Button
                                key={code}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs px-2 py-1 h-auto"
                                onClick={() => {
                                  setNewCategory({...newCategory, code})
                                  validateCode(code, parentCategory, newCategory.category_type)
                                }}
                              >
                                {code}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Code structure info */}
                      <p className="text-xs text-muted-foreground">
                        📋 Cấu trúc: {codeGenerator?.getCodeStructureInfo(parentCategory ? parentCategory.level + 1 : 1, newCategory.category_type)}
                      </p>
                    </div>
                  </div>
              <div className="space-y-2">
                <Label htmlFor="category_type">Loại</Label>
                <Select 
                  value={newCategory.category_type.toString()} 
                  onValueChange={(value) => setNewCategory({...newCategory, category_type: parseInt(value)})}
                  disabled={!!parentCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Chi phí</SelectItem>
                    <SelectItem value="2">Doanh thu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Tên danh mục</Label>
              <Input
                id="name"
                placeholder="Nhập tên danh mục"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết về danh mục"
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Thứ tự sắp xếp</Label>
              <Input
                id="sort_order"
                type="number"
                placeholder="0"
                value={newCategory.sort_order}
                onChange={(e) => setNewCategory({...newCategory, sort_order: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
                      <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button 
                onClick={handleCreateCategory} 
                disabled={isSubmitting || (codeValidation && !codeValidation.isValid)}
              >
                {isSubmitting ? "Đang tạo..." : "Tạo danh mục"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cho danh mục "{editingCategory?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Tên danh mục</Label>
              <Input
                id="edit_name"
                value={editCategory.name}
                onChange={(e) => setEditCategory({...editCategory, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Mô tả</Label>
              <Textarea
                id="edit_description"
                value={editCategory.description}
                onChange={(e) => setEditCategory({...editCategory, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_sort_order">Thứ tự sắp xếp</Label>
                <Input
                  id="edit_sort_order"
                  type="number"
                  value={editCategory.sort_order}
                  onChange={(e) => setEditCategory({...editCategory, sort_order: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_is_active">Trạng thái</Label>
                <Select 
                  value={editCategory.is_active.toString()} 
                  onValueChange={(value) => setEditCategory({...editCategory, is_active: value === 'true'})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Hoạt động</SelectItem>
                    <SelectItem value="false">Tạm dừng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button onClick={handleEditCategory} disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
