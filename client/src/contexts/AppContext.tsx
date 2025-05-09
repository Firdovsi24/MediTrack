import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAllMedications, getDosesForDay, getMedication, updateDose, getSettings, getDose } from '@/lib/storage';
import { checkNotificationSupport, requestNotificationPermission, scheduleNotifications } from '@/lib/notifications';
import { notifyCaregiverAutomatically } from '@/lib/emailService';

interface AppContextType {
  isHighContrast: boolean;
  setHighContrast: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  requestPermissions: () => Promise<void>;
  hasNotificationPermission: boolean;
  medications: any[];
  doses: any[];
  refreshData: () => Promise<void>;
  takeDose: (doseId: string) => Promise<void>;
  snoozeDose: (doseId: string) => Promise<void>;
  notifyCaregiverEnabled: boolean;
  caregiverEmail: string;
  userName: string;
}

const AppContext = createContext<AppContextType>({
  isHighContrast: false,
  setHighContrast: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  requestPermissions: async () => {},
  hasNotificationPermission: false,
  medications: [],
  doses: [],
  refreshData: async () => {},
  takeDose: async () => {},
  snoozeDose: async () => {},
  notifyCaregiverEnabled: false,
  caregiverEmail: '',
  userName: '',
});

export const useAppContext = () => useContext(AppContext);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [medications, setMedications] = useState<any[]>([]);
  const [doses, setDoses] = useState<any[]>([]);
  const [notifyCaregiverEnabled, setNotifyCaregiverEnabled] = useState(false);
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadSettings();
    refreshData();
    checkPermissions();
    
    // Refresh data every minute
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Apply high contrast mode to body
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  const loadSettings = async () => {
    try {
      const settings = await getSettings();
      setIsHighContrast(settings.highContrast || false);
      setNotificationsEnabled(settings.notificationsEnabled !== false);
      setNotifyCaregiverEnabled(settings.notifyCaregiverEnabled || false);
      setCaregiverEmail(settings.caregiverEmail || '');
      setUserName(settings.userName || '');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkPermissions = async () => {
    const { supported, permissionGranted } = checkNotificationSupport();
    setHasNotificationPermission(supported && permissionGranted);
  };

  const requestPermissions = async () => {
    const granted = await requestNotificationPermission();
    setHasNotificationPermission(granted);
  };

  const refreshData = async () => {
    try {
      // Load medications
      const allMedications = await getAllMedications();
      setMedications(allMedications);
      
      // Load today's doses
      const today = new Date();
      const todayDoses = await getDosesForDay(today);
      
      // Fetch medication details for each dose
      const dosesWithMedicationInfo = await Promise.all(
        todayDoses.map(async (dose) => {
          const medication = await getMedication(dose.medicationId);
          return {
            ...dose,
            medication,
          };
        })
      );
      
      setDoses(dosesWithMedicationInfo);
      
      // Schedule notifications for pending doses if notifications are enabled
      if (notificationsEnabled && hasNotificationPermission) {
        const upcomingDoses = dosesWithMedicationInfo
          .filter(dose => dose.status === 'pending')
          .map(dose => ({
            id: dose.id,
            medicationId: dose.medicationId,
            medicationName: dose.medication?.name || 'Medication',
            dosage: dose.medication?.dosage || '',
            instructions: dose.medication?.instructions,
            scheduledTime: dose.scheduledTime
          }));
        
        await scheduleNotifications(upcomingDoses);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const takeDose = async (doseId: string) => {
    try {
      const dose = doses.find(d => d.id === doseId);
      if (!dose) return;
      
      const currentTime = new Date();
      
      // Play a gentle piano confirmation sound 
      try {
        // Use a preloaded audio object to ensure it plays immediately
        const audio = new Audio();
        audio.src = '/sounds/piano-confirmation.mp3'; // Gentle piano confirmation sound
        audio.volume = 0.8; // Slightly higher volume for better audibility for seniors
        audio.loop = false;
        
        // Force the audio to load before playing
        audio.load();
        
        // Play directly
        audio.play()
          .then(() => console.log('Confirmation sound played successfully'))
          .catch(error => {
            console.warn('Could not play confirmation sound:', error);
          });
      } catch (error) {
        console.warn('Could not create audio element:', error);
      }
      
      await updateDose(doseId, {
        status: 'taken',
        actualTime: currentTime
      });
      
      // Send automatic notification to caregiver if enabled
      if (notifyCaregiverEnabled && caregiverEmail && userName) {
        const medication = dose.medication || await getMedication(dose.medicationId);
        if (medication) {
          notifyCaregiverAutomatically(
            caregiverEmail, 
            userName, 
            'taken', 
            {
              name: medication.name,
              dosage: medication.dosage,
              time: currentTime
            }
          );
        }
      }
      
      await refreshData();
    } catch (error) {
      console.error('Error taking dose:', error);
      throw error;
    }
  };

  const snoozeDose = async (doseId: string) => {
    try {
      const dose = doses.find(d => d.id === doseId);
      if (!dose) return;
      
      const currentTime = new Date();
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + 10);
      
      await updateDose(doseId, {
        status: 'snoozed',
        scheduledTime: snoozeTime,
        snoozeCount: (dose.snoozeCount || 0) + 1
      });
      
      // Send automatic notification to caregiver if enabled
      if (notifyCaregiverEnabled && caregiverEmail && userName) {
        const medication = dose.medication || await getMedication(dose.medicationId);
        if (medication) {
          notifyCaregiverAutomatically(
            caregiverEmail, 
            userName, 
            'snoozed', 
            {
              name: medication.name,
              dosage: medication.dosage,
              time: currentTime
            }
          );
        }
      }
      
      // Schedule a new reminder after the snooze time
      setTimeout(() => {
        const snoozeReminder = async () => {
          try {
            // Check if the dose is still snoozed (it hasn't been taken yet)
            const updatedDose = await getDose(doseId);
            if (updatedDose && updatedDose.status === 'snoozed') {
              // Force refresh data to get the latest medication info
              await refreshData();
              
              // Show notification for the snoozed dose
              const medDose = doses.find(d => d.id === doseId);
              if (medDose) {
                const medicationDetails = medDose.medication || await getMedication(medDose.medicationId);
                if (medicationDetails) {
                  // Play a gentle piano notification sound for snooze reminder
                  try {
                    // Use a preloaded audio object to ensure it plays immediately
                    const audio = new Audio();
                    audio.src = '/sounds/soft-notification2.mp3'; // Gentle notification sound
                    audio.volume = 0.8; // Slightly higher volume for better audibility for seniors
                    audio.loop = false;
                    
                    // Force the audio to load before playing
                    audio.load();
                    
                    // Play immediately after page interaction
                    const playSound = () => {
                      audio.play()
                        .then(() => {
                          console.log('Snooze reminder sound played successfully');
                          // Clean up event listeners
                          document.removeEventListener('click', playSound);
                          document.removeEventListener('keydown', playSound);
                        })
                        .catch(error => {
                          console.warn('Could not play snooze reminder sound:', error);
                        });
                    };
                    
                    // Try to play immediately
                    audio.play()
                      .then(() => console.log('Snooze reminder sound played successfully'))
                      .catch(err => {
                        console.warn('Auto-play prevented for snooze reminder. Will play on user interaction:', err);
                        // Add event listeners to play on first user interaction (browsers require this)
                        document.addEventListener('click', playSound, { once: true });
                        document.addEventListener('keydown', playSound, { once: true });
                      });
                  } catch (error) {
                    console.warn('Could not create audio element for snooze reminder:', error);
                  }
                  
                  // Show in-app notification
                  // This would be handled by the component that shows the medication notification
                  console.log('Showing snoozed reminder for medication:', medicationDetails.name);
                }
              }
            }
          } catch (error) {
            console.error('Error showing snoozed reminder:', error);
          }
        };
        
        snoozeReminder();
      }, 10 * 60 * 1000); // 10 minutes
      
      await refreshData();
    } catch (error) {
      console.error('Error snoozing dose:', error);
      throw error;
    }
  };

  const setHighContrast = async (value: boolean) => {
    setIsHighContrast(value);
  };

  const updateNotificationsEnabled = async (value: boolean) => {
    setNotificationsEnabled(value);
  };

  return (
    <AppContext.Provider value={{
      isHighContrast,
      setHighContrast,
      notificationsEnabled,
      setNotificationsEnabled: updateNotificationsEnabled,
      requestPermissions,
      hasNotificationPermission,
      medications,
      doses,
      refreshData,
      takeDose,
      snoozeDose,
      notifyCaregiverEnabled,
      caregiverEmail,
      userName
    }}>
      {children}
    </AppContext.Provider>
  );
};
