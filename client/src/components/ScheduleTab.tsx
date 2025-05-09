import { useState, useEffect, useRef } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { getAllMedications, getSchedulesForMedication, getDosesForDay, deleteMedication, updateMedication } from "@/lib/storage";
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
  const [editingMedication, setEditingMedication] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
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
    // Call loadDaySchedule without arguments to use the current medications state
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
      
      // Now that medications are loaded, fetch the day schedule
      await loadDaySchedule(medsWithSchedules);
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

  const loadDaySchedule = async (medsData = medications) => {
    try {
      const doses = await getDosesForDay(selectedDate);
      
      // Group doses by time of day
      const morning: any[] = [];
      const afternoon: any[] = [];
      const evening: any[] = [];
      
      await Promise.all(
        doses.map(async (dose) => {
          // Use the provided medications data or fall back to the state
          const medication = medsData.find(med => med.id === dose.medicationId);
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
        morning: morning.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()),
        afternoon: afternoon.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()),
        evening: evening.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime())
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

  const handleEditMedication = (medication: any) => {
    setEditingMedication(medication);
    setShowEditForm(true);
    setOpenMenuId(null);
  };
  
  const handleSaveEdit = async (updatedData: any) => {
    try {
      setLoading(true);
      if (!editingMedication) return;
      
      await updateMedication(editingMedication.id, updatedData);
      toast({
        title: "Medication updated",
        description: "The medication has been updated successfully",
        variant: "default",
      });
      await loadMedications();
      setShowEditForm(false);
      setEditingMedication(null);
    } catch (error) {
      console.error('Error updating medication:', error);
      toast({
        title: "Update Error",
        description: "There was a problem updating the medication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                <div className="flex items-center">
                  <button 
                    className="text-red-600 p-2 hover:bg-red-50 rounded-full mr-1 flex items-center"
                    onClick={() => handleDeleteMedication(med.id)}
                    aria-label={`Delete ${med.name}`}
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                  <button 
                    className="text-gray-500 p-2 hover:bg-gray-100 rounded-full"
                    onClick={() => toggleMenu(med.id)}
                  >
                    <i className="fas fa-ellipsis-v"></i>
                  </button>
                </div>
                
                {/* Dropdown Menu */}
                {openMenuId === med.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-2 top-12 bg-white shadow-lg rounded-lg z-10 min-w-[150px] py-2"
                  >
                    <button 
                      className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-gray-700"
                      onClick={() => handleEditMedication(med)}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <button 
            onClick={onAddMedicationClick}
            className="bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition flex justify-center items-center"
          >
            <i className="fas fa-plus mr-2"></i> Add Medication
          </button>
          
          {medications.length > 0 && (
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to delete ALL medications? This cannot be undone.')) {
                  // Create promise array to delete all medications
                  const deletePromises = medications.map(med => deleteMedication(med.id));
                  
                  // Show loading state
                  setLoading(true);
                  
                  // Delete all medications
                  Promise.all(deletePromises)
                    .then(() => {
                      toast({
                        title: "All medications deleted",
                        description: "All your medications have been removed",
                        variant: "default",
                      });
                      loadMedications();
                    })
                    .catch(error => {
                      console.error('Error deleting all medications:', error);
                      toast({
                        title: "Delete Error",
                        description: "There was a problem deleting the medications",
                        variant: "destructive",
                      });
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition flex justify-center items-center"
            >
              <i className="fas fa-trash-alt mr-2"></i> Delete All Medications
            </button>
          )}
        </div>
      </div>
      
      {/* Edit Medication Form */}
      {showEditForm && editingMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Medication</h2>
                <button 
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingMedication(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedData = {
                  name: formData.get('name') as string,
                  dosage: formData.get('dosage') as string,
                  instructions: formData.get('instructions') as string,
                };
                
                handleSaveEdit(updatedData);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                      Medication Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      defaultValue={editingMedication.name}
                      required
                      className="shadow-sm rounded-lg w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dosage">
                      Dosage
                    </label>
                    <input
                      type="text"
                      id="dosage"
                      name="dosage"
                      defaultValue={editingMedication.dosage}
                      className="shadow-sm rounded-lg w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="instructions">
                      Instructions
                    </label>
                    <textarea
                      id="instructions"
                      name="instructions"
                      defaultValue={editingMedication.instructions}
                      className="shadow-sm rounded-lg w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end mt-6 space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingMedication(null);
                      }}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
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
