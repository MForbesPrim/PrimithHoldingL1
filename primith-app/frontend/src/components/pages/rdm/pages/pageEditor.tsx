import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import ImageResize from 'tiptap-extension-resize-image';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextAlign from '@tiptap/extension-text-align';
import { useToast } from "@/hooks/use-toast";
import Placeholder from '@tiptap/extension-placeholder';
import { Divider } from './TipTapExtensionsExtra/Divider';
import { InfoPanel } from './TipTapExtensionsExtra/InfoPanel';
import { DateNode } from './TipTapExtensionsExtra/DateNode';
import { Expand } from './TipTapExtensionsExtra/Expand';
import { EditorView } from 'prosemirror-view';
import { Plugin } from 'prosemirror-state';
import { MouseEvent } from 'react';
import { MoreHorizontal, Minus, Info, Calendar, ChevronRight, Plus, Check, ChevronsUpDown, X } from 'lucide-react';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronDown,
  Indent,
  Outdent,
  SeparatorHorizontal,
  Type,
  Highlighter,
  FileDown,
  Search,
  Save,
  CheckSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import { PageNode, TemplateCategory } from "@/types/pages";
import { PageBreak } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/PageBreak';
import { Indent as IndentExtension } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Indent';
import SearchAndReplace from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchAndReplace';
import SearchReplaceMenu from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchReplaceMenu';
import { GapCursorExtension } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/GapCursor'
import { BackColor } from "@/components/pages/rdm/pages/TipTapExtensionsExtra/BackgroundColor";
import { TableCellAttributes } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/TableCellAttributes';
import { PagesService } from '@/services/pagesService';
import { useOrganization } from "@/components/pages/rdm/context/organizationContext";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PageEditorProps {
  page: PageNode;
  onSave: (id: string, content: string) => void;
  onRename: (id: string, newTitle: string) => void;
  /** 
   * If true, the editor calls onSave on every update (auto-save).
   * If false, user must click 'Save' in the toolbar to save changes.
   */
  autoSave?: boolean; 
}

interface TableOptionsProps {
  editor: Editor | null;
}

interface ImageContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  imageId: string;
}

interface TooltipButtonProps {
  title: string;
  onClick?: (event?: React.MouseEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  asDiv?: boolean;
  hideTooltip?: boolean;
}

interface CustomImageOptions {
  inline?: boolean;
  allowBase64?: boolean;
  HTMLAttributes?: Record<string, any>;
}

// Define the extended attributes type
interface CustomImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  'data-id'?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: CustomImageAttributes) => ReturnType;
    };
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setCellAttribute: {
      setCellAttribute: (name: string, value: any) => ReturnType;
    };
  }
}

const TooltipButton: React.FC<TooltipButtonProps> = ({
  title,
  onClick,
  disabled,
  children,
  className = '',
  asDiv = false,
  hideTooltip = false
}) => {
  const baseClass = `relative p-2 rounded transition-colors duration-200 ${
    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 cursor-pointer'
  } ${className}`;

  const handleClick = (event: React.MouseEvent) => {
    if (onClick && !disabled) {
      onClick(event);
    }
  };

  const tooltipClass = !hideTooltip && title
    ? "group-hover:opacity-100 group-hover:visible opacity-0 invisible absolute top-full left-1/2 -translate-x-1/2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg transition-all duration-200 whitespace-nowrap z-50 mt-2"
    : "";

  const content = (
    <>
      {children}
      {!hideTooltip && title && <span className={tooltipClass}>{title}</span>}
    </>
  );

  return asDiv ? (
    <div className={`group ${baseClass}`} onClick={handleClick}>
      {content}
    </div>
  ) : (
    <button className={`group ${baseClass}`} onClick={handleClick} disabled={disabled}>
      {content}
    </button>
  );
};

