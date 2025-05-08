import { useState, useEffect } from 'react';
import { updateDose } from '@/lib/storage';

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
    // Auto-hide notification after 60 seconds if no action is taken
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 60000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg p-4 max-w-sm w-full z-50 animate-in slide-in-from-top duration-300">
      <div className="flex items-start mb-2">
        <div className="bg-primary p-3 rounded-full mr-3">
          <i className="fas fa-pills text-white"></i>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Time for your medication</h3>
          <p className="text-gray-600">{dose.medicationName} - {dose.dosage}</p>
          {dose.instructions && (
            <p className="text-gray-600 text-sm">{dose.instructions}</p>
          )}
        </div>
        <button 
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close notification"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={handleConfirm}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          <i className="fas fa-check mr-1"></i> Confirm
        </button>
        <button 
          onClick={handleSnooze}
          className="flex-1 bg-gray-200 hover:bg-gray-300 font-medium py-2 px-4 rounded-lg transition"
        >
          <i className="fas fa-bell mr-1"></i> Snooze 10min
        </button>
      </div>
    </div>
  );
};

export default MedicationNotification;
