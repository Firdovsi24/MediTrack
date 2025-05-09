import mediTrackLogo from '../assets/logo.png';
import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/storage';

interface AppHeaderProps {
  onSettingsClick: () => void;
}

const AppHeader = ({ onSettingsClick }: AppHeaderProps) => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showDataConfirmation, setShowDataConfirmation] = useState(false);
  
  // Check if data is persisted on load
  useEffect(() => {
    const checkPersistedData = async () => {
      try {
        // Try to load settings from IndexedDB
        const settings = await getSettings();
        
        // If we've visited before, data is persisted
        if (settings.hasVisitedBefore) {
          setDataLoaded(true);
          // Show a brief confirmation message
          setShowDataConfirmation(true);
          setTimeout(() => setShowDataConfirmation(false), 3000);
        } else {
          // First visit, update the flag for next time
          const { updateSettings } = await import('@/lib/storage');
          await updateSettings({ hasVisitedBefore: true });
        }
      } catch (error) {
        console.error('Error checking persisted data:', error);
      }
    };
    
    checkPersistedData();
  }, []);
  
  return (
    <header className="py-6 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src={mediTrackLogo} 
            alt="MediTrack Logo" 
            className="h-10 w-10 mr-2"
          />
          <h1 className="text-3xl font-bold">MediTrack</h1>
          
          {/* Data persistence confirmation message */}
          {showDataConfirmation && dataLoaded && (
            <div className="ml-3 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-md transition-opacity duration-300 opacity-100">
              Your data is saved locally
            </div>
          )}
        </div>
        <button 
          onClick={onSettingsClick}
          aria-label="Settings" 
          className="p-3 rounded-full hover:bg-gray-200"
        >
          <i className="fas fa-cog text-2xl"></i>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
