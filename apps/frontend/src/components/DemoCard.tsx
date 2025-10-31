import type { Demo } from '../types/demo';

interface DemoCardProps {
  demo: Demo;
}

/**
 * デモのタイルカードコンポーネント
 */
export const DemoCard: React.FC<DemoCardProps> = ({ demo }) => {
  return (
    <a
      href={demo.path}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      aria-label={`${demo.title} の詳細へ移動`}
    >
      <div className="relative h-48 w-full">
        <img
          src={demo.image}
          alt={demo.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {demo.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {demo.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {demo.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};
