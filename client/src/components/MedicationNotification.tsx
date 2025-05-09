import { useState, useEffect } from 'react';
import { updateDose } from '@/lib/storage';
import { playNotificationSound, playConfirmationSound } from '@/lib/soundUtils';

interface MedicationNotificationProps {
  dose: {
    id: string;
    medicationId: string;
    medicationName: string;
    dosage: string;
    instructions?: string;
  };
  onConfirm: (doseId: string) => void;
  onSnooze: (doseId: string) => void;
  onClose: () => void;
}

const MedicationNotification = ({ 
  dose, 
  onConfirm, 
  onSnooze, 
  onClose 
}: MedicationNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleConfirm = () => {
    // Play confirmation sound when medication is taken
    playConfirmationSound()
      .then(() => console.log('Medication confirmation sound played'))
      .catch(error => console.warn('Failed to play confirmation sound:', error));
      
    onConfirm(dose.id);
    setIsVisible(false);
  };

  const handleSnooze = () => {
    onSnooze(dose.id);
    setIsVisible(false);
  };

  const handleClose = () => {
    onClose();
    setIsVisible(false);
  };

  useEffect(() => {
    // Play notification sound when the component mounts
    playNotificationSound()
      .then(() => console.log('Medication reminder notification sound played in modal'))
      .catch(error => console.warn('Failed to play notification sound in modal:', error));
    
    // Auto-hide notification after 60 seconds if no action is taken
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 60000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    // Overlay that darkens the background to emphasize the notification
    <div className="fixed inset-0 flex items-center justify-center z-[999] bg-black bg-opacity-30 p-4">
      {/* Center notification with larger size and improved visibility */}
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-in zoom-in-95 duration-300 border-2 border-primary">
        <div className="flex items-start mb-4">
          <div className="bg-primary p-4 rounded-full mr-4">
            <i className="fas fa-pills text-white text-2xl"></i>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">Time for your medication</h3>
            <p className="text-gray-700 text-lg font-medium">{dose.medicationName} - {dose.dosage}</p>
            {dose.instructions && (
              <p className="text-gray-700 text-base mt-1">{dose.instructions}</p>
            )}
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 p-2"
            aria-label="Close notification"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="flex flex-col space-y-3 mt-4">
          <button 
            onClick={handleConfirm}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg transition text-xl flex items-center justify-center"
          >
            <i className="fas fa-check mr-2 text-xl"></i> Take Now
          </button>
          <button 
            onClick={handleSnooze}
            className="w-full bg-gray-200 hover:bg-gray-300 font-bold py-4 px-4 rounded-lg transition text-xl flex items-center justify-center"
          >
            <i className="fas fa-bell mr-2 text-xl"></i> Remind me in 10 minutes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicationNotification;
