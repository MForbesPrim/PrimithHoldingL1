import { useState, useMemo, useRef, useEffect } from "react"
import { RoadmapItem } from "@/types/projects"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  CalendarDays,
  ChevronUp,
  ChevronsUpDown,
  Loader2
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { format, parseISO, getQuarter } from "date-fns"
import GanttChart from "./ganttChart"
import { ProjectService } from "@/services/projectService";
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Helper function to capitalize the first letter of each word
const capitalizeWords = (str: string) => {
  return str
    .split('_') // Split by underscore for statuses like "in_progress"
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

interface MilestoneStatus {
  id: string;
  name: string;
  color: string;
  description?: string;
  is_default: boolean;
  is_system: boolean;
}


interface RoadmapViewProps {
  items: RoadmapItem[];
  onItemCreate: (item: Partial<RoadmapItem>) => Promise<void>;
  onItemUpdate: (itemId: string, item: Partial<RoadmapItem>) => Promise<void>;
  onItemDelete?: (itemId: string) => Promise<void>;
  projectId: string;
}

type RoadmapFormData = Partial<RoadmapItem> & { 
  asMilestone?: boolean;
  statusId?: string;
}

export function RoadmapView({ 
  items, 
  onItemCreate, 
  onItemUpdate, 
  onItemDelete,
  projectId
}: RoadmapViewProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({})
  const [view, setView] = useState<"list" | "timeline" | "status" | "category" | "gantt">("timeline")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [categories, setCategories] = useState<string[]>([])
  const [openCategory, setOpenCategory] = useState(false) // State for category Popover
  const [openParent, setOpenParent] = useState(false) // State for parent Popover
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false) // State for saving status
  const [isDeleting, setIsDeleting] = useState(false) // State for delete status
  const categorySelectRef = useRef<HTMLButtonElement>(null)
  const parentSelectRef = useRef<HTMLButtonElement>(null)
  const projectsService = new ProjectService()
  const safeItems = items || []
  const [milestoneStatuses, setMilestoneStatuses] = useState<MilestoneStatus[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Form state for new/edit item
  const [formData, setFormData] = useState<RoadmapFormData>({
    title: "",
    description: "",
    status: "planned",
    priority: 0,
    category: "",
    parentId: undefined,
    asMilestone: false,
    statusId: undefined
  });

  const fetchMilestoneStatuses = async () => {
    try {
      const statuses = await projectsService.getMilestoneStatuses(projectId);
      const formattedStatuses = statuses.map(status => ({
        ...status,
        color: status.color || '#6B7280',
        is_default: status.is_default || false,
        is_system: status.is_system || false
      })) as MilestoneStatus[];
      setMilestoneStatuses(formattedStatuses);
    } catch (error) {
      console.error("Failed to fetch milestone statuses:", error);
    }
  };

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchMilestoneStatuses();
    }
  }, [showAddModal, showEditModal, projectId]);

  // Reset form when opening the add modal
  const handleAddClick = async () => {
    setSelectedCategory("");
    setOpenCategory(false); // Reset category Popover state
    setOpenParent(false); // Reset parent Popover state
    setStartDate(undefined)
    setEndDate(undefined)
    setFormData({
      title: "",
      description: "",
      status: "planned",
      priority: 0,
      category: "",
      parentId: undefined,
      asMilestone: false,
      statusId: undefined
    });
    try {
      const fetchedCategories = await projectsService.getCategories(projectId);
      console.log("Fetched categories:", fetchedCategories);
      // Include any existing item categories as a fallback, filter out undefined
      const allCategories = [
        ...new Set([...(Array.isArray(fetchedCategories) ? fetchedCategories : []).filter((cat): cat is string => cat !== undefined), ...safeItems.map(item => item.category).filter((cat): cat is string => cat !== undefined)]),
      ].sort((a, b) => a.localeCompare(b));
      setCategories(allCategories);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // Fallback to item categories if fetch fails, filter out undefined
      const itemCategories = [...new Set(safeItems.map(item => item.category).filter((cat): cat is string => cat !== undefined))].sort((a, b) => a.localeCompare(b));
      setCategories(itemCategories);
    }
    setShowAddModal(true);
  };

  const handleEditClick = (item: RoadmapItem) => {
    setEditingItem(item);
    
    // First ensure the categories array is properly populated
    let currentCategories = [...categories];
    if (item.category && !currentCategories.includes(item.category)) {
      currentCategories = [...currentCategories, item.category].sort((a, b) => a.localeCompare(b));
      setCategories(currentCategories);
    }
    
    // Now determine if the category is in the known list or custom
    const category = item.category || "";
    const categoryExists = category ? currentCategories.includes(category) : false;
    
    // Set the appropriate state values - using empty string instead of undefined
    setSelectedCategory(categoryExists ? category : "");
    
    // Reset dropdown states
    setOpenCategory(false);
    setOpenParent(false);
    
    // Set date values
    setStartDate(item.startDate ? parseISO(item.startDate) : undefined);
    setEndDate(item.endDate ? parseISO(item.endDate) : undefined);
    
    // Set form data
    setFormData({
      title: item.title,
      description: item.description || "",
      status: item.status,
      startDate: item.startDate,
      endDate: item.endDate,
      priority: item.priority,
      parentId: item.parentId || undefined,
      category: item.category
    });
  
    // Open the modal after a small delay to ensure state is updated
    setTimeout(() => {
      setShowEditModal(true);
    }, 100);
  };

  // Handle category selection from combobox
  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value === selectedCategory ? "" : value)
    setFormData({ ...formData, category: value })
    setOpenCategory(false)
    if (categorySelectRef.current) categorySelectRef.current.focus()
  }

  // Handle parent selection from combobox
