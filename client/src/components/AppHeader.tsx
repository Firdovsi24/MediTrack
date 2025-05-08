import mediTrackLogo from '@/assets/meditrack-logo.svg';

interface AppHeaderProps {
  onSettingsClick: () => void;
}

const AppHeader = ({ onSettingsClick }: AppHeaderProps) => {
  return (
    <header className="py-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src={mediTrackLogo} 
            alt="MediTrack Logo" 
            className="h-10 w-10 mr-2"
          />
          <h1 className="text-3xl font-bold">MediTrack</h1>
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
