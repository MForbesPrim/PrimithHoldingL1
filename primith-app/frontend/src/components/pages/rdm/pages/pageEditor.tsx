import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import ImageResize from 'tiptap-extension-resize-image';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
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
  ChevronDown,
  Indent,
  Outdent,
  SeparatorHorizontal,
  Type,
  Highlighter,
  FileDown,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import { PageNode } from "@/types/pages";
import { PageBreak } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/PageBreak';
import { Indent as IndentExtension } from '@/components/pages/rdm/pages/TipTapExtensionsExtra/Indent';
import SearchAndReplace from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchAndReplace';
import SearchReplaceMenu from '@/components/pages/rdm/pages/TipTapExtensionsExtra/SearchReplaceMenu';

interface PageEditorProps {
    page: PageNode;
    onSave: (id: string, content: string) => void;
  }

interface TableOptionsProps {
  editor: Editor | null;
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

  const tooltipClass = !hideTooltip && title ? 
    "group-hover:opacity-100 group-hover:visible opacity-0 invisible absolute top-full left-1/2 -translate-x-1/2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg transition-all duration-200 whitespace-nowrap z-50 mt-2" 
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

  return (
    <div className="absolute top-full left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px] z-50">
      <ul className="space-y-1">
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().addColumnBefore().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Column Before</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().addColumnAfter().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Column After</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().deleteColumn().run()}>
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete Column</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().addRowBefore().run()}>
          <Plus className="w-4 h-4 mr-2" />
          <span>Row Before</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().addRowAfter().run()}>
          <Plus className="w-4 h-4 mr-2" />
          <span>Row After</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().deleteRow().run()}>
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete Row</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().mergeCells().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Merge Cells</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().splitCell().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Split Cells</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Header Column</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Header Row</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().toggleHeaderCell().run()}>
          <TableIcon className="w-4 h-4 mr-2" />
          <span>Header Cell</span>
        </li>
        <li className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
            onClick={() => editor.chain().focus().deleteTable().run()}>
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete Table</span>
        </li>
      </ul>
    </div>
  );
};

const PageEditor = ({ page, onSave }: PageEditorProps) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({
            placeholder: 'Start typing...',
            emptyEditorClass: 'is-editor-empty',
          }),
        Image,
        ImageResize,
        Underline,
        TextStyle,
        Color.configure({
          types: ['textStyle']
        }),
        Highlight,
        PageBreak,
        Table.configure({
          resizable: true,
          allowTableNodeSelection: true,
        }),
        TableRow,
        TableCell,
        TableHeader,
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
      ],
      content: page.content,
      onUpdate: ({ editor }) => {
        onSave(page.id, editor.getHTML());
      },
    });  
  
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [_isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !editor) return;
  
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') {
            editor.chain().focus().setImage({ src: e.target.result }).run();
            
            setTimeout(() => {
              const images = editor.view.dom.querySelectorAll('img');
              if (images && images.length > 0) {
                const lastImage = images[images.length - 1];
                const newStyle = "width: 500px; height: auto; cursor: pointer;";
                lastImage.setAttribute('style', newStyle);
                
                const parentDiv = lastImage.closest('div');
                if (parentDiv) {
                  parentDiv.setAttribute('style', newStyle);
                }
              }
            }, 0);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    };

    const handleGeneratePDF = async () => {
      if (!editor) return;
      setIsGeneratingPDF(true);
      try {
        const content = editor.getHTML();
        // Implement PDF generation logic here
        console.log('Generating PDF with content:', content);
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        setIsGeneratingPDF(false);
      }
    };
  
    const triggerImageUpload = () => {
      fileInputRef.current?.click();
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

    const HeadingButton = ({ 
        title, 
        level, 
        editor 
      }: { 
        title: string, 
        level?: 1 | 2 | 3 | 4 | 5 | 6, // Explicitly type the allowed heading levels
        editor: Editor 
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
            className={`w-8 h-8 flex items-center justify-center ${isActive ? 'bg-gray-200' : ''}`}
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
        `}
        </style>
      <div className="w-[90%] mx-auto my-5 border border-gray-200 rounded-lg" onClick={closeAllMenus}>
        <div className="p-2.5 border-b border-gray-200 flex flex-wrap items-center gap-1 sticky top-0 bg-white z-10 rounded-t-lg">
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
  
          <TooltipButton 
            title="Bold" 
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-200' : ''}
          >
            <Bold className="w-4 h-4 text-gray-600" />
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
            <HeadingButton title="Heading 1" level={1} editor={editor} />
            <HeadingButton title="Heading 2" level={2} editor={editor} />
            <HeadingButton title="Heading 3" level={3} editor={editor} />
            <HeadingButton title="Paragraph" editor={editor} />

        <div className="relative">
        <TooltipButton
            title="Text Color"
            onClick={(event?: React.MouseEvent) => {
            if (!event) return;
            event.stopPropagation();
            
            // If the color is already applied, remove it
            if (editor.isActive('textStyle')) {
                editor.chain().focus().unsetColor().run();
                setCurrentColor('#000000'); // Reset to default black
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

        <TooltipButton
          title="Highlight"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive('highlight') ? 'bg-gray-200' : ''}
        >
          <Highlighter className="w-4 h-4 text-gray-600" />
        </TooltipButton>

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

        <TooltipButton 
          title="Page Break" 
          onClick={() => editor.chain().focus().setPageBreak().run()}
        >
          <SeparatorHorizontal className="w-4 h-4 text-gray-600" />
        </TooltipButton>

        <TooltipButton
          title="Upload Image"
          onClick={triggerImageUpload}
        >
          <ImageIcon className="w-4 h-4 text-gray-600" />
        </TooltipButton>

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
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <TableIcon className="w-4 h-4 text-gray-600" />
          </TooltipButton>
        )}

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

        <div className="ml-auto">
          <button
            onClick={handleGeneratePDF}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <EditorContent 
        editor={editor} 
        className="prose max-w-none min-h-[700px] overflow-y-auto p-5 [&.ProseMirror-focused]:outline-none [&.ProseMirror-focused]:border-none [&.ProseMirror-focused]:shadow-none"
        />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
    </div>
    </>
  );
};

export default PageEditor;

