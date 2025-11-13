"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  label: string
  value: string
}

interface ComboboxProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  options: ComboboxOption[]
  emptyText?: string
  buttonClassName?: string
}

export function Combobox({ value, onChange, placeholder = "Chọn...", options, emptyText = "Không có kết quả", buttonClassName }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selected = options.find(o => o.value === value)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn("w-full justify-between", buttonClassName)}
      >
        {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 overflow-hidden">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", opt.value === value ? "opacity-100" : "opacity-0")} />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}


