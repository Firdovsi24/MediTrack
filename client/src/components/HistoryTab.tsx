import { useState, useEffect } from "react";
import { getMedication, getAllDoses, clearAllHistory } from "@/lib/storage";
import { format, isSameDay, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface HistoryTabProps {
  // You can add props if needed
}

interface EnhancedDose {
  id: string;
  medicationId: string;
  scheduleId: string;
  status: string;
  scheduledTime: Date;
  actualTime?: Date | null;
  medication?: any;
  dateLabel: string;
  timeLabel: string;
}

interface DayData {
  dateLabel: string;
  doses: EnhancedDose[];
}

const HistoryTab = ({}: HistoryTabProps) => {
  const [historyData, setHistoryData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
    try {
      setLoading(true);
      
      // Get all doses from IndexedDB using our storage helper
      const allDoses = await getAllDoses();
      
      // Filter to only include taken, missed, or past pending doses
      const now = new Date();
      const historyDoses = allDoses.filter(dose => 
        dose.status === 'taken' || 
        dose.status === 'missed' || 
        (new Date(dose.scheduledTime) < now && dose.status === 'pending')
      );
      
      console.log('Loaded doses for history:', historyDoses.length);
      
      // Fetch medication data to cross-reference with doses
      const medications = await Promise.all(
        historyDoses.map(async (dose) => {
          const medication = await getMedication(dose.medicationId);
          return {
            ...dose,
            medication,
            dateLabel: format(dose.scheduledTime, 'MMM d, yyyy'),
            timeLabel: format(dose.scheduledTime, 'h:mm a')
          };
        })
      );
      
      // Group by date
      const groupedByDate: Record<string, EnhancedDose[]> = {};
      
      medications.forEach(dose => {
        const dateKey = format(dose.scheduledTime, 'yyyy-MM-dd');
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(dose as EnhancedDose);
      });
      
      // Sort each day's doses by time
      Object.keys(groupedByDate).forEach(date => {
        groupedByDate[date].sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      });
      
      // Generate at least 3 days worth of data (today, yesterday, day before)
      const today = new Date();
      const daysToShow = 3;
      
      const dummyDates: Record<string, DayData> = {};
      for (let i = 0; i < daysToShow; i++) {
        const date = subDays(today, i);
        const dateKey = format(date, 'yyyy-MM-dd');
        
        if (!groupedByDate[dateKey]) {
          const dayLabel = i === 0 
            ? 'Today' 
            : i === 1 
            ? 'Yesterday' 
            : format(date, 'EEEE');
            
          dummyDates[dateKey] = {
            dateLabel: `${dayLabel} - ${format(date, 'MMM d, yyyy')}`,
            doses: []
          };
        }
      }
      
      // Create the final history data
      const finalHistoryData: Record<string, DayData> = {};
      const sortedDateKeys = Object.keys(groupedByDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      sortedDateKeys.forEach(dateKey => {
        const date = new Date(dateKey);
        let dayLabel = format(date, 'MMMM d, yyyy');
        
        if (isSameDay(date, today)) {
          dayLabel = `Today - ${format(date, 'MMM d, yyyy')}`;
        } else if (isSameDay(date, subDays(today, 1))) {
          dayLabel = `Yesterday - ${format(date, 'MMM d, yyyy')}`;
        }
        
        finalHistoryData[dateKey] = {
          dateLabel: dayLabel,
          doses: groupedByDate[dateKey]
        };
      });
      
      // Add dummy dates
      Object.keys(dummyDates).forEach(dateKey => {
        if (!finalHistoryData[dateKey]) {
          finalHistoryData[dateKey] = dummyDates[dateKey];
        }
      });
      
      // Sort the entire history by date (newest first)
      const sortedHistory = Object.keys(finalHistoryData)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .reduce((result, key) => {
          result[key] = finalHistoryData[key];
          return result;
        }, {} as Record<string, DayData>);
      
      setHistoryData(sortedHistory);
    } catch (error) {
      console.error('Error loading history data:', error);
      toast({
        title: "Error loading history",
        description: "There was a problem loading your medication history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportHistory = () => {
    try {
      // Create CSV content
      let csvContent = "Date,Time,Medication,Dosage,Status\n";
      
      Object.keys(historyData).forEach(dateKey => {
        const dayData = historyData[dateKey];
        dayData.doses.forEach((dose: any) => {
          const row = [
            format(dose.scheduledTime, 'yyyy-MM-dd'),
            format(dose.scheduledTime, 'HH:mm'),
            dose.medication?.name || 'Unknown',
            dose.medication?.dosage || '',
            dose.status
          ];
          csvContent += row.join(',') + "\n";
        });
      });
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `medication_history_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "History exported",
        description: "Your medication history has been exported as a CSV file",
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        title: "Export failed",
        description: "There was a problem exporting your history",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-lg">Loading your history...</p>
      </div>
    );
  }

  return (
    <div className="tab-content overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Medication History</h2>
      
      {Object.keys(historyData).length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-4 text-center">
          <p className="text-lg">No medication history available</p>
        </div>
      ) : (
        Object.keys(historyData).map(dateKey => {
          const dayData = historyData[dateKey];
          return (
            <div key={dateKey} className="mb-6">
              <h3 className="text-xl font-semibold mb-3">{dayData.dateLabel}</h3>
              
              {dayData.doses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-4 mb-3 text-center">
                  <p className="text-gray-500">No medication records for this day</p>
                </div>
              ) : (
                dayData.doses.map((dose: EnhancedDose) => (
                  <div key={dose.id} className="bg-white rounded-xl shadow-md p-4 mb-3">
                    <div className="flex items-center">
                      <div className={`${
                        dose.status === 'taken' 
                          ? 'bg-success-light p-3 rounded-full mr-3' 
                          : dose.status === 'missed' 
                          ? 'bg-danger-light p-3 rounded-full mr-3'
                          : 'bg-warning p-3 rounded-full mr-3'
                      }`}>
                        <i className={`${
                          dose.status === 'taken' 
                            ? 'fas fa-check text-success' 
                            : dose.status === 'missed' 
                            ? 'fas fa-times text-danger'
                            : 'fas fa-clock text-white'
                        }`}></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-medium">
                          {dose.medication?.name || 'Unknown'} {dose.medication?.dosage || ''}
                        </h4>
                        <p className="text-gray-600">
                          {dose.medication?.instructions || '1 tablet'} - {dose.timeLabel}
                        </p>
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
                          : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button 
          onClick={exportHistory}
          className="bg-secondary hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition flex justify-center items-center"
        >
          <i className="fas fa-download mr-2"></i> Export History
        </button>
        
        {Object.keys(historyData).length > 0 && (
          <button 
            onClick={async () => {
              if (confirm('Are you sure you want to clear all medication history? This cannot be undone.')) {
                try {
                  setLoading(true);
                  await clearAllHistory();
                  
                  toast({
                    title: "History cleared",
                    description: "Your medication history has been deleted",
                    variant: "default",
                  });
                  
                  // Reload history data
                  await loadHistoryData();
                } catch (error) {
                  console.error('Error clearing history:', error);
                  toast({
                    title: "Clear failed",
                    description: "There was a problem clearing your history",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition flex justify-center items-center"
          >
            <i className="fas fa-trash-alt mr-2"></i> Clear History
          </button>
        )}
      </div>
    </div>
  );
};

export default HistoryTab;
