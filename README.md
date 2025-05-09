# MediTrack: AI-Powered Medication Management

<div align="center">
  <img src="attached_assets/logo.png" alt="MediTrack Logo" width="200">
  <h3>Smart medication management for seniors</h3>
</div>

## 📋 Overview

MediTrack is an AI-powered medication management application designed specifically to support elderly users in tracking and managing their prescriptions with precision and personalized care. This web application focuses on accessibility, simplicity, and reliability to ensure seniors can independently manage their medications.

### 🎯 Purpose

MediTrack addresses the challenges many seniors face with medication adherence:
- Managing multiple medications with different schedules
- Remembering when to take specific medications
- Keeping track of medication history
- Maintaining accurate medication information

## ✨ Key Features

### 📱 User-Friendly Interface
- Large, readable text and high-contrast design
- Simple, intuitive navigation with tab-based layout
- PIN protection for privacy and security

### 📷 AI-Powered Medication Recognition
- Camera-based medication identification
- Automatic extraction of medication details from photos
- Gemini Vision-powered image analysis

### ⏰ Smart Reminders
- Customizable medication schedules
- Timely notifications with sound alerts
- Options to take or snooze reminders

### 📊 Comprehensive Tracking
- Medication history with status tracking
- Daily, weekly, and monthly views
- Clear visualization of medication adherence

### 👴👵 Accessibility Features
- High-contrast mode for vision impairments
- Large, touchable UI elements
- Simplified workflows for users with limited tech experience

### 👨‍⚕️ Caregiver Support
- Automatic email notifications to caregivers
- Medication adherence monitoring
- Real-time updates on medication status

## 🔧 Technologies Used

- **Frontend**: TypeScript, React, Tailwind CSS
- **State Management**: React Context API, React Query
- **Storage**: IndexedDB for offline capabilities
- **Notifications**: Web Notifications API
- **Image Processing**: Google Gemini Vision API
- **Email Notifications**: SendGrid API
- **Security**: PIN-based authentication

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later)
- API keys for:
  - Google Gemini Vision API (for image recognition)
  - SendGrid (for caregiver email notifications)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/meditrack.git
   cd meditrack
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory with:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=your_verified_sender_email
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:5000`

## 📱 Usage

### Setting Up Medications

1. Tap the "Add Medication" button in the Schedule tab
2. Either manually enter medication details or take a photo of the medication label
3. Set up the schedule with frequency and timing options
4. Review and confirm the medication details

### Managing Medications

- **View Schedule**: Check the Today or Schedule tabs to see upcoming doses
- **Take Medication**: Mark medications as taken through notifications or the Today tab
- **View History**: See your medication history in the History tab
- **Edit/Delete**: Modify or remove medications as needed

### Customizing Settings

- Configure notification preferences
- Adjust sound settings
- Enable/disable PIN protection
- Set up caregiver email notifications

## 🤝 Contributing

Contributions to MediTrack are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support, email support@meditrack.com or open an issue on the GitHub repository.

---

<div align="center">
  <p>Built with ❤️ for enhancing elderly medication management</p>
</div>