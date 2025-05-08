import { useState, useEffect, useRef } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { getAllMedications, getSchedulesForMedication, getDosesForDay, deleteMedication } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";

interface ScheduleTabProps {
  onAddMedicationClick: () => void;
}

const ScheduleTab = ({ onAddMedicationClick }: ScheduleTabProps) => {
  const [medications, setMedications] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daySchedule, setDaySchedule] = useState<any>({
    morning: [],
    afternoon: [],
    evening: []
  });
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate week days for the schedule view
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      day: format(date, 'EEE'),
      date: format(date, 'd'),
      fullDate: date,
      isToday: i === 0
    };
  });

  useEffect(() => {
    loadMedications();
  }, []);

  useEffect(() => {
    loadDaySchedule();
  }, [selectedDate]);
  
  // Close the menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const allMedications = await getAllMedications();
      
      // Fetch schedules for each medication
      const medsWithSchedules = await Promise.all(
        allMedications.map(async (med) => {
          const schedules = await getSchedulesForMedication(med.id);
          return {
            ...med,
            schedules
          };
        })
      );
      
      setMedications(medsWithSchedules);
      await loadDaySchedule();
    } catch (error) {
      console.error('Error loading medications:', error);
      toast({
        title: "Error loading data",
        description: "There was a problem loading your medication data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDaySchedule = async () => {
    try {
      const doses = await getDosesForDay(selectedDate);
      
      // Group doses by time of day
      const morning: any[] = [];
      const afternoon: any[] = [];
      const evening: any[] = [];
      
      await Promise.all(
        doses.map(async (dose) => {
          const medication = medications.find(med => med.id === dose.medicationId);
          const doseWithDetails = {
            ...dose,
            medication,
            timeString: format(dose.scheduledTime, 'h:mm a')
          };
          
          const hour = dose.scheduledTime.getHours();
          if (hour < 12) {
            morning.push(doseWithDetails);
          } else if (hour < 18) {
            afternoon.push(doseWithDetails);
          } else {
            evening.push(doseWithDetails);
          }
        })
      );
      
      setDaySchedule({
        morning: morning.sort((a, b) => a.scheduledTime - b.scheduledTime),
        afternoon: afternoon.sort((a, b) => a.scheduledTime - b.scheduledTime),
        evening: evening.sort((a, b) => a.scheduledTime - b.scheduledTime)
      });
    } catch (error) {
      console.error('Error loading day schedule:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  const toggleMenu = (medId: string) => {
    if (openMenuId === medId) {
      setOpenMenuId(null);
    } else {
      setOpenMenuId(medId);
    }
  };
  
  const handleDeleteMedication = async (medId: string) => {
    try {
      if (confirm('Are you sure you want to delete this medication and its schedule?')) {
        setLoading(true);
        await deleteMedication(medId);
        toast({
          title: "Medication deleted",
          description: "The medication has been deleted successfully",
          variant: "default",
        });
        await loadMedications();
      }
    } catch (error) {
      console.error('Error deleting medication:', error);
      toast({
        title: "Delete Error",
        description: "There was a problem deleting the medication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setOpenMenuId(null);
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
    <div className="tab-content">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Weekly Schedule</h2>
        
        {/* Day selector */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {weekDays.map((day, index) => (
            <button
              key={index}
              className={`flex-shrink-0 font-medium py-3 px-4 rounded-lg ${
                isSameDay(day.fullDate, selectedDate)
                  ? 'bg-primary text-white'
                  : 'bg-white text-dark border-2 border-gray-200'
              }`}
              onClick={() => handleDateSelect(day.fullDate)}
            >
              <div className="text-sm">{day.day}</div>
              <div className="text-lg font-bold">{day.date}</div>
            </button>
          ))}
        </div>
        
        {/* Time blocks */}
        <div className="space-y-4">
          {/* Morning */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-medium mb-2">Morning</h3>
            {daySchedule.morning.length === 0 ? (
              <p className="text-gray-500 py-3">No medications scheduled</p>
            ) : (
              daySchedule.morning.map((dose: any, index: number) => (
                <div key={dose.id} className={`flex items-center py-3 ${
                  index < daySchedule.morning.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
                  <div className="bg-primary-light p-2 rounded-full mr-3">
                    <i className="fas fa-pills text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{dose.medication?.name || 'Unknown'} {dose.medication?.dosage || ''}</div>
                    <div className="text-gray-500 text-sm">{dose.medication?.instructions || '1 tablet'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{dose.timeString}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Afternoon */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-medium mb-2">Afternoon</h3>
            {daySchedule.afternoon.length === 0 ? (
              <p className="text-gray-500 py-3">No medications scheduled</p>
            ) : (
              daySchedule.afternoon.map((dose: any, index: number) => (
                <div key={dose.id} className={`flex items-center py-3 ${
                  index < daySchedule.afternoon.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
                  <div className="bg-primary-light p-2 rounded-full mr-3">
                    <i className="fas fa-pills text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{dose.medication?.name || 'Unknown'} {dose.medication?.dosage || ''}</div>
                    <div className="text-gray-500 text-sm">{dose.medication?.instructions || '1 tablet'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{dose.timeString}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Evening */}
          <div className="bg-white rounded-xl p-4">
            <h3 className="text-lg font-medium mb-2">Evening</h3>
            {daySchedule.evening.length === 0 ? (
              <p className="text-gray-500 py-3">No medications scheduled</p>
            ) : (
              daySchedule.evening.map((dose: any, index: number) => (
                <div key={dose.id} className={`flex items-center py-3 ${
                  index < daySchedule.evening.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
                  <div className="bg-primary-light p-2 rounded-full mr-3">
                    <i className="fas fa-pills text-primary"></i>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{dose.medication?.name || 'Unknown'} {dose.medication?.dosage || ''}</div>
                    <div className="text-gray-500 text-sm">{dose.medication?.instructions || '1 tablet'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{dose.timeString}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Medications List */}
      <div>
        <h2 className="text-2xl font-bold mb-4">My Medications</h2>
        
        {medications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 mb-4 text-center">
            <p className="text-lg">No medications added yet</p>
          </div>
        ) : (
          medications.map(med => (
            <div key={med.id} className="bg-white rounded-xl shadow-md p-4 mb-4 relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-primary p-3 rounded-full mr-3">
                    <i className="fas fa-pills text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{med.name}</h3>
                    <p className="text-gray-600">{med.dosage} - {med.instructions || '1 tablet'}</p>
                  </div>
                </div>
                <button 
                  className="text-gray-500 p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => toggleMenu(med.id)}
                >
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                
                {/* Dropdown Menu */}
                {openMenuId === med.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-2 top-12 bg-white shadow-lg rounded-lg z-10 min-w-[150px] py-2"
                  >
                    <button 
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-700"
                      onClick={() => {
                        // Edit functionality can be implemented later
                        setOpenMenuId(null);
                        toast({
                          title: "Edit Coming Soon",
                          description: "Editing will be available in a future update",
                          variant: "default",
                        });
                      }}
                    >
                      <i className="fas fa-edit mr-2"></i> Edit
                    </button>
                    <button 
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-red-600"
                      onClick={() => handleDeleteMedication(med.id)}
                    >
                      <i className="fas fa-trash-alt mr-2"></i> Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 pl-12">
                {med.schedules && med.schedules.length > 0 ? (
                  <>
                    <p>
                      <i className="far fa-calendar-alt mr-2 text-gray-600"></i>
                      {getFrequencyText(med.schedules[0])}
                    </p>
                    <p>
                      <i className="far fa-clock mr-2 text-gray-600"></i>
                      {med.schedules[0].times.map((t: string) => formatTime(t)).join(', ')}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">No schedule set</p>
                )}
              </div>
            </div>
          ))
        )}
        
        <button 
          onClick={onAddMedicationClick}
          className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl mt-4 transition flex justify-center items-center"
        >
          <i className="fas fa-plus mr-2"></i> Add Medication
        </button>
      </div>
    </div>
  );
};

// Helper functions
const getFrequencyText = (schedule: any) => {
  switch (schedule.frequency) {
    case 'daily':
      return 'Every day';
    case 'multiple_daily':
      return 'Multiple times daily';
    case 'specific_days':
      return 'Specific days of week';
    case 'every_x_days':
      return `Every ${schedule.everyXDays} days`;
    case 'as_needed':
      return 'As needed';
    default:
      return 'Custom schedule';
  }
};

const formatTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

export default ScheduleTab;
