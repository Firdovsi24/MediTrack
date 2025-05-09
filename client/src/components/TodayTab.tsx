import { useState, useEffect } from "react";
import { getDosesForDay, getMedication, updateDose } from "@/lib/storage";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TodayTabProps {
  onAddMedicationClick: () => void;
}

const TodayTab = ({ onAddMedicationClick }: TodayTabProps) => {
  const [todayDoses, setTodayDoses] = useState<any[]>([]);
  const [nextDose, setNextDose] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTodayDoses();
    // Refresh data every minute
    const interval = setInterval(loadTodayDoses, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTodayDoses = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const doses = await getDosesForDay(today);
      
      // Fetch medication details for each dose
      const dosesWithMedication = await Promise.all(
        doses.map(async (dose) => {
          const medication = await getMedication(dose.medicationId);
          return {
            ...dose,
            medication,
            timeLabel: format(dose.scheduledTime, 'h:mm a'),
            timeFromNow: getTimeFromNow(dose.scheduledTime)
          };
        })
      );
      
      // Sort by scheduled time
      const sortedDoses = dosesWithMedication.sort(
        (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );
      
      // Find the next upcoming dose
      const now = new Date();
      const upcomingDose = sortedDoses.find(
        dose => dose.status === 'pending' && dose.scheduledTime > now
      ) || null;
      
      setTodayDoses(sortedDoses);
      setNextDose(upcomingDose);
    } catch (error) {
      console.error('Error loading today doses:', error);
      toast({
        title: "Error loading medications",
        description: "There was a problem loading your medications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeFromNow = (scheduledTime: Date): string => {
    const now = new Date();
    const diffMinutes = Math.round((scheduledTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffMinutes < 0) return 'Overdue';
    if (diffMinutes === 0) return 'Now';
    if (diffMinutes < 60) return `In ${diffMinutes} minutes`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `In ${hours}h ${minutes}m`;
  };

  const handleTakeNow = async (doseId: string) => {
    try {
      await updateDose(doseId, {
        status: 'taken',
        actualTime: new Date()
      });
      toast({
        title: "Medication marked as taken",
        description: "Your medication has been recorded",
        variant: "default",
      });
      loadTodayDoses();
    } catch (error) {
      console.error('Error updating dose:', error);
      toast({
        title: "Error",
        description: "Failed to update medication status",
        variant: "destructive",
      });
    }
  };

  const handleRemindLater = async (doseId: string) => {
    try {
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes later
      
      await updateDose(doseId, {
        status: 'snoozed',
        scheduledTime: snoozeTime,
        snoozeCount: (nextDose?.snoozeCount || 0) + 1
      });
      
      toast({
        title: "Reminder snoozed",
        description: "We'll remind you again in 10 minutes",
        variant: "default",
      });
      
      loadTodayDoses();
    } catch (error) {
      console.error('Error snoozing dose:', error);
      toast({
        title: "Error",
        description: "Failed to snooze reminder",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className="tab-content overflow-y-auto">
      {nextDose ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">Next Dose</h2>
            <span className="bg-warning-100 text-warning-800 px-3 py-1 rounded-full text-sm font-medium">
              {nextDose.timeFromNow}
            </span>
          </div>
          
          <div className="flex items-center mb-4">
            <div className="bg-primary p-4 rounded-full mr-4">
              <i className="fas fa-pills text-white text-2xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{nextDose.medication?.name || 'Unknown Medication'}</h3>
              <p className="text-gray-600">{nextDose.medication?.dosage || ''} - {nextDose.medication?.instructions || '1 tablet'}</p>
            </div>
          </div>
          
          <p className="mb-4 text-lg">
            <i className="far fa-clock mr-2"></i> {nextDose.timeLabel}
          </p>
          
          <div className="flex space-x-4">
            <button 
              onClick={() => handleTakeNow(nextDose.id)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg transition"
            >
              <i className="fas fa-check mr-2"></i> Take Now
            </button>
            <button 
              onClick={() => handleRemindLater(nextDose.id)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 font-bold py-4 px-4 rounded-lg transition"
            >
              <i className="fas fa-bell mr-2"></i> Remind Later
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="bg-success p-4 rounded-full mr-4">
              <i className="fas fa-check text-white text-2xl"></i>
            </div>
            <div>
              <h3 className="text-xl font-semibold">No upcoming doses</h3>
              <p className="text-gray-600">You're all caught up for today!</p>
            </div>
          </div>
        </div>
      )}
      
      <h2 className="text-2xl font-bold mb-4">Today's Schedule</h2>
      
      {todayDoses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-4 text-center">
          <p className="text-lg">No medications scheduled for today</p>
        </div>
      ) : (
        todayDoses.map(dose => (
          <div key={dose.id} className="bg-white rounded-xl shadow-md p-6 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                <div className={`${
                  dose.status === 'taken' 
                    ? 'bg-success-light' 
                    : dose.status === 'missed' 
                    ? 'bg-danger-light' 
                    : 'bg-warning'
                } p-3 rounded-full mr-3`}>
                  <i className={`${
                    dose.status === 'taken' 
                      ? 'fas fa-check text-success' 
                      : dose.status === 'missed' 
                      ? 'fas fa-times text-danger' 
                      : 'fas fa-clock text-white'
                  }`}></i>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{dose.medication?.name || 'Unknown Medication'}</h3>
                  <p className="text-gray-600">{dose.medication?.dosage || ''} - {dose.medication?.instructions || '1 tablet'}</p>
                  <p className="text-gray-600"><i className="far fa-clock mr-1"></i> {dose.timeLabel}</p>
                </div>
              </div>
              <span className={`${
                dose.status === 'taken' 
                  ? 'text-success' 
                  : dose.status === 'missed' 
                  ? 'text-danger' 
                  : 'text-warning'
              } font-medium`}>
                {dose.status === 'taken' 
                  ? 'Taken' 
                  : dose.status === 'missed' 
                  ? 'Missed' 
                  : 'Upcoming'}
              </span>
            </div>
          </div>
        ))
      )}
      
      <button 
        onClick={onAddMedicationClick}
        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl mt-6 transition flex justify-center items-center"
      >
        <i className="fas fa-plus mr-2"></i> Add Medication
      </button>
    </div>
  );
};

export default TodayTab;
