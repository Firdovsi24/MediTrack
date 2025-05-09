import { useState, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import AppHeader from '@/components/AppHeader';
import TabNavigation, { TabType } from '@/components/TabNavigation';
import BottomNavigation from '@/components/BottomNavigation';
import TodayTab from '@/components/TodayTab';
import ScheduleTab from '@/components/ScheduleTab';
import HistoryTab from '@/components/HistoryTab';
import SettingsScreen from '@/components/SettingsScreen';
import AddMedicationScreen from '@/components/AddMedicationScreen';
import ScheduleSetupScreen from '@/components/ScheduleSetupScreen';
import MedicationNotification from '@/components/MedicationNotification';

const Home = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showSettingsScreen, setShowSettingsScreen] = useState(false);
  const [showAddMedicationScreen, setShowAddMedicationScreen] = useState(false);
  const [showScheduleSetupScreen, setShowScheduleSetupScreen] = useState(false);
  const [currentMedicationId, setCurrentMedicationId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<any | null>(null);
  
  const { 
    refreshData, 
    doses,
    takeDose,
    snoozeDose,
    requestPermissions,
    hasNotificationPermission,
    notificationsEnabled
  } = useAppContext();
  
  const { toast } = useToast();

  useEffect(() => {
    refreshData();
    
    // Check for and request notification permissions if not already granted
    if (notificationsEnabled && !hasNotificationPermission) {
      requestNotifications();
    }
  }, []);

  // Check for upcoming doses and show notifications
  useEffect(() => {
    const now = new Date();
    
    // Find the next dose due in the next 1 minute
    const upcomingDose = doses.find(dose => {
      if (dose.status !== 'pending') return false;
      
      const diffMs = dose.scheduledTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      return diffMinutes >= 0 && diffMinutes < 1;
    });
    
    if (upcomingDose && !activeNotification) {
      setActiveNotification({
        id: upcomingDose.id,
        medicationId: upcomingDose.medicationId,
        medicationName: upcomingDose.medication?.name || 'Medication',
        dosage: upcomingDose.medication?.dosage || '',
        instructions: upcomingDose.medication?.instructions
      });
    }
  }, [doses, activeNotification]);

  const requestNotifications = async () => {
    try {
      await requestPermissions();
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      toast({
        title: "Notification Permission",
        description: "Please enable notifications to receive medication reminders",
        variant: "default",
      });
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleSettingsClick = () => {
    setShowSettingsScreen(true);
  };

  const handleAddMedicationClick = () => {
    setShowAddMedicationScreen(true);
  };

  const handleBackFromAddMedication = () => {
    setShowAddMedicationScreen(false);
  };

  const handleContinueToSchedule = (medicationId: string) => {
    setCurrentMedicationId(medicationId);
    setShowAddMedicationScreen(false);
    setShowScheduleSetupScreen(true);
  };

  const handleBackFromSchedule = () => {
    setShowScheduleSetupScreen(false);
    setShowAddMedicationScreen(true);
  };

  const handleScheduleComplete = () => {
    setShowScheduleSetupScreen(false);
    setCurrentMedicationId(null);
    refreshData();
    
    toast({
      title: "Medication added",
      description: "Your medication has been added successfully",
      variant: "default",
    });
  };

  const handleConfirmDose = async (doseId: string) => {
    try {
      await takeDose(doseId);
      setActiveNotification(null);
      
      toast({
        title: "Medication taken",
        description: "We've recorded that you've taken your medication",
        variant: "default",
      });
    } catch (error) {
      console.error('Error confirming dose:', error);
      toast({
        title: "Error",
        description: "Could not update your medication record",
        variant: "destructive",
      });
    }
  };

  const handleSnoozeDose = async (doseId: string) => {
    try {
      await snoozeDose(doseId);
      setActiveNotification(null);
      
      toast({
        title: "Reminder snoozed",
        description: "We'll remind you again in 10 minutes",
        variant: "default",
      });
    } catch (error) {
      console.error('Error snoozing dose:', error);
      toast({
        title: "Error",
        description: "Could not snooze your reminder",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="container mx-auto px-4 pb-24 max-w-md">
        <AppHeader onSettingsClick={handleSettingsClick} />
        
        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
        
        <div className="overflow-y-auto main-scrollable-content" style={{height: 'calc(100vh - 180px)'}}>
          {activeTab === 'today' && (
            <TodayTab onAddMedicationClick={handleAddMedicationClick} />
          )}
          
          {activeTab === 'schedule' && (
            <ScheduleTab onAddMedicationClick={handleAddMedicationClick} />
          )}
          
          {activeTab === 'history' && (
            <HistoryTab />
          )}
        </div>
        
        <BottomNavigation 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onAddClick={handleAddMedicationClick}
          onSettingsClick={handleSettingsClick}
        />
      </div>
      
      {showSettingsScreen && (
        <SettingsScreen onBack={() => setShowSettingsScreen(false)} />
      )}
      
      {showAddMedicationScreen && (
        <AddMedicationScreen 
          onBack={handleBackFromAddMedication}
          onContinueToSchedule={handleContinueToSchedule}
        />
      )}
      
      {showScheduleSetupScreen && currentMedicationId && (
        <ScheduleSetupScreen 
          medicationId={currentMedicationId}
          onBack={handleBackFromSchedule}
          onComplete={handleScheduleComplete}
        />
      )}
      
      {activeNotification && (
        <MedicationNotification 
          dose={activeNotification}
          onConfirm={handleConfirmDose}
          onSnooze={handleSnoozeDose}
          onClose={() => setActiveNotification(null)}
        />
      )}
    </div>
  );
};

export default Home;