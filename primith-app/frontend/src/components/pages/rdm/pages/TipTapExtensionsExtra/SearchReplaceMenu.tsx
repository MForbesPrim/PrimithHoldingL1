import React, { useState, useCallback } from 'react';
import { 
    Search,
    ArrowLeft,
    ArrowRight, 
    X,
    Replace
  } from 'lucide-react';
import { Editor } from '@tiptap/react';

interface SearchReplaceMenuProps {
  editor: Editor | null;
}

const SearchReplaceMenu: React.FC<SearchReplaceMenuProps> = ({ editor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  const handleSearch = useCallback(() => {
    editor?.commands.setSearchTerm(searchTerm);
    editor?.commands.setCaseSensitive(caseSensitive);
    editor?.commands.resetIndex();
  }, [editor, searchTerm, caseSensitive]);

  const handleReplace = useCallback(() => {
    editor?.commands.setReplaceTerm(replaceTerm);
    editor?.commands.replace();
  }, [editor, replaceTerm]);

  const handleReplaceAll = useCallback(() => {
    editor?.commands.setReplaceTerm(replaceTerm);
    editor?.commands.replaceAll();
  }, [editor, replaceTerm]);

  const handleNextResult = useCallback(() => {
    editor?.commands.nextSearchResult();
  }, [editor]);

  const handlePreviousResult = useCallback(() => {
    editor?.commands.previousSearchResult();
  }, [editor]);

  const handleClearHighlights = useCallback(() => {
    editor?.commands.setSearchTerm('');
    editor?.commands.resetIndex();
    setSearchTerm('');  // Clear search input
    setReplaceTerm(''); // Clear replace input
  }, [editor]);

  const handleCaseSensitiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newCaseSensitive = e.target.checked;
    setCaseSensitive(newCaseSensitive);
    
    if (editor && searchTerm) {
        editor.commands.setSearchTerm(''); // Clear existing search
        editor.commands.resetIndex();
        editor.commands.setCaseSensitive(newCaseSensitive);
        editor.commands.setSearchTerm(searchTerm); // Re-run search with new case sensitivity
    }
}, [editor, searchTerm]);

return (
    <div className="dropdown-menu-x0">
      <ul className="search-replace-menu-list-wrapper p-2 mb-0">
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search"
            className="border border-gray-300 rounded px-2 py-1 w-full focus:border-customBlue focus:ring focus:ring-customBlue focus:ring-opacity-50 outline-none"
          />
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm">
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace"
            className="border border-gray-300 rounded px-2 py-1 w-full focus:border-customBlue focus:ring focus:ring-customBlue focus:ring-opacity-50 outline-none"
          />
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center">
          <label className="flex items-center cursor-pointer w-full">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={handleCaseSensitiveChange}
              className="mr-2 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <span onClick={(e) => e.stopPropagation()}>Case Sensitive</span>
          </label>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm list-none flex items-center cursor-pointer" onClick={handleClearHighlights}>
          <X className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Clear</span>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center cursor-pointer" onClick={handleSearch}>
          <Search className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Search</span>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center cursor-pointer" onClick={handlePreviousResult}>
          <ArrowLeft className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Previous</span>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center cursor-pointer" onClick={handleNextResult}>
          <ArrowRight className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Next</span>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center cursor-pointer" onClick={handleReplace}>
          <Replace className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Replace</span>
        </li>
        <li className="search-replace-menu-item !font-inter !font-400 !text-sm flex items-center cursor-pointer" onClick={handleReplaceAll}>
          <Replace className="w-4 h-4 text-gray-600 mr-2" />
          <span className="search-replace-menu-text">Replace All</span>
        </li>
      </ul>
    </div>
  );
};

export default SearchReplaceMenu;