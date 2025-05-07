interface AppHeaderProps {
  onSettingsClick: () => void;
}

const AppHeader = ({ onSettingsClick }: AppHeaderProps) => {
  return (
    <header className="py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">MediRemind</h1>
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
