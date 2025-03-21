import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageEditor from './pageEditor';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
import { PagesService } from '@/services/pagesService';
import { useToast } from "@/hooks/use-toast";
import { PageNode, TemplateCategory } from '@/types/pages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateTemplate() {
    const navigate = useNavigate();
    const { selectedOrgId } = useOrganization();
    const { toast } = useToast();
    const pagesService = new PagesService();
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [templateDetails, setTemplateDetails] = useState({
      name: '', // Change title to name
      description: '',
      categoryId: '',
    });
    const [content, setContent] = useState('');
  
    const templatePage: PageNode = {
      id: 'temp-template',
      parentId: null,
      name: 'New Template',
      content: '',
      type: 'template',
      status: 'active',
      createdBy: '',
      updatedBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: selectedOrgId,
      templateType: 'custom'
    };
  
    useEffect(() => {
      const loadCategories = async () => {
        try {
          const fetchedCategories = await pagesService.getTemplateCategories();
          setCategories(fetchedCategories);
        } catch (error) {
          console.error('Failed to load categories:', error);
          toast({
            title: "Error",
            description: "Failed to load template categories",
            variant: "destructive"
          });
        }
      };
      loadCategories();
    }, []);
  
    const handleEditorSave = async (
      _id: string,
      editorContent: string,
      templateDetailsFromEditor?: { name: string; description: string; categoryId: number | null } // Change title to name
    ) => {
      if (templateDetailsFromEditor) {
        const { name, description, categoryId } = templateDetailsFromEditor;
        if (!name.trim() || !categoryId) { // Change title to name
          toast({
            title: "Error",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
          return;
        }
        try {
          await pagesService.createTemplate(
            name, // Change title to name
            editorContent,
            description,
            categoryId,
            selectedOrgId
          );
          toast({
            title: "Success",
            description: "Template created successfully"
          });
          navigate('/rdm/pages/templates');
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to create template",
            variant: "destructive"
          });
        }
      } else {
        setContent(editorContent);
        setShowSaveDialog(true);
      }
    };
  
    const handleSaveTemplate = async () => {
      if (!templateDetails.name.trim() || !templateDetails.categoryId) { // Change title to name
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }
  
      try {
        await pagesService.createTemplate(
          templateDetails.name, // Change title to name
          content,
          templateDetails.description,
          Number(templateDetails.categoryId),
          selectedOrgId
        );
        toast({
          title: "Success",
          description: "Template created successfully"
        });
        navigate('/rdm/pages/templates');
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create template",
          variant: "destructive"
        });
      }
    };
  
    return (
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Create Template</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/rdm/pages/templates')}
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
        
        <PageEditor
          page={templatePage}
          onSave={handleEditorSave}
          onRename={() => {}}
          templateMode={true}
        />
  
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Template</DialogTitle>
              <DialogDescription>
                Please provide the template details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name *</label>
                <Input
                  value={templateDetails.name} // Change title to name
                  onChange={(e) => setTemplateDetails(prev => ({
                    ...prev,
                    name: e.target.value // Change title to name
                  }))}
                  placeholder="Enter template name"
                />
              </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select
                value={templateDetails.categoryId}
                onValueChange={(value) => setTemplateDetails(prev => ({
                  ...prev,
                  categoryId: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={templateDetails.description}
                onChange={(e) => setTemplateDetails(prev => ({
                  ...prev,
                  description: e.target.value
                }))}
                placeholder="Enter template description"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}