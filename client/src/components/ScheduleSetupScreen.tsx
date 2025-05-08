import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { getMedication, saveSchedule, generateDosesForSchedule } from "@/lib/storage";
import { scheduleFormSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ScheduleSetupScreenProps {
  medicationId: string;
  onBack: () => void;
  onComplete: () => void;
}

const ScheduleSetupScreen = ({ medicationId, onBack, onComplete }: ScheduleSetupScreenProps) => {
  const [medication, setMedication] = useState<any>(null);
  const [frequency, setFrequency] = useState<string>("daily");
  const [additionalTimes, setAdditionalTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      frequency: "daily",
      times: ["08:00"],
      specificDays: [0, 1, 2, 3, 4, 5, 6], // All days of week selected by default
      everyXDays: 1,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: "",
      enableReminders: true
    }
  });
  
  const watchFrequency = watch("frequency");

  useEffect(() => {
    loadMedication();
  }, [medicationId]);

  useEffect(() => {
    setFrequency(watchFrequency);
  }, [watchFrequency]);

  const loadMedication = async () => {
    try {
      setLoading(true);
      const med = await getMedication(medicationId);
      setMedication(med);
    } catch (error) {
      console.error('Error loading medication:', error);
      toast({
        title: "Loading Error",
        description: "There was a problem loading your medication details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTime = () => {
    setAdditionalTimes([...additionalTimes, "12:00"]);
  };

  const removeTime = (index: number) => {
    const newTimes = [...additionalTimes];
    newTimes.splice(index, 1);
    setAdditionalTimes(newTimes);
  };

  const toggleDay = (day: number) => {
    const currentDays = watch("specificDays") || [];
    let newDays: number[];
    
    if (currentDays.includes(day)) {
      // Don't allow removing the last day
      if (currentDays.length <= 1) {
        toast({
          title: "Selection Required",
          description: "You must select at least one day of the week",
          variant: "destructive",
        });
        return;
      }
      newDays = currentDays.filter(d => d !== day);
    } else {
      newDays = [...currentDays, day].sort((a, b) => a - b); // Sort days in order
    }
    
    setValue("specificDays", newDays);
  };

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      
      // Combine primary time with additional times
      const allTimes = [data.times[0], ...additionalTimes];
      
      // Create schedule object
      const schedule = {
        medicationId,
        frequency: data.frequency,
        times: allTimes,
        specificDays: data.frequency === "specific_days" ? data.specificDays : undefined,
        everyXDays: data.frequency === "every_x_days" ? data.everyXDays : undefined,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        active: true
      };
      
      // Save schedule to database
      const savedSchedule = await saveSchedule(schedule);
      
      // Generate initial doses
      if (medication) {
        await generateDosesForSchedule(savedSchedule, medication);
      }
      
      toast({
        title: "Schedule saved",
        description: "Your medication schedule has been created successfully",
        variant: "default",
      });
      
      onComplete();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Save Error",
        description: "There was a problem saving your schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white z-40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-40">
      <div className="container mx-auto px-4 py-6 max-w-md h-full flex flex-col">
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="p-2 mr-2">
            <i className="fas fa-arrow-left text-2xl"></i>
          </button>
          <h2 className="text-2xl font-bold">Set Schedule</h2>
        </div>
        
        <div className="bg-gray-100 rounded-xl p-4 mb-6">
          <h3 className="text-xl font-semibold">{medication?.name || 'Medication'}</h3>
          <p className="text-gray-600">{medication?.dosage || ''} - {medication?.instructions || '1 tablet daily'}</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">Frequency</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <select 
                {...register("frequency")}
                className="w-full px-4 py-3 text-lg appearance-none"
              >
                <option value="daily">Every day</option>
                <option value="multiple_daily">Multiple times per day</option>
                <option value="specific_days">Specific days of week</option>
                <option value="every_x_days">Every X days</option>
                <option value="as_needed">As needed</option>
              </select>
            </div>
            {errors.frequency && (
              <p className="text-destructive text-sm mt-1">{errors.frequency.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">Time of Day</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <input 
                type="time" 
                {...register("times.0")}
                className="w-full px-4 py-3 text-lg"
                defaultValue="08:00"
              />
            </div>
            {errors.times && (
              <p className="text-destructive text-sm mt-1">{errors.times.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">Start Date</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <input 
                type="date" 
                {...register("startDate")}
                className="w-full px-4 py-3 text-lg"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            {errors.startDate && (
              <p className="text-destructive text-sm mt-1">{errors.startDate.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">End Date (Optional)</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <input 
                type="date" 
                {...register("endDate")}
                className="w-full px-4 py-3 text-lg"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-lg font-medium mb-2">Reminder</label>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                {...register("enableReminders")}
                id="reminder-toggle" 
                className="h-6 w-6 mr-2"
              />
              <span>Send notification reminders</span>
            </div>
          </div>
          
          {/* Additional Times (for "Multiple times per day") */}
          {frequency === "multiple_daily" && (
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Additional Times</label>
              {additionalTimes.map((time, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const newTimes = [...additionalTimes];
                      newTimes[index] = e.target.value;
                      setAdditionalTimes(newTimes);
                    }}
                    className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeTime(index)}
                    className="ml-2 text-danger p-2 hover:bg-gray-100 rounded-full"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addTime}
                className="text-primary font-medium flex items-center mt-2"
              >
                <i className="fas fa-plus mr-2"></i> Add Another Time
              </button>
            </div>
          )}
          
          {/* Specific Days (for "Specific days of week") */}
          {frequency === "specific_days" && (
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Select Days</label>
              <div className="flex flex-wrap gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
                  const selectedDays = watch("specificDays") || [];
                  const isSelected = selectedDays.includes(index);
                  
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`day-toggle font-medium py-2 px-4 rounded-lg ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-white border-2 border-gray-300'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {errors.specificDays && (
                <p className="text-destructive text-sm mt-1">{errors.specificDays.message}</p>
              )}
            </div>
          )}
          
          {/* Every X Days */}
          {frequency === "every_x_days" && (
            <div className="mb-4">
              <label className="block text-lg font-medium mb-2">Repeat every</label>
              <div className="flex items-center">
                <input
                  type="number"
                  {...register("everyXDays", { valueAsNumber: true })}
                  min="1"
                  max="365"
                  className="w-20 border-2 border-gray-300 rounded-lg px-4 py-3 text-lg mr-2"
                  defaultValue="1"
                />
                <span className="text-lg">days</span>
              </div>
              {errors.everyXDays && (
                <p className="text-destructive text-sm mt-1">{errors.everyXDays.message}</p>
              )}
            </div>
          )}
          
          <div className="mt-auto">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition flex justify-center items-center"
            >
              {saving ? (
                <>
                  <span className="mr-2 animate-spin h-5 w-5 border-t-2 border-b-2 border-white rounded-full"></span>
                  Saving...
                </>
              ) : (
                "Save Medication"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleSetupScreen;
