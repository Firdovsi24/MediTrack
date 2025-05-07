export type TabType = 'today' | 'schedule' | 'history';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <div className="flex border-b border-gray-300 mb-6">
      <button 
        onClick={() => onTabChange('today')}
        className={`tab-button flex-1 py-4 px-2 text-xl font-semibold border-b-4 ${
          activeTab === 'today' ? 'border-primary' : 'border-transparent text-gray-500'
        }`}
      >
        Today
      </button>
      <button 
        onClick={() => onTabChange('schedule')}
        className={`tab-button flex-1 py-4 px-2 text-xl font-semibold border-b-4 ${
          activeTab === 'schedule' ? 'border-primary' : 'border-transparent text-gray-500'
        }`}
      >
        Schedule
      </button>
      <button 
        onClick={() => onTabChange('history')}
        className={`tab-button flex-1 py-4 px-2 text-xl font-semibold border-b-4 ${
          activeTab === 'history' ? 'border-primary' : 'border-transparent text-gray-500'
        }`}
      >
        History
      </button>
    </div>
  );
};

export default TabNavigation;
