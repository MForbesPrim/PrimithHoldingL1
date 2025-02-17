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
      <div className="h-full flex flex-col bg-white">
        <div className="p-2 border-b shrink-0">
          <div className="flex justify-between items-start">
            <div className="p-4">
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
        <div className="flex-1 overflow-y-auto">
          <div className="px-0 py-6">
            <div 
              className="prose w-[900px] transform scale-50 origin-top-left px-20" 
              style={{ transformBox: 'border-box' }}
            >
              <div dangerouslySetInnerHTML={{ __html: template.content }} />
            </div>
          </div>
        </div>
      </div>
    );  
}