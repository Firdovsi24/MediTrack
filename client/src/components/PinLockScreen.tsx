import { useState, useRef, useEffect } from 'react';
import { getSettings, updateSettings } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface PinLockScreenProps {
  onVerified: () => void;
}

const PinLockScreen = ({ onVerified }: PinLockScreenProps) => {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [attempts, setAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const lockTimerRef = useRef<number | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (locked && lockTimer > 0) {
      lockTimerRef.current = window.setTimeout(() => {
        setLockTimer(prev => prev - 1);
      }, 1000);
      return () => {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      };
    } else if (locked && lockTimer === 0) {
      setLocked(false);
      setAttempts(0);
    }
  }, [locked, lockTimer]);
  
  const handlePinDigit = (digit: string) => {
    if (locked) return;
    
    const firstEmptyIndex = pin.findIndex(val => val === '');
    if (firstEmptyIndex === -1) return; // All positions filled
    
    const newPin = [...pin];
    newPin[firstEmptyIndex] = digit;
    setPin(newPin);
    
    // Check PIN when all digits are entered
    if (firstEmptyIndex === 3) {
      setTimeout(async () => {
        await validatePin(newPin.join(''));
      }, 300);
    }
  };
  
  const clearPin = () => {
    setPin(['', '', '', '']);
    setErrorMessage('');
  };
  
  const deleteLastDigit = () => {
    if (locked) return;
    
    const lastFilledIndex = [...pin].reverse().findIndex(val => val !== '');
    if (lastFilledIndex === -1) return; // No filled positions
    
    const newPin = [...pin];
    newPin[pin.length - 1 - lastFilledIndex] = '';
    setPin(newPin);
  };
  
  const validatePin = async (enteredPin: string) => {
    const settings = await getSettings();
    const correctPin = settings.pin;
    
    if (enteredPin === correctPin) {
      onVerified();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setLocked(true);
        setLockTimer(300); // 5 minutes in seconds
        setErrorMessage('Too many incorrect attempts. Try again in 5 minutes.');
        toast({
          title: "PIN Locked",
          description: "Too many incorrect attempts. Try again in 5 minutes.",
          variant: "destructive",
        });
      } else {
        setErrorMessage(`Incorrect PIN. Please try again. (${3 - newAttempts} attempts remaining)`);
        clearPin();
      }
    }
  };
  
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8">Enter your PIN</h1>
        <p className="text-lg mb-6">Please enter your 4-digit PIN to access your medication information</p>
        
        <div className="flex justify-center space-x-4 mb-8">
          {pin.map((digit, index) => (
            <div 
              key={index}
              className={`h-16 w-16 border-2 ${digit ? 'border-primary' : 'border-gray-300'} rounded flex items-center justify-center text-3xl`}
              data-position={index + 1}
            >
              {digit ? '•' : ''}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num}
              className="pin-button h-16 text-2xl bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              onClick={() => handlePinDigit(String(num))}
              disabled={locked}
            >
              {num}
            </button>
          ))}
          <button 
            className="pin-button h-16 text-2xl bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            onClick={clearPin}
            disabled={locked}
          >
            Clear
          </button>
          <button 
            className="pin-button h-16 text-2xl bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            onClick={() => handlePinDigit('0')}
            disabled={locked}
          >
            0
          </button>
          <button 
            className="pin-button h-16 text-2xl bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            onClick={deleteLastDigit}
            disabled={locked}
          >
            <i className="fas fa-backspace"></i>
          </button>
        </div>
        
        {errorMessage && (
          <p className="text-destructive">{errorMessage}</p>
        )}
        
        {locked && (
          <p className="text-destructive">
            PIN locked. Try again in {Math.floor(lockTimer / 60)}:{(lockTimer % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>
    </div>
  );
};

export default PinLockScreen;
