import { useState, useEffect } from 'react';
import { getSettings, updateSettings, clearAllData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import SoundSettingsScreen from './SoundSettingsScreen';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    pinProtection: false,
    pin: '',
    highContrast: false,
    userName: '',
    caregiverEmail: '',
    notifyCaregiverEnabled: false
  });
  const [showPinForm, setShowPinForm] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const { toast } = useToast();
  const { setHighContrast } = useAppContext();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await getSettings();
      setSettings({
        notificationsEnabled: storedSettings.notificationsEnabled || true,
        pinProtection: storedSettings.pinProtection || false,
        pin: storedSettings.pin || '',
        highContrast: storedSettings.highContrast || false,
        userName: storedSettings.userName || '',
        caregiverEmail: storedSettings.caregiverEmail || '',
        notifyCaregiverEnabled: storedSettings.notifyCaregiverEnabled || false
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Could not load settings",
        variant: "destructive",
      });
    }
  };

  const handleToggleNotifications = async () => {
    try {
      const newValue = !settings.notificationsEnabled;
      await updateSettings({ notificationsEnabled: newValue });
      setSettings({...settings, notificationsEnabled: newValue});
      
      toast({
        title: newValue ? "Notifications enabled" : "Notifications disabled",
        description: newValue 
          ? "You will receive medication reminders" 
          : "You will not receive medication reminders",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Could not update notification settings",
        variant: "destructive",
      });
    }
  };

  const handleTogglePinProtection = async () => {
    try {
      const newValue = !settings.pinProtection;
      
      if (newValue) {
        // When enabling PIN, show the form to set a PIN
        setShowPinForm(true);
      } else {
        // When disabling PIN, clear the PIN
        await updateSettings({ pinProtection: false, pin: '' });
        setSettings({...settings, pinProtection: false, pin: ''});
        toast({
          title: "PIN protection disabled",
          description: "Your app will no longer require a PIN to access"
        });
      }
    } catch (error) {
      console.error('Error updating PIN settings:', error);
      toast({
        title: "Error",
        description: "Could not update PIN settings",
        variant: "destructive",
      });
    }
  };

  const handleToggleHighContrast = async () => {
    try {
      const newValue = !settings.highContrast;
      await updateSettings({ highContrast: newValue });
      setSettings({...settings, highContrast: newValue});
      setHighContrast(newValue);
      
      toast({
        title: newValue ? "High contrast mode enabled" : "High contrast mode disabled",
        description: "Visual display settings updated"
      });
    } catch (error) {
      console.error('Error updating high contrast settings:', error);
      toast({
        title: "Error",
        description: "Could not update display settings",
        variant: "destructive",
      });
    }
  };

  const handleSetPin = async () => {
    // Validate PIN
    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinError('PIN must be 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    try {
      await updateSettings({ pinProtection: true, pin: newPin });
      setSettings({...settings, pinProtection: true, pin: newPin});
      setShowPinForm(false);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
      
      toast({
        title: "PIN protection enabled",
        description: "Your app is now protected with a PIN"
      });
    } catch (error) {
      console.error('Error setting PIN:', error);
      toast({
        title: "Error",
        description: "Could not set PIN",
        variant: "destructive",
      });
    }
  };



  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all your medication data? This cannot be undone.')) {
      try {
        await clearAllData();
        toast({
          title: "Data cleared",
          description: "All your medication data has been removed"
        });
      } catch (error) {
        console.error('Error clearing data:', error);
        toast({
          title: "Error",
          description: "Could not clear your data",
          variant: "destructive",
        });
      }
    }
  };

  const handleShowIntro = async () => {
    try {
      await updateSettings({ hasVisitedBefore: false });
      
      toast({
        title: "Intro guide enabled",
        description: "Please restart the app to see the intro guide"
      });
      
      // Optionally reload the app to show intro
      // window.location.reload();
    } catch (error) {
      console.error('Error showing intro:', error);
      toast({
        title: "Error",
        description: "Could not reset intro guide",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-40">
      <div className="container mx-auto px-4 py-6 max-w-md h-full flex flex-col">
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="p-2 mr-2">
            <i className="fas fa-arrow-left text-2xl"></i>
          </button>
          <h2 className="text-2xl font-bold">Settings</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Notifications</h3>
            <div className="flex items-center justify-between">
              <span className="text-lg">Enable Reminders</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox" 
                  id="notifications-toggle" 
                  className="absolute w-6 h-6 transition duration-200 ease-in-out bg-white border-4 border-gray-300 rounded-full appearance-none cursor-pointer peer checked:border-primary checked:bg-white checked:right-0 focus:outline-none focus:ring-4 focus:ring-primary-light"
                  checked={settings.notificationsEnabled}
                  onChange={handleToggleNotifications}
                />
                <label 
                  htmlFor="notifications-toggle" 
                  className="block h-full overflow-hidden rounded-full bg-gray-300 cursor-pointer peer-checked:bg-primary"
                ></label>
              </div>
            </div>
          </div>
          
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Security</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg">PIN Protection</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox" 
                  id="pin-toggle" 
                  className="absolute w-6 h-6 transition duration-200 ease-in-out bg-white border-4 border-gray-300 rounded-full appearance-none cursor-pointer peer checked:border-primary checked:bg-white checked:right-0 focus:outline-none focus:ring-4 focus:ring-primary-light"
                  checked={settings.pinProtection}
                  onChange={handleTogglePinProtection}
                />
                <label 
                  htmlFor="pin-toggle" 
                  className="block h-full overflow-hidden rounded-full bg-gray-300 cursor-pointer peer-checked:bg-primary"
                ></label>
              </div>
            </div>
            {showPinForm && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium mb-2">Set a 4-digit PIN</h4>
                <div className="mb-3">
                  <label className="block text-sm mb-1">New PIN</label>
                  <input 
                    type="password" 
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d*"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-sm mb-1">Confirm PIN</label>
                  <input 
                    type="password" 
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={4}
                    inputMode="numeric"
                    pattern="\d*"
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                {pinError && (
                  <p className="text-destructive text-sm mb-2">{pinError}</p>
                )}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      setShowPinForm(false);
                      setNewPin('');
                      setConfirmPin('');
                      setPinError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSetPin}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                  >
                    Set PIN
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Accessibility</h3>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg">High Contrast Mode</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox" 
                  id="contrast-toggle" 
                  className="absolute w-6 h-6 transition duration-200 ease-in-out bg-white border-4 border-gray-300 rounded-full appearance-none cursor-pointer peer checked:border-primary checked:bg-white checked:right-0 focus:outline-none focus:ring-4 focus:ring-primary-light"
                  checked={settings.highContrast}
                  onChange={handleToggleHighContrast}
                />
                <label 
                  htmlFor="contrast-toggle" 
                  className="block h-full overflow-hidden rounded-full bg-gray-300 cursor-pointer peer-checked:bg-primary"
                ></label>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={() => setShowSoundSettings(true)}
                className="flex items-center text-primary font-medium"
              >
                <i className="fas fa-volume-up mr-2"></i>
                Medication Reminder Sounds
              </button>
              <p className="text-sm text-gray-600 mt-1 ml-6">
                Choose and test different sounds for medication reminders
              </p>
            </div>
          </div>
          
          {showSoundSettings && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <SoundSettingsScreen onBack={() => setShowSoundSettings(false)} />
            </div>
          )}
          
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Caregiver Notifications</h3>
            <div className="mb-4">
              <label htmlFor="userName" className="block text-sm mb-1">Your Name</label>
              <input 
                type="text" 
                id="userName"
                value={settings.userName}
                onChange={(e) => setSettings({...settings, userName: e.target.value})}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 mb-3"
                placeholder="Enter your name"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="caregiverEmail" className="block text-sm mb-1">Caregiver's Email</label>
              <input 
                type="email" 
                id="caregiverEmail"
                value={settings.caregiverEmail}
                onChange={(e) => setSettings({...settings, caregiverEmail: e.target.value})}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 mb-3"
                placeholder="Enter caregiver's email"
              />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg">Notify caregiver about medications</span>
              <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
                <input 
                  type="checkbox" 
                  id="caregiver-toggle" 
                  className="absolute w-6 h-6 transition duration-200 ease-in-out bg-white border-4 border-gray-300 rounded-full appearance-none cursor-pointer peer checked:border-primary checked:bg-white checked:right-0 focus:outline-none focus:ring-4 focus:ring-primary-light"
                  checked={settings.notifyCaregiverEnabled}
                  onChange={async () => {
                    const newValue = !settings.notifyCaregiverEnabled;
                    await updateSettings({ 
                      notifyCaregiverEnabled: newValue,
                      userName: settings.userName,
                      caregiverEmail: settings.caregiverEmail
                    });
                    setSettings({...settings, notifyCaregiverEnabled: newValue});
                    
                    toast({
                      title: newValue ? "Caregiver notifications enabled" : "Caregiver notifications disabled",
                      description: newValue 
                        ? "Your caregiver will be notified when you take or snooze medications" 
                        : "Your caregiver will not receive notifications",
                    });
                  }}
                />
                <label 
                  htmlFor="caregiver-toggle" 
                  className="block h-full overflow-hidden rounded-full bg-gray-300 cursor-pointer peer-checked:bg-primary"
                ></label>
              </div>
            </div>
            <button 
              onClick={async () => {
                // Save user name and caregiver email
                await updateSettings({
                  userName: settings.userName,
                  caregiverEmail: settings.caregiverEmail
                });
                toast({
                  title: "Caregiver info saved",
                  description: "Your name and caregiver email have been saved"
                });
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              Save Caregiver Info
            </button>
          </div>
          
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Data Management</h3>
            <button 
              onClick={handleClearData}
              className="text-destructive font-medium"
            >
              Clear All Data
            </button>
          </div>
          
          <div className="py-4">
            <h3 className="text-xl font-semibold mb-2">About</h3>
            <p className="text-gray-600">MediTrack v1.0</p>
            <p className="text-gray-600 mb-3">All data is stored locally on your device</p>
            <button 
              onClick={handleShowIntro}
              className="text-primary font-medium"
            >
              Show Intro Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
