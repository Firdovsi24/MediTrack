import { TabType } from "./TabNavigation";

interface BottomNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onAddClick: () => void;
  onSettingsClick: () => void;
}

const BottomNavigation = ({ 
  activeTab, 
  onTabChange,
  onAddClick,
  onSettingsClick
}: BottomNavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-2 z-30">
      <div className="container mx-auto max-w-md">
        <div className="flex justify-around">
          <button 
            onClick={() => onTabChange('today')}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === 'today' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <i className="fas fa-calendar-day text-2xl"></i>
            <span className="text-sm font-medium mt-1">Today</span>
          </button>
          
          <button 
            onClick={() => onTabChange('schedule')}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === 'schedule' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <i className="fas fa-calendar-alt text-2xl"></i>
            <span className="text-sm font-medium mt-1">Schedule</span>
          </button>
          
          <button 
            onClick={onAddClick}
            className="flex flex-col items-center py-2 px-4 bg-primary text-white rounded-full shadow-lg -mt-4 h-16 w-16 flex justify-center"
          >
            <i className="fas fa-plus text-2xl"></i>
            <span className="text-xs font-medium">Add</span>
          </button>
          
          <button 
            onClick={() => onTabChange('history')}
            className={`flex flex-col items-center py-2 px-4 ${
              activeTab === 'history' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <i className="fas fa-history text-2xl"></i>
            <span className="text-sm font-medium mt-1">History</span>
          </button>
          
          <button 
            onClick={onSettingsClick}
            className="flex flex-col items-center py-2 px-4 text-gray-500"
          >
            <i className="fas fa-cog text-2xl"></i>
            <span className="text-sm font-medium mt-1">Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;
