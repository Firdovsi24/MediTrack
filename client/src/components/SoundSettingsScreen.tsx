import { useState } from 'react';
import {
  playNotificationSound,
  playConfirmationSound,
  playAlternativeNotificationSound,
  playAlternativeConfirmationSound,
  playOriginalNotificationSound,
  playOriginalConfirmationSound
} from '@/lib/soundUtils';

interface SoundSettingsScreenProps {
  onBack: () => void;
}

const SoundSettingsScreen = ({ onBack }: SoundSettingsScreenProps) => {
  const [volume, setVolume] = useState(0.8);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sound Settings</h2>
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Close settings"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-lg font-medium mb-2">Volume: {Math.round(volume * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Medication Reminder Sounds</h3>
        <p className="text-gray-600 mb-4">
          Choose a sound that will play when it's time to take your medication. 
          The sound should be noticeable but not alarming.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SoundButton 
            label="Bell Chime (Current)" 
            description="A gentle bell reminder sound"
            onClick={() => playNotificationSound(volume)} 
            primary
          />
          <SoundButton 
            label="Gentle Reminder" 
            description="A soft, peaceful reminder"
            onClick={() => playAlternativeNotificationSound(volume)} 
          />
          <SoundButton 
            label="Original Sound" 
            description="The original notification sound"
            onClick={() => playOriginalNotificationSound(volume)} 
          />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-4">Medication Confirmation Sounds</h3>
        <p className="text-gray-600 mb-4">
          Choose a sound that will play when you confirm taking your medication.
          This sound should feel rewarding and positive.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SoundButton 
            label="Achievement Chime (Current)" 
            description="A rewarding achievement sound"
            onClick={() => playConfirmationSound(volume)} 
            primary
          />
          <SoundButton 
            label="Positive Confirmation" 
            description="A gentle positive confirmation"
            onClick={() => playAlternativeConfirmationSound(volume)} 
          />
          <SoundButton 
            label="Original Sound" 
            description="The original confirmation sound"
            onClick={() => playOriginalConfirmationSound(volume)} 
          />
        </div>
      </div>

      <div className="mt-8 border-t pt-4">
        <button
          onClick={onBack}
          className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition"
        >
          Save & Close
        </button>
      </div>
    </div>
  );
};

interface SoundButtonProps {
  label: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

const SoundButton = ({ label, description, onClick, primary = false }: SoundButtonProps) => (
  <button
    onClick={onClick}
    className={`flex items-center text-left p-4 rounded-lg border ${
      primary ? 'bg-blue-50 border-primary' : 'bg-gray-50 border-gray-200'
    } hover:shadow-md transition`}
  >
    <div className="mr-3">
      <i className={`fas fa-play-circle text-2xl ${primary ? 'text-primary' : 'text-gray-600'}`}></i>
    </div>
    <div className="flex-1">
      <div className={`font-medium ${primary ? 'text-primary' : 'text-gray-800'}`}>{label}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  </button>
);

export default SoundSettingsScreen;