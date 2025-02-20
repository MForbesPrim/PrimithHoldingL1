import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Search, X, Star, StarOff, Edit, Trash } from 'lucide-react';
import { PageNode } from '@/types/pages';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PagesService } from '@/services/pagesService';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: '',
    content: ''
  });

  const { toast } = useToast();
  const pagesService = new PagesService();

  useEffect(() => {
    if (selectedTemplate && editMode) {
      setEditForm({
        title: selectedTemplate.title,
        description: selectedTemplate.description || '',
        category: selectedTemplate.category || '',
        content: selectedTemplate.content
      });
    }
  }, [selectedTemplate, editMode]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const getUniqueCategories = (templates: PageNode[]): string[] => {
    return Array.from(new Set(
      templates
        .map(t => t.category)
        .filter((category): category is string => 
            category !== undefined && 
            category !== null && 
            category.trim() !== ''
          )
    ));
  };

  const handleEditTemplate = async (template: PageNode) => {
    setSelectedTemplate(template);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTemplate) return;
    
    try {
      await pagesService.updatePage(
        selectedTemplate.id,
        editForm.content,
        organizationId
      );
      
      if (editForm.title !== selectedTemplate.title) {
        await pagesService.renamePage(
          selectedTemplate.id,
          editForm.title,
          organizationId
        );
      }
      
      const updatedTemplates = templates.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, ...editForm } 
          : t
      );
      setTemplates(updatedTemplates);
      
      setEditMode(false);
      toast({
        title: "Success",
        description: "Template updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      try {
        await pagesService.deletePage(templateId, organizationId);
        setTemplates(templates.filter(t => t.id !== templateId));
        toast({
          title: "Success",
          description: "Template deleted successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete template",
          variant: "destructive"
        });
      }
    }
  };

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
    return templates.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.category?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFavorites = !filterFavorites || template.isFavorite;
      const matchesCategories = selectedCategories.length === 0 || 
        (template.category && selectedCategories.includes(template.category));
      return matchesSearch && matchesFavorites && matchesCategories;
    });
  };

  const handleToggleFavorite = async (template: PageNode, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isFavorite = await pagesService.toggleFavoriteTemplate(template.id);
      setTemplates(prev => prev.map(t => 
        t.id === template.id ? {...t, isFavorite} : t
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
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
          className="p-6 border rounded-lg hover:border-primary transition-colors relative group"
          onClick={() => setSelectedTemplate(template)}
        >
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            {!template.isSystem && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTemplate(template);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(template.id);
                  }}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => handleToggleFavorite(template, e)}
            >
              {template.isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
          </div>
          <h3 className="text-base cursor-pointer font-bold">{template.title}</h3>
          
          <div className={`flex justify-between items-end ${template.category ? 'mt-3' : 'mt-8'}`}>
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
      <div className={`overflow-y-auto transition-all duration-300 ${
        selectedTemplate ? 'w-2/3' : 'w-full'
      }`}>
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

          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filterFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterFavorites(!filterFavorites)}
              className="rounded-full"
            >
              <Star className="h-4 w-4 mr-2" />
              My Templates
            </Button>
            {getUniqueCategories(templates).map((category) => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategories(prev => 
                    prev.includes(category)
                      ? prev.filter(c => c !== category)
                      : [...prev, category]
                  );
                }}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="text-sm text-gray-500 mb-4">
            {searchQuery || selectedCategories.length > 0 || filterFavorites ? (
              <p>
                Displaying <span className="font-bold">
                  {filterTemplates(templates).length}
                </span> of <span className="font-bold">
                  {templates.length}
                </span> templates
              </p>
            ) : (
              <p>
                Displaying all <span className="font-bold">{templates.length}</span> templates
              </p>
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
          {editMode ? (
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-lg font-semibold">Edit Template</h2>
                <Button variant="ghost" size="icon" onClick={() => setEditMode(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      title: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      category: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <Textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm(prev => ({
                      ...prev,
                      content: e.target.value
                    }))}
                    className="min-h-[200px]"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                <div className="px-0 py-6">
                  <div 
                    className="prose w-[900px] transform scale-50 origin-top-left px-20 " 
                    style={{ transformBox: 'border-box' }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: selectedTemplate.content }} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}