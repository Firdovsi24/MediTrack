import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Medication, Schedule, Dose } from '@shared/schema';
import { getCurrentTime } from './timeUtils';

interface MediRemindDB extends DBSchema {
  medications: {
    key: string;
    value: Medication;
    indexes: { 'by-name': string };
  };
  schedules: {
    key: string;
    value: Schedule;
    indexes: { 'by-medication': string };
  };
  doses: {
    key: string;
    value: Dose;
    indexes: { 
      'by-medication': string;
      'by-schedule': string;
      'by-status': string;
      'by-date': Date;
    };
  };
  settings: {
    key: string;
    value: {
      hasVisitedBefore: boolean;
      pinProtection: boolean;
      pin: string;
      highContrast: boolean;
      notificationsEnabled: boolean;
      userName: string;
      caregiverEmail: string;
      notifyCaregiverEnabled: boolean;
      // Sound settings
      volume: number;
      notificationSoundKey: string;
      confirmationSoundKey: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<MediRemindDB>>;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MediRemindDB>('medremind-db', 1, {
      upgrade(db) {
        const medicationStore = db.createObjectStore('medications', { keyPath: 'id' });
        medicationStore.createIndex('by-name', 'name');

        const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
        scheduleStore.createIndex('by-medication', 'medicationId');

        const doseStore = db.createObjectStore('doses', { keyPath: 'id' });
        doseStore.createIndex('by-medication', 'medicationId');
        doseStore.createIndex('by-schedule', 'scheduleId');
        doseStore.createIndex('by-status', 'status');
        doseStore.createIndex('by-date', 'scheduledTime');

        db.createObjectStore('settings');
      },
    });
  }
  return dbPromise;
}

// Settings functions
export async function getSettings() {
  const db = await getDB();
  const settings = await db.get('settings', 'appSettings') || {
    hasVisitedBefore: false,
    pinProtection: false,
    pin: '',
    highContrast: false,
    notificationsEnabled: true,
    userName: '',
    caregiverEmail: '',
    notifyCaregiverEnabled: false,
    // Default sound settings
    volume: 0.8,
    notificationSoundKey: 'notification',  // Default to slow bell chime
    confirmationSoundKey: 'confirmation',  // Default to achievement chime
  };
  return settings;
}

export async function updateSettings(settings: Partial<{
  hasVisitedBefore: boolean;
  pinProtection: boolean;
  pin: string;
  highContrast: boolean;
  notificationsEnabled: boolean;
  userName: string;
  caregiverEmail: string;
  notifyCaregiverEnabled: boolean;
  // Sound settings
  volume: number;
  notificationSoundKey: string;
  confirmationSoundKey: string;
}>) {
  const db = await getDB();
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...settings };
  await db.put('settings', updatedSettings, 'appSettings');
  return updatedSettings;
}

// Medications functions
export async function getAllMedications(): Promise<Medication[]> {
  const db = await getDB();
  return db.getAll('medications');
}

export async function getMedication(id: string): Promise<Medication | undefined> {
  const db = await getDB();
  return db.get('medications', id);
}

export async function saveMedication(medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Promise<Medication> {
  const db = await getDB();
  const now = new Date();
  const newMed: Medication = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...medication
  };
  await db.put('medications', newMed);
  return newMed;
}

export async function updateMedication(id: string, medication: Partial<Omit<Medication, 'id' | 'createdAt'>>): Promise<Medication | undefined> {
  const db = await getDB();
  const existingMed = await getMedication(id);
  if (!existingMed) return undefined;
  
  const updatedMed: Medication = {
    ...existingMed,
    ...medication,
    updatedAt: new Date()
  };
  await db.put('medications', updatedMed);
  return updatedMed;
}

export async function deleteMedication(id: string): Promise<boolean> {
  const db = await getDB();
  // Delete associated schedules and doses first
  const schedules = await db.getAllFromIndex('schedules', 'by-medication', id);
  for (const schedule of schedules) {
    await deleteSchedule(schedule.id);
  }
  
  await db.delete('medications', id);
  return true;
}

// Schedules functions
export async function getSchedulesForMedication(medicationId: string): Promise<Schedule[]> {
  const db = await getDB();
  return db.getAllFromIndex('schedules', 'by-medication', medicationId);
}

export async function getSchedule(id: string): Promise<Schedule | undefined> {
  const db = await getDB();
  return db.get('schedules', id);
}

export async function saveSchedule(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
  const db = await getDB();
  const newSchedule: Schedule = {
    id: crypto.randomUUID(),
    ...schedule
  };
  await db.put('schedules', newSchedule);
  return newSchedule;
}

export async function updateSchedule(id: string, schedule: Partial<Omit<Schedule, 'id'>>): Promise<Schedule | undefined> {
  const db = await getDB();
  const existingSchedule = await getSchedule(id);
  if (!existingSchedule) return undefined;
  
  const updatedSchedule: Schedule = {
    ...existingSchedule,
    ...schedule
  };
  await db.put('schedules', updatedSchedule);
  return updatedSchedule;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const db = await getDB();
  // Delete associated doses first
  const doses = await db.getAllFromIndex('doses', 'by-schedule', id);
  for (const dose of doses) {
    await db.delete('doses', dose.id);
  }
  
  await db.delete('schedules', id);
  return true;
}

// Doses functions
export async function getDosesForDay(date: Date): Promise<Dose[]> {
  const db = await getDB();
  const allDoses = await db.getAll('doses');
  
  // Filter doses for the specific day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return allDoses.filter(dose => 
    dose.scheduledTime >= startOfDay && dose.scheduledTime <= endOfDay
  ).sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
}

