import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageEditor from './pageEditor';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";
import { PagesService } from '@/services/pagesService';
import { useToast } from "@/hooks/use-toast";
import { PageNode } from '@/types/pages';
import AuthService from '@/services/auth';

export function EditTemplate() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { selectedOrgId } = useOrganization();
  const { toast } = useToast();
  const pagesService = useMemo(() => new PagesService(), []); 
  const [template, setTemplate] = useState<PageNode | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const fetchedTemplate = await pagesService.getTemplateById(id!, selectedOrgId);
        setTemplate(fetchedTemplate);
      } catch (error) {
        console.error('Failed to load template:', error);
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
          duration: 5000
        });
        navigate('/rdm/pages/templates');
      }
    };
    if (id && selectedOrgId) fetchTemplate();
  }, [id, selectedOrgId, pagesService, toast, navigate]);

  const handleEditorSave = async (
    templateId: string,
    editorContent: string,
    templateDetails?: { name: string; description: string; categoryId: number | null } // Change title to name
  ) => {
    if (!templateDetails) {
      toast({
        title: "Error",
        description: "Template details are required",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
    const { name, description, categoryId } = templateDetails;
    if (!name.trim() || !categoryId) { // Change title to name
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
        duration: 5000
      });
      return;
    }
  
    const rdmAuth = AuthService.getRdmTokens();
    const currentUserId = rdmAuth?.user.id || 'unknown';
  
    try {
      await pagesService.updateTemplate(
        templateId,
        name, // Change title to name
        editorContent,
        description || '',
        categoryId,
        selectedOrgId
      );
      toast({
        title: "Success",
        description: "Template updated successfully",
        duration: 5000
      });
      setTemplate(prev => prev ? {
        ...prev,
        name, // Change title to name
        content: editorContent,
        description,
        categoryId,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserId
      } : null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
        duration: 5000
      });
    }
  };

  if (!template) return <div>Loading...</div>;

  return (
    <div className="flex-1 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Edit Template</h1>
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
        page={template}
        onSave={handleEditorSave}
        onRename={() => {}}
        templateMode={true}
        editMode={true}
      />
    </div>
  );
}