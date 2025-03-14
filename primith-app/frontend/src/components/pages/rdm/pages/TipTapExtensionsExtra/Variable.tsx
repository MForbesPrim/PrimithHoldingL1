import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useEffect, useState } from 'react'

export interface VariableOptions {
  HTMLAttributes: Record<string, string>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variable: {
      insertVariable: (name: string) => ReturnType;
    }
  }
}

// Simple variable component with minimal styling
const VariableBadgeComponent = ({ node, editor }: { node: any, editor: any }) => {
  const variableName = node.attrs.name;
  const [variableValue, setVariableValue] = useState('');
  
  useEffect(() => {
    const fetchVariableValue = async () => {
      // Try to get variables from the window object first
      const projectVariables = window.PROJECT_VARIABLES || [];
      const variable = projectVariables.find((v: any) => v.key === variableName);
      
      if (variable && variable.value) {
        setVariableValue(variable.value);
      } else {
        // If no window variables or value not found, try to fetch from project
        try {
          // First try to get projectId from the page itself
          const pageProjectId = editor.storage.variable?.pageProjectId;
          
          // Then try other sources
          const projectId = pageProjectId || 
                          editor.storage.variable?.projectId || 
                          document.querySelector('[data-project-id]')?.getAttribute('data-project-id');
          
          if (projectId) {
            const { ProjectService } = await import('@/services/projectService');
            const projectService = new ProjectService();
            const variables = await projectService.getProjectVariables(projectId);
            const foundVariable = variables.find((v: any) => v.key === variableName);
            
            if (foundVariable && foundVariable.value) {
              setVariableValue(foundVariable.value);
              
              // Cache all variables in window object for future use
              window.PROJECT_VARIABLES = variables;
            }
          }
        } catch (error) {
          console.error('Error fetching variable value:', error);
        }
      }
    };
    
    fetchVariableValue();
  }, [variableName, editor]);
  
  // Display just the value in minimal styling
  return (
    <NodeViewWrapper as="span" className="variable-wrapper" style={{ display: 'inline' }}>
      {variableValue ? (
        <span 
          className="bg-blue-50 px-2 py-1 text-xs text-blue-700 font-medium rounded-md ring-1 ring-inset ring-blue-700/10"
          data-variable={variableName}
          contentEditable={false}
        >
          {variableValue}
        </span>
      ) : (
        <span 
          className="bg-blue-50 px-2 py-1 text-xs text-blue-700 rounded-md"
          data-variable={variableName}
          contentEditable={false}
        >
          {`{{${variableName}}}`}
        </span>
      )}
    </NodeViewWrapper>
  )
}

export const Variable = Node.create<VariableOptions>({
  name: 'variable',
  group: 'inline',
  inline: true,
  atom: false,
  selectable: true,
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  
  addStorage() {
    return {
      projectId: null
    }
  },
  
  addAttributes() {
    return {
      name: {
        default: null
      }
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
        getAttrs: (node) => {
          if (typeof node === 'string' || !node.getAttribute) return false
          const name = node.getAttribute('data-variable')
          return name ? { name } : false
        }
      }
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(
        this.options.HTMLAttributes, 
        HTMLAttributes, 
        { 
          'data-variable': HTMLAttributes.name,
          'class': 'variable-node',
        }
      ),
      `{{${HTMLAttributes.name}}}`
    ]
  },
  
  addCommands() {
    return {
      insertVariable: (name) => ({ chain, editor }) => {
        // Store projectId in editor storage if it exists in the window location
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        
        if (projectId) {
          editor.storage.variable.projectId = projectId;
        }
        
        // Try to find projectId from page context if not in URL
        const pageProjectId = document.querySelector('[data-project-id]')?.getAttribute('data-project-id');
        if (!projectId && pageProjectId) {
          editor.storage.variable.projectId = pageProjectId;
        }
        
        // Insert the variable and add a space after it
        return chain()
          .insertContent({ 
            type: this.name,
            attrs: { name }
          })
          .insertContent(' ')
          .run()
      }
    }
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(VariableBadgeComponent)
  },
})