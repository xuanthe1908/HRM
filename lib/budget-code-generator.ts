/**
 * Logic tự động sinh mã danh mục ngân sách
 * Tránh trùng lặp và tuân theo cấu trúc phân cấp
 */

interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  parent_id?: string;
  level: number;
  category_type: number; // 1=Chi phí, 2=Doanh thu
}

export class BudgetCodeGenerator {
  private categories: BudgetCategory[] = [];

  constructor(categories: BudgetCategory[]) {
    this.categories = categories;
  }

  /**
   * Sinh mã tự động cho danh mục mới
   */
  generateCode(parentCategory?: BudgetCategory, categoryType: number = 1): string {
    if (!parentCategory) {
      // Tạo mã cho danh mục cấp 1 (6 số)
      return this.generateLevel1Code(categoryType);
    } else {
      // Tạo mã cho danh mục con
      return this.generateChildCode(parentCategory);
    }
  }

  /**
   * Sinh mã cho danh mục cấp 1
   * Chi phí: 100000, 101000, 102000, 103000, 104000, 105000...
   * Doanh thu: 200000, 201000, 202000, 203000...
   */
  private generateLevel1Code(categoryType: number): string {
    const baseCode = categoryType === 1 ? 100000 : 200000;
    const existingCodes = this.categories
      .filter(cat => cat.level === 1 && cat.category_type === categoryType)
      .map(cat => parseInt(cat.code))
      .sort((a, b) => a - b);

    // Tìm số tiếp theo
    let nextCode = baseCode;
    for (const code of existingCodes) {
      if (code === nextCode) {
        nextCode += 1000; // Tăng 1000 cho mỗi danh mục cấp 1
      } else {
        break;
      }
    }

    return nextCode.toString();
  }

  /**
   * Sinh mã cho danh mục con
   * Cấp 2: Parent_code + 01, 02, 03... (8 số)
   * Cấp 3: Parent_code + 01, 02, 03... (10 số)
   */
  private generateChildCode(parentCategory: BudgetCategory): string {
    const parentCode = parentCategory.code;
    const childLevel = parentCategory.level + 1;
    
    // Lấy danh sách mã con hiện có của parent này
    const existingChildCodes = this.categories
      .filter(cat => cat.parent_id === parentCategory.id)
      .map(cat => cat.code)
      .sort();

    // Xác định độ dài mã cho level mới
    const codeLength = this.getCodeLength(childLevel);
    
    // Sinh mã tiếp theo
    let sequence = 1;
    let newCode = '';
    
    do {
      const sequenceStr = sequence.toString().padStart(2, '0');
      
      if (childLevel === 2) {
        // Cấp 2: 8 số (VD: 10000001, 10000002)
        newCode = parentCode + sequenceStr;
      } else if (childLevel === 3) {
        // Cấp 3: 10 số (VD: 1030000101, 1030000102)
        newCode = parentCode + sequenceStr;
      } else {
        // Cấp 4+: Thêm 2 số nữa
        newCode = parentCode + sequenceStr;
      }
      
      sequence++;
    } while (existingChildCodes.includes(newCode) && sequence <= 99);

    return newCode;
  }

  /**
   * Xác định độ dài mã theo level
   */
  private getCodeLength(level: number): number {
    switch (level) {
      case 1: return 6;  // 100000
      case 2: return 8;  // 10000001
      case 3: return 10; // 1030000101
      default: return 10 + (level - 3) * 2; // Mở rộng cho các level tiếp theo
    }
  }