const TableOptions: React.FC<TableOptionsProps> = ({ editor }) => {
  if (!editor || !editor.isActive('table')) return null;

  const CELL_COLORS = [
    { color: '#ffffff', label: 'White' },
    { color: '#f8f9fa', label: 'Light Gray' },
    { color: '#e2e8f0', label: 'Gray' },
    { color: '#fef3c7', label: 'Yellow' },     // Soft yellow
    { color: '#dcfce7', label: 'Green' },      // Soft green
    { color: '#dbeafe', label: 'Blue' },       // Soft blue
    { color: '#fce7f3', label: 'Pink' },       // Soft pink
    { color: '#fee2e2', label: 'Red' },        // Soft red
    { color: '#f3e8ff', label: 'Purple' },     // Soft purple
    { color: '#ffedd5', label: 'Orange' },     // Soft orange
    { color: '#ecfdf5', label: 'Mint' },       // Soft mint
    { color: '#f1f5f9', label: 'Slate' }       // Soft slate
  ];

  const handleCellColorChange = (color: string) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run();
  };

  return (
    <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
      <ul className="space-y-1">
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M13,2A2,2 0 0,0 11,4V20A2,2 0 0,0 13,22H22V2H13M20,10V14H13V10H20M20,16V20H13V16H20M20,4V8H13V4H20M9,11H6V8H4V11H1V13H4V16H6V13H9V11Z" />
        </svg>
          <span>Column Before</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M11,2A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H2V2H11M4,10V14H11V10H4M4,16V20H11V16H4M4,4V8H11V4H4M15,11H18V8H20V11H23V13H20V16H18V13H15V11Z" />
        </svg>
          <span>Column After</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M4,2H11A2,2 0 0,1 13,4V20A2,2 0 0,1 11,22H4A2,2 0 0,1 2,20V4A2,2 0 0,1 4,2M4,10V14H11V10H4M4,16V20H11V16H4M4,4V8H11V4H4M17.59,12L15,9.41L16.41,8L19,10.59L21.59,8L23,9.41L20.41,12L23,14.59L21.59,16L19,13.41L16.41,16L15,14.59L17.59,12Z" />
        </svg>
          <span>Delete Column</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M22,14A2,2 0 0,0 20,12H4A2,2 0 0,0 2,14V21H4V19H8V21H10V19H14V21H16V19H20V21H22V14M4,14H8V17H4V14M10,14H14V17H10V14M20,14V17H16V14H20M11,10H13V7H16V5H13V2H11V5H8V7H11V10Z" />
        </svg>
          <span>Row Before</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M22,10A2,2 0 0,1 20,12H4A2,2 0 0,1 2,10V3H4V5H8V3H10V5H14V3H16V5H20V3H22V10M4,10H8V7H4V10M10,10H14V7H10V10M20,10V7H16V10H20M11,14H13V17H16V19H13V22H11V19H8V17H11V14Z" />
        </svg>
          <span>Row After</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px"  viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M9.41,13L12,15.59L14.59,13L16,14.41L13.41,17L16,19.59L14.59,21L12,18.41L9.41,21L8,19.59L10.59,17L8,14.41L9.41,13M22,9A2,2 0 0,1 20,11H4A2,2 0 0,1 2,9V6A2,2 0 0,1 4,4H20A2,2 0 0,1 22,6V9M4,9H8V6H4V9M10,9H14V6H10V9M16,9H20V6H16V9Z" />
        </svg>
          <span>Delete Row</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().mergeCells().run()}
        >
          <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#5f6368">
            <path d="M120-120v-240h80v160h160v80H120Zm480 0v-80h160v-160h80v240H600ZM287-327l-57-56 57-57H80v-80h207l-57-57 57-56 153 153-153 153Zm386 0L520-480l153-153 57 56-57 57h207v80H673l57 57-57 56ZM120-600v-240h240v80H200v160h-80Zm640 0v-160H600v-80h240v240h-80Z"/>
          </svg>
          <span>Merge Cells</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().splitCell().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M19 14H21V20H3V14H5V18H19V14M3 4V10H5V6H19V10H21V4H3M11 11V13H8V15L5 12L8 9V11H11M16 11V9L19 12L16 15V13H13V11H16Z" />
        </svg>
          <span>Split Cells</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M15.94 18.5H17.94V14.5H19.94V18.5H21.94L18.94 21.5L15.94 18.5" />
        </svg>
          <span>Header Column</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M19.44 21V19H15.44V17H19.44V15L22.44 18L19.44 21" />
        </svg>
          <span>Header Row</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().toggleHeaderCell().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M4 3H18C19.11 3 20 3.9 20 5V12.08C18.45 11.82 16.92 12.18 15.68 13H12V17H13.08C12.97 17.68 12.97 18.35 13.08 19H4C2.9 19 2 18.11 2 17V5C2 3.9 2.9 3 4 3M4 7V11H10V7H4M12 7V11H18V7H12M4 13V17H10V13H4M17.75 21L15 18L16.16 16.84L17.75 18.43L21.34 14.84L22.5 16.25L17.75 21" />
        </svg>
          <span>Header Cell</span>
        </li>
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
        <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
        <path d="M15.46,15.88L16.88,14.46L19,16.59L21.12,14.46L22.54,15.88L20.41,18L22.54,20.12L21.12,21.54L19,19.41L16.88,21.54L15.46,20.12L17.59,18L15.46,15.88M4,3H18A2,2 0 0,1 20,5V12.08C18.45,11.82 16.92,12.18 15.68,13H12V17H13.08C12.97,17.68 12.97,18.35 13.08,19H4A2,2 0 0,1 2,17V5A2,2 0 0,1 4,3M4,7V11H10V7H4M12,7V11H18V7H12M4,13V17H10V13H4Z" />
        </svg>
          <span>Delete Table</span>
        </li>
        <li className="px-3 py-2">
          <div className="text-sm text-gray-700 mb-2">Cell Background</div>
          <div className="grid grid-cols-4 gap-1">
            {CELL_COLORS.map(({ color, label }) => (
              <button
                key={color}
                onClick={() => handleCellColorChange(color)}
                className="w-6 h-6 rounded border border-gray-200 hover:border-gray-400 transition-all"
                style={{ backgroundColor: color }}
                title={label}
              />
            ))}
          </div>
        </li>
        
        {/* Add clear background option */}
        <li
          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => handleCellColorChange('transparent')}
        >
          <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#5f6368">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z"/>
          </svg>
          <span>Clear Background</span>
        </li>
      </ul>
    </div>
  );
};

