"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ChevronsUpDown, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  value?: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  options: MultiSelectOption[]
  emptyText?: string
  buttonClassName?: string
  maxDisplay?: number
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

export function MultiSelect({ 
  value = [], 
  onChange, 
  placeholder = "Chọn...", 
  options, 
  emptyText = "Không có kết quả", 
  buttonClassName,
  maxDisplay = 2,
  side = "bottom",
  align = "end"
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOptions = options.filter(option => value.includes(option.value))

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue))
  }

  const displayText = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>
    }
    
    return `${selectedOptions.length} mục đã chọn`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-10 h-auto", buttonClassName)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedOptions.length > 0 && selectedOptions.length <= maxDisplay ? (
              selectedOptions.map(option => (
                <Badge key={option.value} variant="secondary" className="text-xs">
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(option.value)
                    }}
                    className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-left">{displayText()}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        side={side}
        align={align}
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={16}
      >
        <Command>
          <CommandInput />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check className={cn("mr-2 h-4 w-4", value.includes(option.value) ? "opacity-100" : "opacity-0")} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
