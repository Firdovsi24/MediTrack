/**
 * Email service for MediTrack
 * This module provides functionality to send medication updates to caregivers
 */

/**
 * Generate a mailto link that opens the default email client with a pre-filled email
 */
export const generateCaregiverEmailLink = (
  caregiverEmail: string,
  userName: string,
  action: 'taken' | 'snoozed',
  medicationDetails: {
    name: string;
    dosage?: string;
    time: Date;
  }
): string => {
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
  return `mailto:${encodeURIComponent(caregiverEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/**
 * Prompt to send a caregiver email notification
 */
export const promptCaregiverNotification = async (
  caregiverEmail: string,
  userName: string,
  action: 'taken' | 'snoozed',
  medicationDetails: {
    name: string;
    dosage?: string;
    time: Date;
  }
): Promise<void> => {
  // Generate mailto link
  const mailtoLink = generateCaregiverEmailLink(
    caregiverEmail,
    userName,
    action,
    medicationDetails
  );
  
  // Ask user if they want to send the notification
  if (confirm(`Would you like to notify your caregiver that you've ${action} your medication?`)) {
    // Open the email client
    window.open(mailtoLink, '_blank');
  }
};