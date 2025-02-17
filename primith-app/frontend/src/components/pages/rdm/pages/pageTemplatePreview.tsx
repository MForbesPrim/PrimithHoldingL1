import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PageNode } from '@/types/pages';

interface TemplatePreviewProps {
  template: PageNode;
  onUseTemplate: (template: PageNode) => void;
  onClose: () => void;
}

export default function TemplatePreview({ 
    template, 
    onUseTemplate, 
    onClose 
  }: TemplatePreviewProps) {
    return (
      <div className="fixed right-0 top-0 h-screen border-l bg-white z-50 w-[500px] shadow-lg">
        <div className="p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{template.title}</h2>
              <p className="text-sm text-gray-500 max-w-[80%] mb-4">{template.description}</p>
              <Button onClick={() => onUseTemplate(template)}>
                Use Template
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="h-[calc(100vh-88px)] overflow-y-auto">
          <div className="p-4 prose max-w-none transform scale-75 origin-top">
            <div dangerouslySetInnerHTML={{ __html: template.content }} />
          </div>
        </div>
      </div>
    );  
}