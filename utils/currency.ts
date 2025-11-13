export const formatCurrency = (amount: number, language: "en" | "vi" = "vi"): string => {
  // Handle NaN, null, undefined cases
  const safeAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  
  if (language === "vi") {
    // Format for Vietnamese: 1.000.000 VNĐ
    return new Intl.NumberFormat("vi-VN").format(safeAmount) + " VNĐ"
  } else {
    // Format for English: VNĐ 1,000,000
    return "VNĐ " + new Intl.NumberFormat("en-US").format(safeAmount)
  }
}

export const formatCurrencyShort = (amount: number, language: "en" | "vi" = "vi"): string => {
  // Handle NaN, null, undefined cases
  const safeAmount = isNaN(amount) || amount === null || amount === undefined ? 0 : amount;
  
  if (language === "vi") {
    if (safeAmount >= 1000000000) {
      return (safeAmount / 1000000000).toFixed(1) + " tỷ VNĐ"
    } else if (safeAmount >= 1000000) {
      return (safeAmount / 1000000).toFixed(1) + " triệu VNĐ"
    } else if (safeAmount >= 1000) {
      return (safeAmount / 1000).toFixed(0) + "k VNĐ"
    }
    return safeAmount.toLocaleString("vi-VN") + " VNĐ"
  } else {
    if (safeAmount >= 1000000000) {
      return "VNĐ " + (safeAmount / 1000000000).toFixed(1) + "B"
    } else if (safeAmount >= 1000000) {
      return "VNĐ " + (safeAmount / 1000000).toFixed(1) + "M"
    } else if (safeAmount >= 1000) {
      return "VNĐ " + (safeAmount / 1000).toFixed(0) + "K"
    }
    return "VNĐ " + safeAmount.toLocaleString("en-US")
  }
}
