import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { PageNode } from '@/types/pages';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PagesService } from '@/services/pagesService';
import { Input } from '@/components/ui/input';

interface TemplateProps {
    organizationId: string;
    onCreatePage: (template: PageNode) => void;
    onClose: () => void;
  }

export function Templates({ organizationId, onCreatePage, onClose }: TemplateProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PageNode | null>(null);
  const [templates, setTemplates] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const handleClearSearch = () => {
    setSearchQuery('');
  };
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

  const filterTemplates = (templates: PageNode[]) => {
    return templates.filter(template => 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

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
    <div className="flex h-full"> {/* No scroll here - just container */}
      <div className={`overflow-y-auto transition-all duration-300 ${
        selectedTemplate ? 'w-2/3' : 'w-full'
      }`}>
        {/* First scrollable area - template grid */}
        <div className="p-6">
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

        <div className="relative mb-6 max-w-md">
            <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="pr-10"
            />
            {searchQuery ? (
                <button 
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-500" 
                onClick={handleClearSearch}
                >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
                </button>
            ) : (
                <Search className="absolute top-1/2 right-3 -translate-y-1/2 h-4 w-4 text-gray-400" />
            )}
            </div>

        <Tabs defaultValue="system" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="system">System Templates</TabsTrigger>
                <TabsTrigger value="custom">Custom Templates</TabsTrigger>
              </TabsList>
              
              <TabsContent value="system">
                {systemTemplates.length > 0 ? (
                    <TemplateGrid templates={filterTemplates(systemTemplates)} />
                ) : (
                    <div className="text-gray-500 text-center p-8 border rounded-lg">
                    No system templates available
                    </div>
                )}
                </TabsContent>

                <TabsContent value="custom">
                {customTemplates.length > 0 ? (
                    <TemplateGrid templates={filterTemplates(customTemplates)} />
                ) : (
                    <div className="text-gray-500 text-center p-8 border rounded-lg">
                    <p>No custom templates yet</p>
                    <p className="text-sm mt-2">Click "Create Template" to create your first template</p>
                    </div>
                )}
                </TabsContent>
              </Tabs>
      </div>
    </div>

    {selectedTemplate && (
      <div className="w-1/3 flex flex-col border-l">
        {/* Template preview with fixed header and scrollable content */}
        <div className="py-6 pl-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{selectedTemplate.title}</h2>
              <p className="text-sm text-gray-500 max-w-[80%] mb-4">{selectedTemplate.description}</p>
              <Button onClick={() => onCreatePage(selectedTemplate)}>
                Use Template
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedTemplate(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Second scrollable area - template preview content */}
          <div className="px-0 py-6">
            <div 
              className="prose w-[900px] transform scale-50 origin-top-left px-20 " 
              style={{ transformBox: 'border-box' }}
            >
              <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}