export async function getAllDoses(): Promise<Dose[]> {
  const db = await getDB();
  const allDoses = await db.getAll('doses');
  return allDoses;
}

export async function getDosesForMedication(medicationId: string): Promise<Dose[]> {
  const db = await getDB();
  return db.getAllFromIndex('doses', 'by-medication', medicationId);
}

export async function getDose(id: string): Promise<Dose | undefined> {
  const db = await getDB();
  return db.get('doses', id);
}

export async function saveDose(dose: Omit<Dose, 'id'>): Promise<Dose> {
  const db = await getDB();
  const newDose: Dose = {
    id: crypto.randomUUID(),
    ...dose
  };
  await db.put('doses', newDose);
  return newDose;
}

export async function updateDose(id: string, dose: Partial<Omit<Dose, 'id'>>): Promise<Dose | undefined> {
  const db = await getDB();
  const existingDose = await getDose(id);
  if (!existingDose) return undefined;
  
  const updatedDose: Dose = {
    ...existingDose,
    ...dose
  };
  await db.put('doses', updatedDose);
  return updatedDose;
}

export async function deleteDose(id: string): Promise<boolean> {
  const db = await getDB();
  await db.delete('doses', id);
  return true;
}

// Generate upcoming doses for a schedule (create upcoming doses for the next 30 days)
export async function generateDosesForSchedule(schedule: Schedule, medication: Medication): Promise<Dose[]> {
  const db = await getDB();
  const generatedDoses: Dose[] = [];
  
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const startDate = new Date(schedule.startDate);
  const endDate = schedule.endDate ? new Date(schedule.endDate) : thirtyDaysFromNow;
  
  if (!schedule.active || startDate > thirtyDaysFromNow || endDate < now) {
    return generatedDoses; // Schedule not active or out of range
  }
  
  // Generate all doses
  const currentDate = new Date(Math.max(startDate.getTime(), now.getTime()));
  while (currentDate <= endDate) {
    let shouldCreateDose = false;
    
    // Check if should create dose based on frequency
    switch (schedule.frequency) {
      case 'daily':
        shouldCreateDose = true;
        break;
      case 'multiple_daily':
        shouldCreateDose = true;
        break;
      case 'specific_days':
        if (schedule.specificDays && schedule.specificDays.includes(currentDate.getDay())) {
          shouldCreateDose = true;
        }
        break;
      case 'every_x_days':
        if (schedule.everyXDays) {
          const diffDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          shouldCreateDose = diffDays % schedule.everyXDays === 0;
        }
        break;
      case 'as_needed':
        shouldCreateDose = false; // No regular doses for as-needed medications
        break;
    }
    
    if (shouldCreateDose) {
      // Create doses for each time of day
      for (const timeStr of schedule.times) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Only create future doses
        if (scheduledTime > now) {
          const newDose: Dose = {
            id: crypto.randomUUID(),
            medicationId: medication.id,
            scheduleId: schedule.id,
            status: 'pending',
            scheduledTime: scheduledTime,
            snoozeCount: 0
          };
          
          await db.put('doses', newDose);
          generatedDoses.push(newDose);
        }
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return generatedDoses;
}

// Export data
export async function exportData() {
  const db = await getDB();
  const medications = await db.getAll('medications');
  const schedules = await db.getAll('schedules');
  const doses = await db.getAll('doses');
  const settings = await getSettings();
  
  return {
    medications,
    schedules,
    doses,
    settings
  };
}

// Import data
export async function importData(data: {
  medications: Medication[];
  schedules: Schedule[];
  doses: Dose[];
  settings: any;
}) {
  const db = await getDB();
  const tx = db.transaction(['medications', 'schedules', 'doses', 'settings'], 'readwrite');
  
  // Clear existing data
  await tx.objectStore('medications').clear();
  await tx.objectStore('schedules').clear();
  await tx.objectStore('doses').clear();
  
  // Import new data
  for (const medication of data.medications) {
    await tx.objectStore('medications').put(medication);
  }
  
  for (const schedule of data.schedules) {
    await tx.objectStore('schedules').put(schedule);
  }
  
  for (const dose of data.doses) {
    await tx.objectStore('doses').put(dose);
  }
  
  await tx.objectStore('settings').put(data.settings, 'appSettings');
  
  await tx.done;
  return true;
}

// Clear all data
export async function clearAllData() {
  const db = await getDB();
  const tx = db.transaction(['medications', 'schedules', 'doses'], 'readwrite');
  
  await tx.objectStore('medications').clear();
  await tx.objectStore('schedules').clear();
  await tx.objectStore('doses').clear();
  
  await tx.done;
  return true;
}

// Clear all history (doses)
export async function clearAllHistory() {
  const db = await getDB();
  const tx = db.transaction(['doses'], 'readwrite');
  
  // Get all doses
  const doses = await db.getAll('doses');
  
  // Delete taken and missed doses
  for (const dose of doses) {
    if (dose.status === 'taken' || dose.status === 'missed') {
      await tx.objectStore('doses').delete(dose.id);
    }
  }
  
  await tx.done;
  return true;
}

// Delete doses by date range
export async function deleteDosesByDateRange(startDate: Date, endDate: Date) {
  const db = await getDB();
  const doses = await db.getAll('doses');
  
  // Filter doses by date range
  const dosesToDelete = doses.filter(dose => 
    dose.scheduledTime >= startDate && dose.scheduledTime <= endDate
  );
  
  // Delete filtered doses
  for (const dose of dosesToDelete) {
    await db.delete('doses', dose.id);
  }
  
  return dosesToDelete.length;
}
