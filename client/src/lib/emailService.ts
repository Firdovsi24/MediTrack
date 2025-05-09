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
  try {
    // First attempt to use the server API to send the email
    const success = await sendCaregiverEmail(
      caregiverEmail,
      userName,
      action,
      medicationDetails
    );
    
    // If server API method succeeded
    if (success) {
      console.log(`Caregiver (${caregiverEmail}) has been notified via API`);
      return;
    }
    
    // If API failed, create a fallback using mailto: links
    // This ensures elderly users can still notify caregivers even if the SendGrid API has issues
    console.log("Server email failed, creating mailto: link fallback");
    
    // Format the time for display
    const timeFormatted = medicationDetails.time.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format the date for display
    const dateFormatted = medicationDetails.time.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create subject line
    const subject = `Medication ${action === 'taken' ? 'Taken' : 'Snoozed'}: ${medicationDetails.name}`;
    
    // Create email body
    let body = `Hello,\n\n`;
    body += `This is an automated message to inform you that ${userName} has `;
    
    if (action === 'taken') {
      body += `taken their medication: ${medicationDetails.name}`;
      if (medicationDetails.dosage) {
        body += ` (${medicationDetails.dosage})`;
      }
    } else {
      body += `snoozed the reminder for: ${medicationDetails.name}`;
      if (medicationDetails.dosage) {
        body += ` (${medicationDetails.dosage})`;
      }
      body += `\nThe medication will be reminded again in 10 minutes.`;
    }
    
    body += `\n\nTime: ${timeFormatted} on ${dateFormatted}\n\n`;
    body += `This is an automated message from the MediTrack medication reminder application.\n`;
    body += `Please do not reply to this email.`;
    
    // Create mailto link with encoded subject and body
    const mailtoLink = `mailto:${encodeURIComponent(caregiverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Ask user if they want to open their email client
    if (confirm(`Would you like to notify your caregiver that you've ${action} your medication?`)) {
      window.open(mailtoLink, '_blank');
      console.log(`Opened mailto: link for caregiver notification`);
    }
    
  } catch (error) {
    console.error('Error in caregiver notification process:', error);
    // We don't show errors to elderly users as it might confuse them
    // The medication tracking functionality will still work correctly
  }
};