const PageEditor = ({
  page,
  onSave,
  onRename,
  autoSave = false, // Default to false if not provided
}: PageEditorProps) => {
  const { toast } = useToast();
  const pagesService = new PagesService();
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkActive, setIsLinkActive] = useState(false);
  const [isRefreshingImages, setIsRefreshingImages] = useState(false);
  const { selectedOrgId } = useOrganization();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [contentWidth, setContentWidth] = useState('auto');
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isDropdownOpen && triggerRef.current) {
      setContentWidth(triggerRef.current ? `${triggerRef.current.offsetWidth}px` : 'auto');
    }
  }, [isDropdownOpen]);

  const [imageContextMenu, setImageContextMenu] = useState<ImageContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    imageId: '',
  });
  const CustomImage = Image.extend<CustomImageOptions>({
    name: 'image',
  
    addOptions() {
      return {
        ...this.parent?.(),
        inline: false,
        allowBase64: false,
        HTMLAttributes: {},
      }
    },
  
    addAttributes() {
      return {
        src: {
          default: null,
          renderHTML: attributes => ({
            src: attributes.src,
          }),
          parseHTML: element => element.getAttribute('src'),
        },
        alt: {
          default: null,
          renderHTML: attributes => ({
            alt: attributes.alt,
          }),
          parseHTML: element => element.getAttribute('alt'),
        },
        title: {
          default: null,
          renderHTML: attributes => ({
            title: attributes.title,
          }),
          parseHTML: element => element.getAttribute('title'),
        },
        'data-id': {
          default: null,
          renderHTML: attributes => ({
            'data-id': attributes['data-id'],
          }),
          parseHTML: element => element.getAttribute('data-id'),
        },
      }
    },
  
    addCommands() {
      return {
        setCustomImage: (options: CustomImageAttributes) => ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
      }
    },
  
    addProseMirrorPlugins() {
      const uploadImage = async (file: File, view: EditorView) => {
        try {
          const result = await pagesService.uploadImage(file, page.id, page.organizationId);
          if (result?.url) {
            const node = view.state.schema.nodes.image.create({
              src: result.url,
              'data-id': result.id,
            });
            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);
          }
        } catch (error) {
          console.error('Error uploading dropped image:', error);
          toast({
            title: 'Error',
            description: 'Failed to upload image',
            variant: 'destructive',
          });
        }
      };
  
      return [
        new Plugin({
          props: {
            handleDrop(view, event) {
              const items = Array.from(event.dataTransfer?.files || []);
              const images = items.filter((item): item is File => 
                item instanceof File && item.type.startsWith('image/')
              );
              
              if (images.length === 0) return false;
              
              event.preventDefault();
              
              images.forEach(image => {
                uploadImage(image, view);
              });
              
              return true;
            }
          }
        })
      ]
    }
  });

  const HIGHLIGHT_COLORS = [
    { color: '#fef08a', label: 'Yellow' },    // Light yellow
    { color: '#fecaca', label: 'Red' },       // Light red
    { color: '#bbf7d0', label: 'Green' },     // Light green
    { color: '#bfdbfe', label: 'Blue' },      // Light blue
    { color: '#ddd6fe', label: 'Purple' },    // Light purple
    { color: '#fed7aa', label: 'Orange' },    // Light orange
  ];

  // 1. Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      CustomImage.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: 'rounded-md max-w-full cursor-pointer',
        },
      }),
      ImageResize,
      Link,
      Underline,
      TextStyle,
      Color.configure({
        types: ['textStyle', 'bold', 'tableCell', 'tableHeader'],
      }),
      Highlight.configure({
        multicolor: true,
      }), 
      PageBreak,
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }), 
      TableCellAttributes.configure({
        types: ['tableCell', 'tableHeader'],
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      BackColor.configure({
        types: ['textStyle', 'tableCell', 'tableRow', 'tableHeader'],
      }),
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      IndentExtension.configure({
        types: ['listItem', 'paragraph'],
        minIndent: 0,
        maxIndent: 8,
      }),
      SearchAndReplace.configure({
        searchResultClass: 'search-highlight',
        disableRegex: true,
      }),
      Divider,
      InfoPanel,
      DateNode,
      Expand,
      GapCursorExtension,
    ],
    content: page.content || '',
    onUpdate: ({ editor }) => {
      // Only save automatically if autoSave is true
      if (autoSave) {
        onSave(page.id, editor.getHTML())
      }
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Prevent multiple empty paragraphs
        if (event.key === 'Enter') {
          const { $anchor } = view.state.selection
          const currentNode = $anchor.parent
          const nextNode = $anchor.nodeAfter
          
          if (currentNode.type.name === 'paragraph' && 
              currentNode.content.size === 0 && 
              nextNode?.type.name === 'paragraph') {
            return true
          }
        }
        return false
      }
    }
  })  

  const MoreElementsMenu = ({ editor }: { editor: Editor }) => {
    if (!editor) return null;
  
    return (
      <div className="absolute top-full right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] z-50">
        <ul className="space-y-1">
          <li
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              editor.chain()
                .focus()
                .insertContent([
                  { type: 'horizontalRule' },
                  { type: 'paragraph', content: [] }
                ])
                .run()
            }}
          >
            <Minus className="w-4 h-4 mr-2" />
            <span>Divider</span>
          </li>
          <li
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              editor.chain().focus().insertContent({
                type: 'infoPanel',
                attrs: { text: 'Add information here' }
              }).run()
            
            }}
          >
            <Info className="w-4 h-4 mr-2" />
            <span>Info Panel</span>
          </li>
          <li
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              editor.chain()
                .focus()
                .insertContent([
                  { type: 'dateNode' },
                  { type: 'paragraph', content: [] }
                ])
                .run()
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            <span>Date</span>
          </li>
          <li
            className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => {
              editor.chain()
                .focus()
                .insertContent([
                  {
                    type: 'expand',
                    attrs: { title: 'Click to expand', isOpen: false },
                    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Expandable content here' }] }]
                  },
                  { type: 'paragraph', content: [] }
                ])
                .run()
            }}
          >
            <ChevronRight className="w-4 h-4 mr-2" />
            <span>Expand</span>
            </li>
            <li
              className="flex items-center px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => {
                editor.chain().focus().toggleTaskList().run()
              }}
            >
              <CheckSquare className="w-4 h-4 mr-2" />
              <span>Task List</span>
            </li>
        </ul>
      </div>
    );
  };

  // 3. Set content again if page changes
  useEffect(() => {
    if (editor && page) {
      editor.commands.setContent(page.content || '');
    }
  }, [page.id, editor]);

  useEffect(() => {
    if (editor && page) {
      const refreshImages = async () => {
        setIsRefreshingImages(true);
        try {
          const { images } = await pagesService.refreshImageTokens(page.id, selectedOrgId);
          if (images) {
            editor.view.state.doc.descendants((node, pos) => {
              if (node.type.name === 'image') {
                const imageId = node.attrs['data-id'];
                const matchingImage = images.find(img => img.id === imageId);
                if (matchingImage) {
                  editor.chain()
                    .setNodeSelection(pos)
                    .updateAttributes('image', { 
                      src: matchingImage.url,
                      'data-id': imageId 
                    })
                    .run();
                }
              }
            });
          }
        } catch (error) {
          console.error('Error refreshing image tokens:', error);
        } finally {
          setIsRefreshingImages(false);
        }
      };
  
      refreshImages();
      const interval = setInterval(refreshImages, 45 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [editor, page.id, selectedOrgId]);

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
  
  const LoadingOverlay = () => (
    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    </div>
  );

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [_isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(page.title);
  const [_isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  useEffect(() => {
    if (editor && page) {
      const refreshImages = async () => {
        try {
          const { images } = await pagesService.refreshImageTokens(page.id, selectedOrgId);
          if (images) {
            editor.view.state.doc.descendants((node, pos) => {
              if (node.type.name === 'image') {
                const imageId = node.attrs['data-id'];
                const matchingImage = images.find(img => img.id === imageId);
                if (matchingImage) {
                  editor.chain()
                    .setNodeSelection(pos)
                    .updateAttributes('image', { 
                      src: matchingImage.url,
                      'data-id': imageId 
                    })
                    .run();
                }
              }
            });
          }
        } catch (error) {
          console.error('Error refreshing image tokens:', error);
        }
      };
  
      refreshImages();
      const interval = setInterval(refreshImages, 45 * 60 * 1000); // Refresh every 45 minutes
      return () => clearInterval(interval);
    }
  }, [editor, page.id, page.organizationId]);

  const handleImageDelete = async (imageId: string) => {
    try {
      await pagesService.deleteImage(imageId, page.organizationId);
      // Remove the image from the editor
      editor?.chain().focus().deleteSelection().run();
      toast({
        title: 'Success',
        description: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    // Store editor instance in ref to avoid re-initialization issues
    editorRef.current = editor;
  
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [isDialogOpen]); // Cleanup when dialog closes
  
  const handleCloseTemplateDialog = () => {
    setIsDialogOpen(false);
  
    // Ensure editor resets when closing the dialog
    if (editorRef.current) {
      editorRef.current.commands.clearContent();
      editorRef.current.commands.setContent('');
      editorRef.current.destroy();
      editorRef.current = null;
    }
  };

  const handleCreateTemplate = useCallback(async () => {
    if (!selectedOrgId) {
      toast({ title: "Error", description: "No organization selected", variant: "destructive" });
      return;
    }
    if (!editor) {
      toast({ title: "Error", description: "Editor not initialized", variant: "destructive" });
      return;
    }
    setIsCreatingTemplate(true);
    console.log('handleCreateTemplate starting:', { templateName, templateCategory, templateDescription });
    if (!selectedCategoryId) {
      toast({ title: "Error", description: "Please select a category", variant: "destructive" });
      return;
    }
    try {
      await pagesService.createTemplate(
        templateName,
        editor.getHTML(),
        templateDescription,
        selectedCategoryId,
        selectedOrgId
      );
      toast({ title: "Success", description: "Template created successfully" });
      handleCloseTemplateDialog();
    } catch (error) {
      console.error('Failed to create template:', error);
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    } finally {
      setIsCreatingTemplate(false);
      console.log('handleCreateTemplate completed');
    }
  }, [templateName, templateCategory, templateDescription, editor, selectedCategoryId, selectedOrgId, pagesService, handleCloseTemplateDialog]);
  
//   const templateDialog = useMemo(() => (
//     <Dialog open={showTemplateDialog} onOpenChange={handleCloseTemplateDialog}>
//       <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Save as Template</DialogTitle>
//             <DialogDescription>
//               Create a reusable template from this page.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="py-4 space-y-4">
//             <div>
//               <label className="block text-sm font-medium mb-1">Template Name</label>
//               <Input 
//                 value={templateName}
//                 onChange={(e) => setTemplateName(e.target.value)}
//                 placeholder="Enter template name"
//                 autoFocus
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1">Category (optional)</label>
//               <Input
//                 value={templateCategory}
//                 onChange={(e) => setTemplateCategory(e.target.value)} 
//                 placeholder="Enter category"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1">Description (optional)</label>
//               <Textarea
//                 value={templateDescription}
//                 onChange={(e) => setTemplateDescription(e.target.value)}
//                 placeholder="Enter template description"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//         <Button variant="outline" onClick={handleCloseTemplateDialog}>
//           Cancel
//         </Button>
//         <Button 
//           onClick={handleCreateTemplate}
//           disabled={!templateName.trim()}
//         >
//           Create Template
//         </Button>
//       </DialogFooter>
//     </DialogContent>
//   </Dialog>
// ), [showTemplateDialog, templateName, templateCategory, templateDescription, handleCloseTemplateDialog, handleCreateTemplate]);
  
  const handleImageContextMenu = (event: MouseEvent<HTMLElement>, imageId: string) => {
    console.log("handleImageContextMenu called");
    event.preventDefault();
    // Set the context menu state with the cursor coordinates and the image id
    setImageContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      imageId,
    });
    setIsContextMenuOpen(true);

    console.log("Updated imageContextMenu state:", {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      imageId,
    });
  };

  const handleTemplateDialogOpenChange = (open: boolean) => {
    setTimeout(() => {
      setShowTemplateDialog(open);
      if (!open) {
        setTemplateName("");
        setTemplateCategory("");
        setTemplateDescription("");
      }
    }, 0);
  };

  const triggerImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files?.length) {
        try {
          const result = await pagesService.uploadImage(input.files[0], page.id, selectedOrgId);
          if (result?.url) {
            // Insert the image node
            editor?.chain().focus().setCustomImage({
              src: result.url,
              'data-id': result.id,
              alt: 'Uploaded image'
            }).run();
  
            // Wait a tick, then update the style attributes
            setTimeout(() => {
              const images = editor?.view.dom.querySelectorAll('img');
              if (images && images.length > 0) {
                const lastImage = images[images.length - 1];
                
                // Remove any unwanted inline styles
                lastImage.removeAttribute('style');
                lastImage.removeAttribute('width');
                lastImage.removeAttribute('height');
                
                // If the image is wrapped in a container, update that too
                const parentDiv = lastImage.closest('div');
                const newStyle = "width: 400px; height: auto; cursor: pointer;";
                lastImage.setAttribute('style', newStyle);
                if (parentDiv) {
                  parentDiv.setAttribute('style', newStyle);
                }
                
                // Update the node in the editor's schema as well
                if (editor) {
                  editor.commands.setMeta('addToHistory', false);
                  editor.commands.updateAttributes('image', { style: newStyle });
                  editor.commands.setMeta('addToHistory', true);
                }
              }
            }, 0);
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          toast({
            title: 'Error',
            description: 'Failed to upload image',
            variant: 'destructive',
          });
        }
      }
    };
    input.click();
  };
  
  const handleGeneratePDF = async () => {
    if (!editor) return;
    try {
      const content = editor.getHTML();
      // Implement PDF generation logic here
      console.log('Generating PDF with content:', content);
      // Add artificial delay to see the loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive'
      });
    }
  };

  const closeAllMenus = () => {
    setOpenMenu(null);
    setIsColorPickerOpen(false);
    setIsSearchMenuOpen(false);
  };

  const toggleTableOptions = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setOpenMenu(openMenu === 'tableOptions' ? null : 'tableOptions');
  };

  if (!editor) {
    return null;
  }

  // Simple component for Heading vs. Paragraph
  const HeadingButton = ({
    title,
    level,
    editor,
  }: {
    title: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    editor: Editor;
  }) => {
    const onClick = () => {
      if (level) {
        editor.chain().focus().toggleHeading({ level }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    };

    const isActive = level
      ? editor.isActive('heading', { level })
      : editor.isActive('paragraph');

    return (
      <TooltipButton
        title={title}
        onClick={onClick}
        className={`w-8 h-8 flex items-center justify-center ${
          isActive ? 'bg-gray-200' : ''
        }`}
      >
        <span className="text-gray-600 text-sm font-medium">
          {level ? `H${level}` : 'P'}
        </span>
      </TooltipButton>
    );
  };

  return (
    <>
      <style>
        {`
          .search-highlight {
            background-color: rgba(255, 255, 0, 0.3);
          }
          .search-highlight-current {
            background-color: rgba(255, 213, 0, 0.7);
          }

           /* Task List Styles */
          ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          ul[data-type="taskList"] li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0;
            margin: 0;
          }

          ul[data-type="taskList"] input[type="checkbox"] {
            margin: 0;
            cursor: pointer;
            position: relative;
            top: 1px;
          }

          ul[data-type="taskList"] div {
            flex: 1;
            margin: 0;
            line-height: 1.4;
            display: flex;
            align-items: center;
          }

          ul[data-type="taskList"] p {
            margin: 0 !important;
            font-size: 14px;
            padding: 0;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .animate-spin {
            animation: spin 1s linear infinite;
          }
          .ProseMirror table {
            border-collapse: collapse;
            margin: 0;
            overflow: hidden;
            table-layout: fixed;
            width: 100%;
          }

          .ProseMirror td,
          .ProseMirror th {
            box-sizing: border-box;
            min-width: 1em;
            padding: 3px 5px;
            position: relative;
            vertical-align: top;
          }

          .ProseMirror th {
            background-color: #f8f9fa;
            font-weight: bold;
            text-align: left;
          }
        `}
      </style>

      <div className="w-[90%] mx-auto mb-5 mt-1 pb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Created by {page.createdBy}
            </div>
            <div className="text-xs text-gray-400">
              Last updated: {new Date(page.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Editor Wrapper */}
        <div className="border border-gray-200 rounded-lg" onClick={closeAllMenus}>
          {/* Toolbar */}
          <div className="p-2.5 border-b border-gray-200 flex flex-wrap items-center gap-1 sticky top-0 bg-white z-10 rounded-t-lg">

            {/* Undo / Redo */}
            <TooltipButton
              title="Undo"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo2 className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Redo"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo2 className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Bold / Italic / Underline / Strike */}
            <TooltipButton
              title="Bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-gray-200' : ''}
            >
              <Bold className="d-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-gray-200' : ''}
            >
              <Italic className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Underline"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'bg-gray-200' : ''}
            >
              <UnderlineIcon className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Strike"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'bg-gray-200' : ''}
            >
              <Strikethrough className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Heading Controls */}
            <HeadingButton title="Heading 1" level={1} editor={editor} />
            <HeadingButton title="Heading 2" level={2} editor={editor} />
            <HeadingButton title="Heading 3" level={3} editor={editor} />
            <HeadingButton title="Paragraph" editor={editor} />

            {/* Text Color */}
            <div className="relative">
              <TooltipButton
                title="Text Color"
                onClick={(event?: React.MouseEvent) => {
                  if (!event) return;
                  event.stopPropagation();
                  // If the color is currently applied, remove it
                  if (editor.isActive('textStyle')) {
                    editor.chain().focus().unsetColor().run();
                    setCurrentColor('#000000'); // Reset to black
                    return;
                  }
                  // Otherwise open color picker
                  if (colorInputRef.current) {
                    colorInputRef.current.click();
                  }
                }}
                className={`relative ${editor.isActive('textStyle') ? 'bg-gray-200' : ''}`}
              >
                <Type className="w-4 h-4" style={{ color: currentColor }} />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={currentColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    setCurrentColor(color);
                    editor.chain().focus().setColor(color).run();
                  }}
                  className="absolute opacity-0 w-0 h-0 overflow-hidden"
                  style={{
                    clip: 'rect(0 0 0 0)',
                    clipPath: 'inset(50%)',
                    position: 'absolute'
                  }}
                />
              </TooltipButton>
            </div>

            {/* Highlight */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <TooltipButton
                    title="Table Options"
                    className={`relative ${editor.isActive('highlight') ? 'bg-gray-200' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      <Highlighter className="w-4 h-4 text-gray-600" />
                      <ChevronDown className="w-3 h-3 text-gray-600" />
                    </div>
                  </TooltipButton>
                </div>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="start" className="p-2">
                <div className="grid grid-cols-3 gap-1">
                  {HIGHLIGHT_COLORS.map(({ color, label }) => (
                    <button
                      key={color}
                      onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                      className={`
                        w-8 h-8 rounded 
                        ${editor.isActive('highlight', { color }) ? 'ring-2 ring-black ring-offset-2' : ''}
                        hover:ring-2 hover:ring-gray-400 hover:ring-offset-2
                        transition-all
                      `}
                      style={{ backgroundColor: color }}
                      title={label}
                    />
                  ))}
                </div>
                
                {editor.isActive('highlight') && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem
                      onClick={() => editor.chain().focus().unsetHighlight().run()}
                      className="justify-center text-xs text-red-600"
                    >
                      Clear Highlight
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Link */}
            <TooltipButton
                title="Link"
                onClick={(event?: React.MouseEvent) => {
                  event?.stopPropagation();
                  // When clicking the link button, open the dialog.
                  if (editor.isActive('link')) {
                    // If already linked, prefill the input and mark it as active.
                    setLinkUrl(editor.getAttributes('link')?.href || '');
                    setIsLinkActive(true);
                  } else {
                    setLinkUrl('');
                    setIsLinkActive(false);
                  }
                  setIsLinkDialogOpen(true);
                }}
                className={editor.isActive('link') ? 'bg-gray-200' : ''}
              >
                <LinkIcon className="w-4 h-4 text-gray-600" />
              </TooltipButton>

            {/* Bullet List / Ordered List */}
            <TooltipButton
              title="Bullet List"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
            >
              <List className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Numbered List"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
            >
              <ListOrdered className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Alignment */}
            <TooltipButton
              title="Align Left"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}
            >
              <AlignLeft className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Align Center"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}
            >
              <AlignCenter className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Align Right"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}
            >
              <AlignRight className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Align Justify"
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}
            >
              <AlignJustify className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Indent */}
            <TooltipButton
              title="Increase Indent"
              onClick={() => editor.chain().focus().indent().run()}
            >
              <Indent className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            <TooltipButton
              title="Decrease Indent"
              onClick={() => editor.chain().focus().outdent().run()}
            >
              <Outdent className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Page Break */}
            <TooltipButton
              title="Page Break"
              onClick={() => editor.chain().focus().setPageBreak().run()}
            >
              <SeparatorHorizontal className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Image Upload */}
            <TooltipButton title="Upload Image" onClick={triggerImageUpload}>
              <ImageIcon className="w-4 h-4 text-gray-600" />
            </TooltipButton>

            {/* Table Options */}
            {editor.isActive('table') ? (
              <div className="relative">
                <TooltipButton
                  title="Table Options"
                  onClick={toggleTableOptions}
                  hideTooltip={openMenu === 'tableOptions'}
                >
                  <div className="flex items-center gap-1">
                    <TableIcon className="w-4 h-4 text-gray-600" />
                    <ChevronDown className="w-3 h-3 text-gray-600" />
                  </div>
                </TooltipButton>
                {openMenu === 'tableOptions' && <TableOptions editor={editor} />}
              </div>
            ) : (
              <TooltipButton
                title="Insert Table"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertContent([
                      {
                        type: 'table',
                        content: [
                          {
                            type: 'tableRow',
                            content: Array(3).fill({
                              type: 'tableHeader',
                              content: [{ type: 'paragraph', content: [] }]
                            })
                          },
                          ...Array(2).fill({
                            type: 'tableRow',
                            content: Array(3).fill({
                              type: 'tableCell',
                              content: [{ type: 'paragraph', content: [] }]
                            })
                          })
                        ]
                      },
                      { type: 'paragraph', content: [] }
                    ])
                    .run()
                }
              >
                <TableIcon className="w-4 h-4 text-gray-600" />
              </TooltipButton>
            )}

            {/* Search & Replace */}
            <div className="relative inline-block">
              <TooltipButton
                title="Search"
                onClick={(event?: React.MouseEvent) => {
                  if (!event) return;
                  event.stopPropagation();
                  setIsSearchMenuOpen(!isSearchMenuOpen);
                }}
                className={isSearchMenuOpen ? 'bg-gray-200' : ''}
              >
                <Search className="w-4 h-4 text-gray-600" />
              </TooltipButton>

              {isSearchMenuOpen && (
                <div
                  className="absolute top-full right-0 mt-2 z-[60]"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <SearchReplaceMenu editor={editor} />
                </div>
              )}
            </div>

            <div className="relative">
              <TooltipButton
                title="More Elements"
                onClick={(event?: React.MouseEvent) => {
                  if (!event) return;
                  event.stopPropagation();
                  setOpenMenu(openMenu === 'moreElements' ? null : 'moreElements');
                }}
                className={openMenu === 'moreElements' ? 'bg-gray-200' : ''}
              >
                <div className="flex items-center gap-1">
                  <Plus className="w-4 h-4 text-gray-600" />
                  <ChevronDown className="w-3 h-3 text-gray-600" />
                </div>
              </TooltipButton>
              {openMenu === 'moreElements' && <MoreElementsMenu editor={editor} />}
            </div>

            {/* Regular Save Button */}
            {!autoSave && (
              <TooltipButton
                title="Save"
                onClick={() => {
                  onSave(page.id, editor.getHTML());
                  toast({
                    title: 'Changes Saved',
                    description: 'Your edits have been saved successfully.',
                    duration: 5000,
                  });
                }}
              >
                <Save className="w-4 h-4 text-gray-600" />
              </TooltipButton>
            )}

            {/* Actions Dropdown */}
            <div className="relative cursor-pointer">
              <DropdownMenu>
                <DropdownMenuTrigger disabled={isGeneratingPDF}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="p-2 hover:bg-gray-100"
                    disabled={isGeneratingPDF}
                  >
                    <div className="flex items-center gap-1">
                      {isGeneratingPDF ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <>
                          <MoreHorizontal className="w-4 h-4 text-gray-600" />
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                  className="cursor-pointer"
                    onClick={async () => {
                      setIsGeneratingPDF(true);
                      try {
                        await handleGeneratePDF();
                      } finally {
                        setIsGeneratingPDF(false);
                      }
                    }}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    <span>Export PDF</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                      className="cursor-pointer" 
                      onClick={() => {
                        setTimeout(() => {
                          setShowTemplateDialog(true);
                          setTemplateName("");
                          setTemplateCategory("");
                          setTemplateDescription("");
                        }, 0);
                      }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      <span>Save as Template</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editor Content */}
          <div className="relative">
          <EditorContent
              editor={editor}
              className="prose prose-strong:text-inherit max-w-none min-h-[700px] overflow-y-auto p-5
                        [&.ProseMirror-focused]:outline-none
                        [&.ProseMirror-focused]:border-none
                        [&.ProseMirror-focused]:shadow-none"
              onContextMenu={(event: React.MouseEvent<HTMLDivElement>) => {
                        const { clientX, clientY } = event;            
                        const pos = editor.view.posAtCoords({ left: clientX, top: clientY });
                        console.log("Contextmenu event, pos:", pos);
                        if (pos) {
                          const node = editor.view.state.doc.nodeAt(pos.pos);
                          console.log("Node at pos:", node);
                          if (node?.type.name === 'image') {
                            const imageId = node.attrs['data-id'];
                            console.log("Image id:", imageId);
                            if (imageId) {
                              event.preventDefault();
                              handleImageContextMenu(event as unknown as React.MouseEvent<HTMLElement>, imageId);
                              return true;
                            }
                          }
                        }
                        return false;
                      }}
                      />
                      {isRefreshingImages && <LoadingOverlay />}
                    </div>

          {imageContextMenu.visible && (
                <ContextMenu
                  onOpenChange={(open) => {
                    console.log("Context menu open:", open);
                    if (!open) {
                      setImageContextMenu({ ...imageContextMenu, visible: false });
                    }
                  }}
                >
                <ContextMenuContent
                  style={{
                    position: 'fixed',
                    left: imageContextMenu.x,
                    top: imageContextMenu.y,
                    zIndex: 1000,
                  }}
                >
                  <ContextMenuItem
                    onClick={() => {
                      handleImageDelete(imageContextMenu.imageId);
                      setImageContextMenu({ ...imageContextMenu, visible: false });
                    }}
                  >
                    Delete Image
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
                )}

          {/* Rename Dialog */}
          <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Page</DialogTitle>
                <DialogDescription>
                  Enter a new name for the page.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter page name"
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRenaming(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (newName.trim()) {
                      onRename(page.id, newName.trim());
                      setIsRenaming(false);
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Link Dialog */}
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isLinkActive ? 'Update Link' : 'Add Link'}</DialogTitle>
                <DialogDescription>
                  {isLinkActive
                    ? 'Update the URL of the link.'
                    : 'Enter the URL you want to link to.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                  Cancel
                </Button>
                {isLinkActive && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setIsLinkDialogOpen(false);
                    }}
                  >
                    Remove Link
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (linkUrl) {
                      // Normalize the URL: if it doesn't start with http:// or https://, prepend https://
                      const normalizedUrl = /^(https?:\/\/)/i.test(linkUrl)
                        ? linkUrl
                        : `https://${linkUrl}`;
                      editor.chain().focus().setLink({ href: normalizedUrl }).run();
                    }
                    setIsLinkDialogOpen(false);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Template Creation Dialog */}
          <Dialog open={showTemplateDialog} onOpenChange={handleTemplateDialogOpenChange}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save as Template</DialogTitle>
                <DialogDescription>Create a reusable template from this page.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Template Name</label>
                  <Input 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    autoFocus
                    disabled={isCreatingTemplate}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                    <DropdownMenuTrigger asChild disabled={isCreatingTemplate}>
                      <Button 
                        ref={triggerRef}
                        variant="outline" 
                        role="combobox" 
                        className="w-full justify-between px-3 py-2"
                      >
                        {selectedCategoryId
                          ? categories.find((cat) => cat.id === selectedCategoryId)?.label || "Select category..."
                          : "Select category..."}
                        <div className="flex items-center gap-1">
                          {selectedCategoryId && (
                            <X 
                              className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCategoryId(null);
                              }}
                              aria-label="Clear category selection"
                            />
                          )}
                          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent style={{ width: contentWidth }} className="min-w-[200px] max-w-[1000px]">
                      <DropdownMenuLabel>Categories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category.id}
                            onSelect={() => setSelectedCategoryId(category.id)}
                            className="justify-between"
                            disabled={isCreatingTemplate}
                          >
                            {category.label}
                            {selectedCategoryId === category.id && <Check className="h-4 w-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (optional)</label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Enter template description"
                    disabled={isCreatingTemplate}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleTemplateDialogOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={!templateName.trim() || !selectedCategoryId || isCreatingTemplate}
                >
                  {isCreatingTemplate ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};

export default PageEditor;
