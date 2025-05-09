/**
 * Email service for MediTrack
 * This module provides functionality to send medication updates to caregivers
 * 
 * The email service uses a server-side API to send emails, making it easier for elderly users
 * who may have difficulty navigating email clients.
 */

// No external imports needed for fetch

/**
 * Interface for medication details passed to the email notification
 */
interface MedicationDetails {
  name: string;
  dosage?: string;
  time: Date;
}

/**
 * Send a caregiver notification email using the server API
 * 
 * @param caregiverEmail - Email address of the caregiver
 * @param userName - Name of the user (patient)
 * @param action - Whether the medication was 'taken' or 'snoozed'
 * @param medicationDetails - Details about the medication
 * @returns Promise resolving to a success boolean
 */
export const sendCaregiverEmail = async (
  caregiverEmail: string,
  userName: string,
  action: 'taken' | 'snoozed',
  medicationDetails: MedicationDetails
): Promise<boolean> => {
  try {
    // Prepare the request payload
    const payload = {
      to: caregiverEmail,
      userName: userName,
      action: action,
      medicationName: medicationDetails.name,
      medicationDosage: medicationDetails.dosage,
      time: medicationDetails.time.toISOString()
    };

    // Call the server API to send the email
    const response = await fetch('/api/send-caregiver-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Check if the email was sent successfully
    if (response.ok) {
      const data = await response.json();
      console.log('Caregiver notification email sent successfully');
      return true;
    } else {
      console.error('Failed to send caregiver notification email:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending caregiver notification email:', error);
    return false;
  }
};

/**
 * Notify the caregiver automatically about medication action
 * 
 * @param caregiverEmail - Email address of the caregiver
 * @param userName - Name of the user (patient)
 * @param action - Whether the medication was 'taken' or 'snoozed'
 * @param medicationDetails - Details about the medication
 * @returns Promise resolving when the notification has been sent or attempted
 */
export const notifyCaregiverAutomatically = async (
  caregiverEmail: string,
  userName: string,
  action: 'taken' | 'snoozed',
  medicationDetails: MedicationDetails
): Promise<void> => {
  // Send the email without asking for confirmation
  const success = await sendCaregiverEmail(
    caregiverEmail,
    userName,
    action,
    medicationDetails
  );
  
  // Show feedback to the user
  if (success) {
    // Display a brief toast or message indicating the email was sent
    console.log(`Caregiver (${caregiverEmail}) has been notified`);
    
    // Optional: Could add a toast notification here instead of console log
    // toast({
    //   title: "Notification Sent",
    //   description: `Caregiver has been notified about your medication`,
    //   variant: "success"
    // });
  } else {
    // Log the error but don't show a disruptive alert to elderly users
    console.error('Could not send notification to caregiver');
    
    // Simply log it without showing alert as it's not critical for the app's functionality
    // The medication tracking still works even if email fails
    
    // If you want to show feedback, use a less intrusive method like:
    // toast({
    //   title: "Notification Issue",
    //   description: "Unable to send caregiver notification right now.",
    //   variant: "destructive"
    // });
  }
};