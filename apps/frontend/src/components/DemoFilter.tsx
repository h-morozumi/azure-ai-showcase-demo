import { useState } from 'react';
import type { AzureService } from '../types/demo';

interface DemoFilterProps {
  allTags: AzureService[];
  selectedTags: AzureService[];
  onTagToggle: (tag: AzureService) => void;
  onClearFilters: () => void;
}

/**
 * デモをフィルタリングするコンポーネント
 */
export const DemoFilter: React.FC<DemoFilterProps> = ({
  allTags,
  selectedTags,
  onTagToggle,
  onClearFilters,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          フィルター
        </h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label={isOpen ? 'フィルターを閉じる' : 'フィルターを開く'}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>
      
      {isOpen && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => onTagToggle(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${
                    isSelected
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          
          {selectedTags.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTags.length} 個のフィルターを適用中
              </span>
              <button
                onClick={onClearFilters}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
              >
                すべてクリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