// Handle parent selection from combobox
const handleParentSelect = (value: string) => {
    // Check if we're deselecting the currently selected parent
    // Convert to undefined instead of null for TypeScript compatibility
    const newParentId = value === formData.parentId ? undefined : value;
    
    // Update the form data
    setFormData({ ...formData, parentId: newParentId });
    setOpenParent(false);
    
    if (parentSelectRef.current) parentSelectRef.current.focus();
  }

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    setFormData({ 
      ...formData, 
      startDate: date ? format(date, "yyyy-MM-dd") : undefined 
    })
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    setFormData({ 
      ...formData, 
      endDate: date ? format(date, "yyyy-MM-dd") : undefined 
    })
  }

  // Handle delete confirmation
  const handleDeleteClick = (item: RoadmapItem) => {
    setEditingItem(item)
    setShowDeleteConfirm(true)
  }

  // Submit new item
// Already modified in your code, but ensure they're working correctly
const handleAddSubmit = async () => {
  if (!formData.title || !selectedCategory) {
    return;
  }
  setIsSaving(true);
  
  try {
    // Create a properly typed object with the milestone data
    const roadmapData: Partial<RoadmapItem> & { 
      asMilestone?: boolean; 
      statusId?: string; 
    } = {
      ...formData,
      category: selectedCategory,
    };
    
    // Only include statusId if asMilestone is true
    if (formData.asMilestone) {
      roadmapData.asMilestone = true;
      roadmapData.statusId = formData.statusId;
    }
    
    await onItemCreate(roadmapData);
    setShowAddModal(false);
  } catch (error) {
    console.error('Error creating item:', error);
  } finally {
    setIsSaving(false);
  }
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (editingItem && editingItem.id) {
      if (!formData.title || !selectedCategory) {
        return;
      }
      
      // Create a copy of formData for submitting to the API
      const submissionData = {
        ...formData,
        category: selectedCategory,
        // Include statusId when asMilestone is true
        statusId: formData.asMilestone ? formData.statusId : undefined
      };
      
      // Convert undefined to null for the API
      if (submissionData.parentId === undefined) {
        // @ts-ignore - We're intentionally setting null
        submissionData.parentId = null;
      }
      
      setIsSaving(true);
      try {
        await onItemUpdate(editingItem.id, submissionData);
        setShowEditModal(false);
      } catch (error) {
        console.error("Error updating item:", error);
      } finally {
        setIsSaving(false);
      }
    }
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (editingItem && editingItem.id && onItemDelete) {
      setIsDeleting(true); // Disable button and show "Deleting..."
      try {
        await onItemDelete(editingItem.id)
        setShowDeleteConfirm(false)
      } catch (error) {
        console.error("Error deleting item:", error);
      } finally {
        setIsDeleting(false); // Re-enable button and revert text
      }
    }
  }

  // Toggle item expansion
  const toggleItemExpand = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  // Group items by status for status view
  const groupedByStatus = useMemo(() => {
    const grouped: { [key: string]: RoadmapItem[] } = {
      planned: [],
      in_progress: [],
      completed: [],
      delayed: []
    }
    
    items.forEach(item => {
      if (!grouped[item.status]) {
        grouped[item.status] = []
      }
      grouped[item.status].push(item)
    })
    
    // Sort within each group
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        // Sort by start date if available
        if (a.startDate && b.startDate) {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        }
        // Then by priority
        return (b.priority || 0) - (a.priority || 0)
      })
    })
    
    return grouped
  }, [items])

  const EmptyState = ({ message, actionLabel = "Add your first item" }: { 
    message: string; 
    actionLabel?: string 
  }) => (
    <div className="text-center p-8 border border-dashed rounded-md">
      <p className="text-gray-500 mb-4 text-sm">{message}</p>
      <Button
        className="text-xs"
        variant="outline" 
        onClick={handleAddClick}
      >
        <Plus className="h-4 w-4" />
        {actionLabel}
      </Button>
    </div>
  )

  // Group items by category for category view
  const groupedByCategory = useMemo(() => {
    const grouped: { [key: string]: RoadmapItem[] } = {}
    
    items.forEach(item => {
      const category = item.category || "Uncategorized"
      console.log(`Item: ${item.title}, Category: ${category}`); // Debug log
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })
    
    // Sort within each group
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        const statusOrder = { completed: 3, "in_progress": 1, planned: 0, delayed: 2 }
        const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
        if (statusDiff !== 0) return statusDiff
        return (b.priority || 0) - (a.priority || 0)
      })
    })
    
    return grouped
  }, [items])

  // Group items by quarter for timeline view
  const groupedByQuarter = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const quarters = {
      Q1: [] as RoadmapItem[],
      Q2: [] as RoadmapItem[],
      Q3: [] as RoadmapItem[],
      Q4: [] as RoadmapItem[],
    };
  
    safeItems.forEach(item => {
      const startDate = item.startDate ? parseISO(item.startDate) : undefined;
      const endDate = item.endDate ? parseISO(item.endDate) : undefined;
      const dateToUse = startDate || endDate || new Date();
      const itemYear = dateToUse.getFullYear();
      if (itemYear === currentYear) { // Only group items from current year
        const quarter = getQuarter(dateToUse);
        switch (quarter) {
          case 1:
            quarters.Q1.push(item);
            break;
          case 2:
            quarters.Q2.push(item);
            break;
          case 3:
            quarters.Q3.push(item);
            break;
          case 4:
            quarters.Q4.push(item);
            break;
        }
      }
    });
  
    Object.keys(quarters).forEach(quarter => {
      quarters[quarter as keyof typeof quarters].sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        if (aDate !== bDate) return aDate - bDate;
        return (b.priority || 0) - (a.priority || 0);
      });
    });
  
    return { quarters, year: currentYear };
  }, [safeItems]);

