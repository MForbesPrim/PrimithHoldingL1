import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { PageNode } from '@/types/pages';
import TemplatePreview from './pageTemplatePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PagesService } from '@/services/pagesService';

interface TemplateProps {
    organizationId: string;
    onCreatePage: (template: PageNode) => void;
    onClose: () => void;
  }

export function Templates({ organizationId, onCreatePage, onClose }: TemplateProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PageNode | null>(null);
  const [templates, setTemplates] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const pagesService = new PagesService();

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        console.log('Loading templates for organizationId:', organizationId);
        setLoading(true);
        const fetchedTemplates = await pagesService.getTemplates(organizationId);
        console.log('Fetched templates:', fetchedTemplates);
        setTemplates(fetchedTemplates || []);
      } catch (error) {
        console.error('Failed to load templates:', error);
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    };
  
    if (organizationId) {
      loadTemplates();
    }
  }, [organizationId]);

  const systemTemplates = templates.filter(t => t.status === 'system_template');
  const customTemplates = templates.filter(t => t.status === 'template');

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading templates...</div>;
  }

  const TemplateGrid = ({ templates }: { templates: PageNode[] }) => (
    <div className="grid grid-cols-3 gap-4">
      {templates.map(template => (
        <div
          key={template.id}
          className="p-4 border rounded-lg hover:border-primary transition-colors relative group"
          onClick={() => setSelectedTemplate(template)}
        >
          <h3 className="font-medium text-base cursor-pointer">{template.title}</h3>
          
          <div className="flex justify-between items-end mt-4">
            {template.category && (
              <p className="text-sm text-gray-500 max-w-[60%]">
                {template.category}
              </p>
            )}
            
            <Button 
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-4 right-4"
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage(template);
              }}
            >
              Use
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex h-full">
      <div className={`p-6 transition-all ${selectedTemplate ? 'w-2/3' : 'w-full'}`}>
      <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Templates</h1>
          </div>
          <Button onClick={() => {/* TODO: Implement create template */}}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="system">System Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="system">
            {systemTemplates.length > 0 ? (
              <TemplateGrid templates={systemTemplates} />
            ) : (
              <div className="text-gray-500 text-center p-8 border rounded-lg">
                No system templates available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="custom">
            {customTemplates.length > 0 ? (
              <TemplateGrid templates={customTemplates} />
            ) : (
              <div className="text-gray-500 text-center p-8 border rounded-lg">
                <p>No custom templates yet</p>
                <p className="text-sm mt-2">Click "Create Template" to create your first template</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedTemplate && (
        <div className="w-1/3">
          <TemplatePreview 
            template={selectedTemplate}
            onUseTemplate={onCreatePage}
            onClose={() => setSelectedTemplate(null)}
          />
        </div>
      )}
    </div>
  );
}