"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  message: string
  type?: "success" | "error"
  showCloseButton?: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

export function Modal({
  open,
  onClose,
  title,
  message,
  type = "success",
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000,
}: ModalProps) {
  React.useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [open, autoClose, autoCloseDelay, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <Card className={cn(
        "relative z-50 w-full max-w-md mx-4 shadow-lg",
        type === "success" && "border-green-500/30",
        type === "error" && "border-red-500/30"
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className={cn(
            type === "success" && "text-green-600",
            type === "error" && "text-red-600"
          )}>
            {title}
          </CardTitle>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-text-secondary">{message}</p>
        </CardContent>
        {!autoClose && (
          <CardFooter className="flex justify-end">
            <Button onClick={onClose} variant="default">
              OK
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