// Add this function to your RoadmapView component
const renderListView = () => {
    // Sort items if sorting is active
    let sortedItems = [...safeItems];
    if (sortColumn && sortDirection) {
      sortedItems.sort((a, b) => {
        let aValue = a[sortColumn as keyof RoadmapItem];
        let bValue = b[sortColumn as keyof RoadmapItem];
        
        // Handle special cases for sorting
        if (sortColumn === 'startDate' || sortColumn === 'endDate') {
          aValue = aValue ? new Date(aValue as string).getTime() : 0;
          bValue = bValue ? new Date(bValue as string).getTime() : 0;
        }
        
        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        const result = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? result : -result;
      });
    }

    return (
      <div className="space-y-6">
        {safeItems.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
        {safeItems.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Title
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('title')}
                        className="ml-2 h-8 w-8 p-0"
                      >
                        {sortColumn === 'title' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Status
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('status')}
                        className="ml-2 h-8 w-8 p-0"
                      >
                        {sortColumn === 'status' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Category
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('category')}
                        className="ml-2 h-8 w-8 p-0"
                      >
                        {sortColumn === 'category' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Timeline
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('startDate')}
                        className="ml-2 h-8 w-8 p-0"
                      >
                        {sortColumn === 'startDate' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      Priority
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('priority')}
                        className="ml-2 h-8 w-8 p-0"
                      >
                        {sortColumn === 'priority' ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => handleEditClick(item)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {capitalizeWords(item.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category ? (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(item.startDate || item.endDate) ? (
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {item.startDate && (
                            <span>{format(parseISO(item.startDate), 'MMM d, yyyy')}</span>
                          )}
                          {item.startDate && item.endDate && (
                            <span className="mx-1">—</span>
                          )}
                          {item.endDate && (
                            <span>{format(parseISO(item.endDate), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs">{item.priority || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" className="mr-1" onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(item);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {onItemDelete && (
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(item);
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[50vh] w-full">
            <EmptyState message="No roadmap items exist yet. Create your first item to get started." />
          </div>
        )}
      </div>
    );
  };

  // Render a single item in tree view
  const renderItem = (item: RoadmapItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems[item.id] !== false // default to expanded
    
    return (
      <div key={item.id} className="mb-2">
        <Card className={`border-l-4 ${
          item.status === 'completed' ? 'border-l-green-500' :
          item.status === 'in_progress' ? 'border-l-blue-500' :
          item.status === 'delayed' ? 'border-l-red-500' :
          'border-l-gray-300'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-grow">
                {hasChildren && (
                  <button 
                    onClick={() => toggleItemExpand(item.id)}
                    className="mr-2 mt-1 text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium">{item.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'completed' ? 'bg-green-100 text-green-800' :
                        item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'delayed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {capitalizeWords(item.status)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {onItemDelete && (
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  {(item.startDate || item.endDate) && (
                    <div className="flex items-center text-xs text-gray-500 mt-2">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {item.startDate && (
                        <span>{format(parseISO(item.startDate), 'MMM d, yyyy')}</span>
                      )}
                      {item.startDate && item.endDate && (
                        <span className="mx-1">—</span>
                      )}
                      {item.endDate && (
                        <span>{format(parseISO(item.endDate), 'MMM d, yyyy')}</span>
                      )}
                    </div>
                  )}
                  {item.category && (
                    <div className="mt-1">
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {hasChildren && isExpanded && (
          <div className="ml-6 mt-2 pl-2 border-l border-gray-200">
            {item.children?.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Render a card for individual item
  const renderItemCard = (item: RoadmapItem) => (
    <Card key={item.id} className="p-3">
      <div className="flex justify-between">
        <div>
          <div className="font-medium text-sm">{item.title}</div>
          {item.description && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center mt-2 space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs ${
              item.status === 'completed' ? 'bg-green-100 text-green-800' :
              item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              item.status === 'delayed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {capitalizeWords(item.status)}
            </span>
            {item.category && (
              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                {item.category}
              </span>
            )}
          </div>
          {(item.startDate || item.endDate) && (
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <CalendarDays className="h-3 w-3 mr-1" />
              {item.startDate && (
                <span>{format(parseISO(item.startDate), 'MMM d, yyyy')}</span>
              )}
              {item.startDate && item.endDate && (
                <span className="mx-1">—</span>
              )}
              {item.endDate && (
                <span>{format(parseISO(item.endDate), 'MMM d, yyyy')}</span>
              )}
            </div>
          )}
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            className="min-h-8 min-w-8 p-0"
            onClick={() => handleEditClick(item)}
            >
            <Edit className="h-4 w-4" />
            </Button>
      </div>
    </Card>
  )

  // Modify this function to create smaller timeline cards
const renderTimelineItemCard = (item: RoadmapItem) => (
    <Card key={item.id} className="px-4 py-3">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{item.title}</div>
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-1 my-2">{item.description}</p>
          )}
          <div className="flex items-center my-2 flex-wrap gap-1">
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              item.status === 'completed' ? 'bg-green-100 text-green-800' :
              item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              item.status === 'delayed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {capitalizeWords(item.status)}
            </span>
            {item.category && (
              <span className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                {item.category}
              </span>
            )}
          </div>
          {(item.startDate || item.endDate) && (
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <CalendarDays className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {item.startDate && (
                  <span>{format(parseISO(item.startDate), 'MMM d, yyyy')}</span>
                )}
                {item.startDate && item.endDate && (
                  <span className="mx-1">—</span>
                )}
                {item.endDate && (
                  <span>{format(parseISO(item.endDate), 'MMM d, yyyy')}</span>
                )}
              </span>
            </div>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 ml-1 flex-shrink-0"
          onClick={() => handleEditClick(item)}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  )

  // Render timeline view with Add Item button at the top and grouped by quarters
  const renderTimelineView = () => {
    const { quarters, year } = groupedByQuarter;
    return (
      <div className="space-y-1">
        {safeItems.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
        {safeItems.length > 0 ? (
          <div>
            {Object.entries(quarters).map(([quarter, items]) => (
              <div key={quarter} className="mb-5">
                <h3 className="text-lg font-semibold mb-2">{quarter} {year}</h3>
                {items.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {items.map(item => renderTimelineItemCard(item))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic p-4 border border-dashed rounded-md text-center">
                    No items in {quarter}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[50vh] w-full">
            <EmptyState message="Your project timeline is empty. Add items to visualize your roadmap." />
          </div>
        )}
      </div>
    )
  }

  // Render status view
  const renderStatusView = () => {
    const statuses = [
      { key: 'in_progress', label: 'In Progress' },
      { key: 'planned', label: 'Planned' },
      { key: 'completed', label: 'Completed' },
      { key: 'delayed', label: 'Delayed' }
    ]
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
        {statuses.map(status => (
          <div key={status.key} className="space-y-2">
            <h3 className="font-medium text-sm tracking-wider ml-4 text-gray-500">
              {status.label}
              <span className="ml-2 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-1">
                {groupedByStatus[status.key]?.length || 0}
              </span>
            </h3>
            <div className="space-y-2">
              {groupedByStatus[status.key]?.map(item => renderItemCard(item))}
              {!groupedByStatus[status.key]?.length && (
                <div className="text-sm text-gray-500 italic p-4 border border-dashed rounded-md text-center">
                  No items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Render category view
  const renderCategoryView = () => {
    // Use Object.keys(groupedByCategory) instead of relying solely on categories state
    const availableCategories = Object.keys(groupedByCategory);
    
    if (availableCategories.length === 0) {
      return (
        <div className="text-center p-8 border border-dashed rounded-md">
          <p className="text-gray-500">No categories defined yet</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleAddClick}
          >
            Add an item with a category
          </Button>
        </div>
      )
    }
    
    return (
      <div className="space-y-8 mt-3">
        {availableCategories.map(category => (
          <div key={category} className="space-y-2">
            <h3 className="font-medium text-lg border-b pb-1">
              {category}
              <span className="ml-2 bg-gray-100 text-gray-700 text-xs rounded-full px-2 py-1">
                {groupedByCategory[category]?.length || 0}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedByCategory[category]?.map(item => renderItemCard(item))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Filter potential parent items (excluding the current item being edited)
  const parentItems = useMemo(() => {
    return safeItems.filter(item => item.id !== editingItem?.id);
  }, [safeItems, editingItem]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null (unsorted)
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6 mt-4">
      <div className="min-w-[100vh]">
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>         
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
            <TabsTrigger value="category">By Category</TabsTrigger>
            <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-0">
          {safeItems.length > 0 ? (
            renderListView()
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] w-full">
              <EmptyState message="No roadmap items exist yet. Create your first item to get started." />
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="mt-0">
          {safeItems.length > 0 ? (
            renderTimelineView()
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] w-full">
              <EmptyState message="Your project timeline is empty. Add items to visualize your roadmap." />
            </div>
          )}
        </TabsContent>

        <TabsContent value="status" className="mt-0">
          {safeItems.length > 0 ? (
            renderStatusView()
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] w-full">
              <EmptyState message="Create roadmap items to organize them by status (Planned, In Progress, Completed, Delayed)." />
            </div>
          )}
        </TabsContent>

        <TabsContent value="category" className="mt-0">
          {safeItems.length > 0 ? (
            renderCategoryView()
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] w-full">
              <EmptyState message="Categorize your roadmap items to better organize your project priorities." />
            </div>
          )}
        </TabsContent>

        <TabsContent value="gantt" className="mt-0">
          {safeItems.length > 0 ? (
            <GanttChart items={items} onItemClick={handleEditClick} />
          ) : (
            <div className="flex items-center justify-center min-h-[50vh] w-full">
              <EmptyState message="Add roadmap items with dates to visualize your project timeline in a Gantt chart." />
            </div>
          )}
        </TabsContent>
      </Tabs>
      {safeItems.length === 0 && (
        <div className="flex justify-end">
          <Button onClick={handleAddClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      )}
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Roadmap Item</DialogTitle>
            <DialogDescription>
              Create a new item for your project roadmap
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter item title"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter item description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="start-date" className="text-sm font-medium">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <label htmlFor="end-date" className="text-sm font-medium">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select
                  value={formData.status || "planned"}
                  onValueChange={(value) => setFormData({...formData, status: value as any})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned" className="hover:bg-gray-100">Planned</SelectItem>
                    <SelectItem value="in_progress" className="hover:bg-gray-100">In Progress</SelectItem>
                    <SelectItem value="completed" className="hover:bg-gray-100">Completed</SelectItem>
                    <SelectItem value="delayed" className="hover:bg-gray-100">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="priority" className="text-sm font-medium">
                  Priority (0-10)
                </label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority?.toString() || "0"}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategory}
                    className="w-full justify-between"
                    ref={categorySelectRef}
                  >
                    {selectedCategory
                      ? categories.find((cat) => cat === selectedCategory)
                      : "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            value={category}
                            onSelect={(currentValue) => {
                              handleCategorySelect(currentValue);
                            }}
                          >
                            {category}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedCategory === category ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <label htmlFor="parent" className="text-sm font-medium">
                Parent Item (Optional)
              </label>
              <Popover open={openParent} onOpenChange={setOpenParent}>
                <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openParent}
                    className="w-full justify-between"
                    ref={parentSelectRef}
                    >
                    {formData.parentId && safeItems.find((item) => item.id === formData.parentId)
                        ? safeItems.find((item) => item.id === formData.parentId)?.title
                        : "Select parent..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search parent items..." className="h-9" />
                    <CommandList>
                      {parentItems.length === 0 ? (
                        <CommandEmpty>No options</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {parentItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={(currentValue) => {
                                handleParentSelect(currentValue);
                              }}
                            >
                              {item.title}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  formData.parentId === item.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center space-x-2">
                  <Checkbox
                      checked={formData.asMilestone}
                      onCheckedChange={(checked) => 
                          setFormData({...formData, asMilestone: checked as boolean})}
                  />
                  <Label htmlFor="as-milestone">Create milestone for this item</Label>
              </div>
          </div>
          {formData.asMilestone && (
            <div className="grid gap-2">
              <label htmlFor="milestone-status" className="text-sm font-medium">
                Milestone Status
              </label>
              <Select
                value={formData.statusId || ""}
                onValueChange={(value) => setFormData({...formData, statusId: value})}
              >
                <SelectTrigger id="milestone-status">
                  <SelectValue placeholder="Select milestone status" />
                </SelectTrigger>
                <SelectContent>
                  {milestoneStatuses.map((status) => (
                    <SelectItem 
                      key={status.id} 
                      value={status.id}
                      className="hover:bg-gray-100"
                    >
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSaving || !formData.title}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Item</DialogTitle>
            <DialogDescription>
              Update details for this roadmap item
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="edit-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="edit-title"
                value={formData.title || ""}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={formData.description || ""}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="edit-start-date" className="text-sm font-medium">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-end-date" className="text-sm font-medium">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="edit-status" className="text-sm font-medium">
                  Status
                </label>
                <Select
                  value={formData.status || "planned"}
                  onValueChange={(value) => setFormData({...formData, status: value as any})}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned" className="hover:bg-gray-100">Planned</SelectItem>
                    <SelectItem value="in_progress" className="hover:bg-gray-100">In Progress</SelectItem>
                    <SelectItem value="completed" className="hover:bg-gray-100">Completed</SelectItem>
                    <SelectItem value="delayed" className="hover:bg-gray-100">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-priority" className="text-sm font-medium">
                  Priority (0-10)
                </label>
                <Input
                  id="edit-priority"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.priority?.toString() || "0"}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Popover open={openCategory} onOpenChange={setOpenCategory}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCategory}
                    className="w-full justify-between"
                    ref={categorySelectRef}
                  >
                    {selectedCategory
                      ? categories.find((cat) => cat === selectedCategory)
                      : "Select category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search categories..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            value={category}
                            onSelect={(currentValue) => {
                              handleCategorySelect(currentValue);
                            }}
                          >
                            {category}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedCategory === category ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <label htmlFor="parent" className="text-sm font-medium">
                Parent Item (Optional)
              </label>
              <Popover open={openParent} onOpenChange={setOpenParent}>
                <PopoverTrigger asChild>
                <Button
                variant="outline"
                role="combobox"
                aria-expanded={openParent}
                className="w-full justify-between"
                ref={parentSelectRef}
                >
                {formData.parentId && safeItems.find((item) => item.id === formData.parentId)
                    ? safeItems.find((item) => item.id === formData.parentId)?.title
                    : "Select parent..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search parent items..." className="h-9" />
                    <CommandList>
                      {parentItems.length === 0 ? (
                        <CommandEmpty>No options</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {parentItems.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={(currentValue) => {
                                handleParentSelect(currentValue);
                              }}
                            >
                              {item.title}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  formData.parentId === item.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving || !formData.title}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      {onItemDelete && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{editingItem?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}