import { useState, useEffect } from 'react';
import {
  playNotificationSound,
  playConfirmationSound,
  playAlternativeNotificationSound,
  playAlternativeConfirmationSound,
  playOriginalNotificationSound,
  playOriginalConfirmationSound,
  playSound
} from '@/lib/soundUtils';
import { getSettings, updateSettings } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface SoundSettingsScreenProps {
  onBack: () => void;
}

const SoundSettingsScreen = ({ onBack }: SoundSettingsScreenProps) => {
  const [volume, setVolume] = useState(0.8);
  const [notificationSoundKey, setNotificationSoundKey] = useState('notification');
  const [confirmationSoundKey, setConfirmationSoundKey] = useState('confirmation');
  const { toast } = useToast();

  // Load saved settings when component mounts
  useEffect(() => {
    const loadSoundSettings = async () => {
      try {
        const settings = await getSettings();
        if (settings) {
          // Set volume from settings or default to 0.8
          setVolume(settings.volume || 0.8);
          
          // Set notification sound key from settings or default
          if (settings.notificationSoundKey) {
            setNotificationSoundKey(settings.notificationSoundKey);
          }
          
          // Set confirmation sound key from settings or default
          if (settings.confirmationSoundKey) {
            setConfirmationSoundKey(settings.confirmationSoundKey);
          }
        }
      } catch (error) {
        console.error('Error loading sound settings:', error);
      }
    };
    
    loadSoundSettings();
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };
  
  const handleSelectNotificationSound = (soundKey: string) => {
    setNotificationSoundKey(soundKey);
    playSound(soundKey as any, volume);
  };
  
  const handleSelectConfirmationSound = (soundKey: string) => {
    setConfirmationSoundKey(soundKey);
    playSound(soundKey as any, volume);
  };
  
  const handleSaveSettings = async () => {
    try {
      await updateSettings({
        volume,
        notificationSoundKey,
        confirmationSoundKey
      });
      
      toast({
        title: "Sound settings saved",
        description: "Your sound preferences have been updated",
      });
      
      onBack();
    } catch (error) {
      console.error('Error saving sound settings:', error);
      toast({
        title: "Error",
        description: "Could not save sound settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Sound Settings</h2>
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100"
          aria-label="Close settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
            label="Bell Chime" 
            description="A gentle bell reminder sound"
            onClick={() => handleSelectNotificationSound('notification')} 
            primary={notificationSoundKey === 'notification'}
          />
          <SoundButton 
            label="Gentle Reminder" 
            description="A soft, peaceful reminder"
            onClick={() => handleSelectNotificationSound('altNotification')} 
            primary={notificationSoundKey === 'altNotification'}
          />
          <SoundButton 
            label="Original Sound" 
            description="The original notification sound"
            onClick={() => handleSelectNotificationSound('originalNotification')} 
            primary={notificationSoundKey === 'originalNotification'}
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
            label="Achievement Chime" 
            description="A rewarding achievement sound"
            onClick={() => handleSelectConfirmationSound('confirmation')} 
            primary={confirmationSoundKey === 'confirmation'}
          />
          <SoundButton 
            label="Positive Confirmation" 
            description="A gentle positive confirmation"
            onClick={() => handleSelectConfirmationSound('altConfirmation')} 
            primary={confirmationSoundKey === 'altConfirmation'}
          />
          <SoundButton 
            label="Original Sound" 
            description="The original confirmation sound"
            onClick={() => handleSelectConfirmationSound('originalConfirmation')} 
            primary={confirmationSoundKey === 'originalConfirmation'}
          />
        </div>
      </div>

      <div className="mt-8 border-t pt-4">
        <button
          onClick={handleSaveSettings}
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
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={primary ? 'text-primary' : 'text-gray-600'}
      >
        <circle cx="12" cy="12" r="10"></circle>
        <polygon points="10 8 16 12 10 16 10 8"></polygon>
      </svg>
    </div>
    <div className="flex-1">
      <div className={`font-medium ${primary ? 'text-primary' : 'text-gray-800'}`}>{label}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </div>
  </button>
);

export default SoundSettingsScreen;