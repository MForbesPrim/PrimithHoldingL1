"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ProjectService } from "@/services/projectService" // Import ProjectService
import type { Project } from "@/types/projects"

interface EditProjectDialogProps {
  open: boolean
  onClose: () => void
  project: Project | null
  onSave: (updatedProject: Partial<Project>) => Promise<void>
}

export function EditProjectDialog({ open, onClose, project, onSave }: EditProjectDialogProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: "",
    description: "",
    status: "active",
    startDate: "",
    endDate: "",
  })
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Add loading state
  const projectService = new ProjectService() // Instantiate ProjectService

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "active",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
      })
    }
  }, [project])

  const handleSubmit = async () => {
    if (!project?.id) return
    setIsSaving(true)
    try {
      const adjustDateToUTC = (dateString: string | undefined, originalDate: string | undefined) => {
        // If the date hasn't changed, return the original value
        if (dateString === originalDate) return dateString
        
        // Only adjust if it's a new date
        if (!dateString) return undefined
        const date = new Date(dateString)
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString()
      }
  
      const updatedProject: Partial<Project> = {
        name: formData.name,
        description: formData.description || "",
        status: formData.status,
        startDate: adjustDateToUTC(formData.startDate, project.startDate),
        endDate: adjustDateToUTC(formData.endDate, project.endDate),
      }
      await projectService.updateProject(project.id, updatedProject)
      await onSave({ ...project, ...updatedProject, updatedAt: new Date().toISOString() })
      onClose()
    } catch (error) {
      console.error("Failed to save project changes:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const parseDate = (dateString: string | undefined) => {
    if (!dateString) return undefined
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return undefined
    // Adjust for timezone offset
    const timezoneOffset = date.getTimezoneOffset() * 60000 // Convert minutes to milliseconds
    return new Date(date.getTime() + timezoneOffset)
  }
  

  const formatDate = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, "PPP")
  }

  const clearStartDate = () => {
    setFormData({ ...formData, startDate: "" })
    setStartOpen(false)
  }

  const clearEndDate = () => {
    setFormData({ ...formData, endDate: "" })
    setEndOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Project["status"] })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="hover:bg-gray-100 hover:text-gray-900">Active</SelectItem>
                <SelectItem value="completed" className="hover:bg-gray-100 hover:text-gray-900">Completed</SelectItem>
                <SelectItem value="archived" className="hover:bg-gray-100 hover:text-gray-900">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover modal={true} open={startOpen} onOpenChange={setStartOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                  onClick={() => setStartOpen((prev) => !prev)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? formatDate(parseDate(formData.startDate)) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                <div className="flex flex-col gap-2 p-2">
                  <Calendar
                    mode="single"
                    selected={parseDate(formData.startDate)}
                    onSelect={(date) => {
                      setFormData({ ...formData, startDate: date?.toISOString() || "" })
                      setStartOpen(false)
                    }}
                    initialFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearStartDate}
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover modal={true} open={endOpen} onOpenChange={setEndOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.endDate && "text-muted-foreground"
                  )}
                  onClick={() => setEndOpen((prev) => !prev)}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.endDate ? formatDate(parseDate(formData.endDate)) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                <div className="flex flex-col gap-2 p-2">
                  <Calendar
                    mode="single"
                    selected={parseDate(formData.endDate)}
                    onSelect={(date) => {
                      setFormData({ ...formData, endDate: date?.toISOString() || "" })
                      setEndOpen(false)
                    }}
                    initialFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearEndDate}
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.name}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}