  /**
   * Kiểm tra mã có hợp lệ không
   */
  validateCode(code: string, parentCategory?: BudgetCategory, categoryType: number = 1): {
    isValid: boolean;
    error?: string;
    suggestion?: string;
  } {
    // Kiểm tra định dạng cơ bản
    if (!/^\d+$/.test(code)) {
      return {
        isValid: false,
        error: 'Mã chỉ được chứa số',
        suggestion: this.generateCode(parentCategory, categoryType)
      };
    }

    // Kiểm tra trùng lặp
    if (this.categories.some(cat => cat.code === code)) {
      return {
        isValid: false,
        error: 'Mã đã tồn tại',
        suggestion: this.generateCode(parentCategory, categoryType)
      };
    }

    // Kiểm tra độ dài và cấu trúc
    const expectedLength = this.getCodeLength(parentCategory ? parentCategory.level + 1 : 1);
    if (code.length !== expectedLength) {
      return {
        isValid: false,
        error: `Mã phải có ${expectedLength} số`,
        suggestion: this.generateCode(parentCategory, categoryType)
      };
    }

    // Kiểm tra prefix với parent
    if (parentCategory) {
      if (!code.startsWith(parentCategory.code)) {
        return {
          isValid: false,
          error: `Mã phải bắt đầu với ${parentCategory.code}`,
          suggestion: this.generateCode(parentCategory, categoryType)
        };
      }
    } else {
      // Kiểm tra prefix cho cấp 1
      const expectedPrefix = categoryType === 1 ? '1' : '2';
      if (!code.startsWith(expectedPrefix)) {
        return {
          isValid: false,
          error: `Mã ${categoryType === 1 ? 'chi phí' : 'doanh thu'} phải bắt đầu với ${expectedPrefix}`,
          suggestion: this.generateCode(parentCategory, categoryType)
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Gợi ý mã dựa trên tên danh mục
   */
  suggestCodesFromName(name: string, parentCategory?: BudgetCategory, categoryType: number = 1): string[] {
    const suggestions = [];
    
    // Luôn có mã tự động cơ bản
    suggestions.push(this.generateCode(parentCategory, categoryType));
    
    // Gợi ý thêm một vài mã khác nếu có thể
    if (!parentCategory) {
      // Cho cấp 1, gợi ý thêm vài mã tiếp theo
      const baseCode = this.generateCode(parentCategory, categoryType);
      const baseNum = parseInt(baseCode);
      suggestions.push((baseNum + 1000).toString());
      suggestions.push((baseNum + 2000).toString());
    }
    
    return suggestions.filter(code => this.validateCode(code, parentCategory, categoryType).isValid);
  }

  /**
   * Lấy thông tin cấu trúc mã
   */
  getCodeStructureInfo(level: number, categoryType: number): string {
    const examples = {
      1: categoryType === 1 ? '100000, 101000, 102000...' : '200000, 201000, 202000...',
      2: categoryType === 1 ? '10000001, 10000002...' : '20000001, 20000002...',
      3: categoryType === 1 ? '1030000101, 1030000102...' : '2030000101, 2030000102...'
    };
    
    return examples[level as keyof typeof examples] || `${this.getCodeLength(level)} số`;
  }

  /**
   * Lấy mã tiếp theo có thể sử dụng
   */
  getNextAvailableCodes(parentCategory?: BudgetCategory, categoryType: number = 1, count: number = 5): string[] {
    const codes = [];
    let baseCode = this.generateCode(parentCategory, categoryType);
    
    for (let i = 0; i < count; i++) {
      while (this.categories.some(cat => cat.code === baseCode)) {
        // Tăng mã nếu bị trùng
        if (!parentCategory) {
          // Cấp 1: tăng 1000
          baseCode = (parseInt(baseCode) + 1000).toString();
        } else {
          // Cấp con: tăng 1
          const lastTwoDigits = parseInt(baseCode.slice(-2));
          const prefix = baseCode.slice(0, -2);
          const newSequence = (lastTwoDigits + 1).toString().padStart(2, '0');
          baseCode = prefix + newSequence;
        }
      }
      
      codes.push(baseCode);
      
      // Chuẩn bị cho lần lặp tiếp theo
      if (!parentCategory) {
        baseCode = (parseInt(baseCode) + 1000).toString();
      } else {
        const lastTwoDigits = parseInt(baseCode.slice(-2));
        const prefix = baseCode.slice(0, -2);
        const newSequence = (lastTwoDigits + 1).toString().padStart(2, '0');
        baseCode = prefix + newSequence;
      }
    }
    
    return codes;
  }

  /**
   * Tạo nhiều mã cùng lúc với tên tự động
   */
  bulkGenerateCodes(
    parentCategory: BudgetCategory | undefined,
    categoryType: number,
    names: string[],
    autoPrefix: boolean = true
  ): Array<{code: string, suggestedName: string, originalName: string}> {
    const results = [];
    const usedCodes = new Set(this.categories.map(cat => cat.code));
    
    for (let i = 0; i < names.length; i++) {
      const originalName = names[i];
      let code = '';
      let attempts = 0;
      
      // Tạo mã duy nhất
      do {
        if (!parentCategory) {
          // Cấp 1
          const baseCode = categoryType === 1 ? 100000 : 200000;
          code = (baseCode + (i + attempts) * 1000).toString();
        } else {
          // Cấp con
          const sequence = (i + 1 + attempts).toString().padStart(2, '0');
          code = parentCategory.code + sequence;
        }
        attempts++;
      } while (usedCodes.has(code) && attempts < 100);
      
      // Gợi ý tên thông minh
      let suggestedName = originalName;
      if (autoPrefix && parentCategory) {
        // Thêm prefix từ tên danh mục cha
        const parentPrefix = this.extractPrefix(parentCategory.name);
        if (parentPrefix && !originalName.toLowerCase().includes(parentPrefix.toLowerCase())) {
          suggestedName = `${parentPrefix} ${originalName}`;
        }
      }
      
      usedCodes.add(code);
      results.push({
        code,
        suggestedName,
        originalName
      });
    }
    
    return results;
  }

  /**
   * Trích xuất prefix từ tên danh mục cha
   */
  private extractPrefix(parentName: string): string {
    // Lấy từ đầu tiên hoặc cụm từ đầu
    const patterns = [
      /^Chi phí\s+(.+?)(?:\s|$)/i,
      /^Doanh thu\s+(.+?)(?:\s|$)/i,
      /^(.+?)\s+chi phí/i,
      /^(.+?)\s+doanh thu/i,
      /^([^\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = parentName.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return '';
  }

  /**
   * Phân tích mẫu mã hiện có
   */
  analyzeCodePatterns(): {
    totalCategories: number;
    byType: Record<number, number>;
    byLevel: Record<number, number>;
    codeRanges: Record<number, {min: string, max: string}>;
    gaps: string[];
    suggestions: string[];
  } {
    const analysis = {
      totalCategories: this.categories.length,
      byType: {} as Record<number, number>,
      byLevel: {} as Record<number, number>,
      codeRanges: {} as Record<number, {min: string, max: string}>,
      gaps: [] as string[],
      suggestions: [] as string[]
    };

    // Phân tích theo loại và level
    this.categories.forEach(cat => {
      analysis.byType[cat.category_type] = (analysis.byType[cat.category_type] || 0) + 1;
      analysis.byLevel[cat.level] = (analysis.byLevel[cat.level] || 0) + 1;
    });

    // Phân tích khoảng mã theo loại
    Object.keys(analysis.byType).forEach(typeStr => {
      const type = parseInt(typeStr);
      const typeCodes = this.categories
        .filter(cat => cat.category_type === type)
        .map(cat => cat.code)
        .sort();
      
      if (typeCodes.length > 0) {
        analysis.codeRanges[type] = {
          min: typeCodes[0],
          max: typeCodes[typeCodes.length - 1]
        };
      }
    });

    // Tìm gaps trong mã
    const level1Codes = this.categories
      .filter(cat => cat.level === 1 && cat.category_type === 1)
      .map(cat => parseInt(cat.code))
      .sort((a, b) => a - b);

    for (let i = 0; i < level1Codes.length - 1; i++) {
      const current = level1Codes[i];
      const next = level1Codes[i + 1];
      const expectedNext = current + 1000;
      
      if (next > expectedNext) {
        // Có gap
        analysis.gaps.push(expectedNext.toString());
      }
    }

    // Gợi ý mã tiếp theo
    if (level1Codes.length > 0) {
      const lastCode = level1Codes[level1Codes.length - 1];
      analysis.suggestions.push((lastCode + 1000).toString());
    }

    return analysis;
  }

  /**
   * Xuất cấu trúc mã ra JSON
   */
  exportStructure(): {
    metadata: {
      exportDate: string;
      totalCategories: number;
      version: string;
    };
    categories: BudgetCategory[];
    structure: any;
  } {
    return {
      metadata: {
        exportDate: new Date().toISOString(),
        totalCategories: this.categories.length,
        version: '1.0'
      },
      categories: this.categories,
      structure: this.analyzeCodePatterns()
    };
  }

  /**
   * Nhập cấu trúc mã từ JSON và kiểm tra conflict
   */
  importStructure(data: any): {
    success: boolean;
    conflicts: string[];
    newCategories: BudgetCategory[];
    summary: string;
  } {
    const conflicts = [];
    const newCategories = [];
    
    if (!data.categories || !Array.isArray(data.categories)) {
      return {
        success: false,
        conflicts: ['Dữ liệu không hợp lệ'],
        newCategories: [],
        summary: 'Import thất bại'
      };
    }

    // Kiểm tra conflict
    data.categories.forEach((cat: BudgetCategory) => {
      const existing = this.categories.find(existing => existing.code === cat.code);
      if (existing) {
        conflicts.push(`Mã ${cat.code} đã tồn tại (${existing.name})`);
      } else {
        newCategories.push(cat);
      }
    });

    const summary = `Tìm thấy ${data.categories.length} danh mục, ${newCategories.length} mới, ${conflicts.length} conflict`;

    return {
      success: conflicts.length === 0,
      conflicts,
      newCategories,
      summary
    };
  }

  /**
   * Tạo template Excel/CSV cho bulk import
   */
  generateImportTemplate(parentCategory?: BudgetCategory): {
    headers: string[];
    sampleData: string[][];
    instructions: string[];
  } {
    const headers = ['Mã danh mục', 'Tên danh mục', 'Mô tả', 'Thứ tự sắp xếp'];
    
    const sampleData = [];
    if (!parentCategory) {
      // Template cho cấp 1
      sampleData.push(['105000', 'Chi phí marketing', 'Chi phí quảng cáo và tiếp thị', '60']);
      sampleData.push(['106000', 'Chi phí nghiên cứu phát triển', 'Chi phí R&D', '70']);
    } else {
      // Template cho cấp con
      const codes = this.getNextAvailableCodes(parentCategory, parentCategory.category_type, 3);
      sampleData.push([codes[0], 'Danh mục con 1', 'Mô tả danh mục con 1', '1']);
      sampleData.push([codes[1], 'Danh mục con 2', 'Mô tả danh mục con 2', '2']);
      sampleData.push([codes[2], 'Danh mục con 3', 'Mô tả danh mục con 3', '3']);
    }

    const instructions = [
      'Điền thông tin danh mục vào các cột tương ứng',
      'Mã danh mục phải tuân theo cấu trúc phân cấp',
      'Tên danh mục không được để trống',
      'Thứ tự sắp xếp là số nguyên (0, 1, 2...)',
      parentCategory ? `Mã phải bắt đầu với ${parentCategory.code}` : 'Mã cấp 1 phải có 6 số'
    ];

    return { headers, sampleData, instructions };
  }
}
