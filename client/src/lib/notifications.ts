import { getDose, updateDose } from "./storage";

export interface NotificationAction {
  action: 'confirm' | 'snooze';
  doseId: string;
}

// Ensure browser supports notifications
export function checkNotificationSupport(): { supported: boolean; permissionGranted: boolean } {
  if (!('Notification' in window)) {
    return { supported: false, permissionGranted: false };
  }
  return {
    supported: true,
    permissionGranted: Notification.permission === 'granted'
  };
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

// Display a medication reminder notification
export async function showMedicationReminder(dose: {
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
}): Promise<void> {
  const { supported, permissionGranted } = checkNotificationSupport();
  if (!supported || !permissionGranted) {
    // Fallback to in-app notification if browser notifications not available
    console.warn('Browser notifications not available or permission denied');
    return;
  }
  
  try {
    const notification = new Notification('Time for your medication', {
      body: `${dose.medicationName} - ${dose.dosage}`,
      icon: '/icons/icon-192x192.png',
      tag: `medication-${dose.id}`,
      requireInteraction: true,
      actions: [
        { action: 'confirm', title: 'Confirm' },
        { action: 'snooze', title: 'Snooze 10min' }
      ]
    });
    
    notification.onclick = async (event) => {
      window.focus();
      notification.close();
    };
    
    // Listen for actions (note: not supported in all browsers)
    if ('actions' in Notification.prototype) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const action = event.data as NotificationAction;
        if (action.doseId === dose.id) {
          if (action.action === 'confirm') {
            await updateDose(dose.id, { 
              status: 'taken',
              actualTime: new Date() 
            });
          } else if (action.action === 'snooze') {
            const doseDetails = await getDose(dose.id);
            if (doseDetails) {
              const snoozeTime = new Date();
              snoozeTime.setMinutes(snoozeTime.getMinutes() + 10);
              await updateDose(dose.id, {
                status: 'snoozed',
                scheduledTime: snoozeTime,
                snoozeCount: (doseDetails.snoozeCount || 0) + 1
              });
              
              // Schedule a new notification for 10 minutes later
              setTimeout(() => {
                showMedicationReminder(dose);
              }, 10 * 60 * 1000);
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Schedule notifications for the upcoming doses
export async function scheduleNotifications(doses: Array<{
  id: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions?: string;
  scheduledTime: Date;
}>): Promise<void> {
  const { supported, permissionGranted } = checkNotificationSupport();
  if (!supported || !permissionGranted) {
    return;
  }
  
  doses.forEach(dose => {
    const now = new Date();
    const timeDiff = dose.scheduledTime.getTime() - now.getTime();
    
    if (timeDiff > 0) {
      setTimeout(() => {
        showMedicationReminder(dose);
      }, timeDiff);
    }
  });
}
