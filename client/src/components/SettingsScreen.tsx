import { useState, useEffect } from 'react';
import { getSettings, updateSettings, clearAllData, exportData, importData } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface SettingsScreenProps {
  onBack: () => void;
}

const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    pinProtection: false,
    pin: '',
    highContrast: false
  });
  const [showPinForm, setShowPinForm] = useState(false);
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
        highContrast: storedSettings.highContrast || false
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

  const handleExportData = async () => {
    try {
      const data = await exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mediremind_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data exported",
        description: "Your medication data has been exported"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Could not export your data",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        if (!target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const jsonData = JSON.parse(event.target?.result as string);
            await importData(jsonData);
            
            toast({
              title: "Data imported",
              description: "Your medication data has been imported successfully"
            });
          } catch (error) {
            console.error('Error parsing import file:', error);
            toast({
              title: "Import failed",
              description: "The file format is invalid",
              variant: "destructive",
            });
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('Error importing data:', error);
      toast({
        title: "Import failed",
        description: "Could not import your data",
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
            <div className="flex items-center justify-between">
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
          </div>
          
          <div className="border-b border-gray-300 py-4">
            <h3 className="text-xl font-semibold mb-2">Data Management</h3>
            <button 
              onClick={handleExportData}
              className="text-primary font-medium block mb-3"
            >
              Export Data
            </button>
            <button 
              onClick={handleImportData}
              className="text-primary font-medium block mb-3"
            >
              Import Data
            </button>
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
