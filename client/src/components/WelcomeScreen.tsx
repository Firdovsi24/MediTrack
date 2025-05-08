import { updateSettings } from '@/lib/storage';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const handleGetStarted = async () => {
    await updateSettings({ hasVisitedBefore: true });
    onComplete();
  };

  return (
    <div className="container mx-auto px-4 pb-24 max-w-md">
      <div className="py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">MediTrack</h1>
          <p className="text-xl">Your personal medication reminder assistant</p>
        </div>
        
        <div className="rounded-xl shadow-lg overflow-hidden mb-8 bg-gray-100 flex items-center justify-center">
          <svg className="w-full h-64" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="400" fill="#f3f4f6" />
            <circle cx="300" cy="180" r="120" fill="#e5e7eb" />
            <path d="M300,110 C360,110 410,160 410,220 C410,280 360,330 300,330 C240,330 190,280 190,220 C190,160 240,110 300,110 Z" fill="#d1d5db" />
            <path d="M260,170 C260,170 280,200 300,200 C320,200 340,170 340,170 M260,240 C260,240 280,270 300,270 C320,270 340,240 340,240" stroke="#0D6EFD" strokeWidth="8" fill="none" strokeLinecap="round" />
            <rect x="230" y="180" width="140" height="70" rx="10" fill="#0D6EFD" />
            <rect x="270" y="160" width="60" height="30" rx="5" fill="#0D6EFD" />
          </svg>
        </div>
        
        <div className="space-y-6 mb-8">
          <div className="flex items-start">
            <div className="bg-primary-light p-3 rounded-full mr-4">
              <i className="fas fa-camera text-primary text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Take a photo of your medication</h3>
              <p>We'll automatically identify the medication and dosage instructions</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-primary-light p-3 rounded-full mr-4">
              <i className="fas fa-clock text-primary text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Get reminders when it's time</h3>
              <p>Receive notifications when you need to take your medication</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <div className="bg-primary-light p-3 rounded-full mr-4">
              <i className="fas fa-lock text-primary text-xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Your data stays private</h3>
              <p>All your information is stored only on your device, not in the cloud</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleGetStarted}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
