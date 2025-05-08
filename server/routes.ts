import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";
import sgMail from '@sendgrid/mail';

// OpenAI API response type
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Gemini API response type
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// We're not using server-side storage for this app since all data is stored locally in the browser
// But we're implementing a minimal API structure to maintain Express app compatibility and to proxy API calls to AI services

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a health check route
  app.get('/api/health', (req, res) => {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      openai_configured: !!openaiKey,
      gemini_configured: !!geminiKey
    });
  });

  // Add a root route that redirects to the client app
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'MediTrack API is running',
      info: 'This application stores all data locally in your browser. No data is sent to the server except for image analysis.'
    });
  });
  
  // Add an OpenAI test route
  app.get('/api/openai-test', async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          success: false, 
          error: 'OpenAI API key is not configured' 
        });
      }
      
      // Make a simple text request to test the API connection
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: "Please return a short message confirming that OpenAI API is working correctly."
            }
          ],
          max_tokens: 50
        })
      });
      
      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API Test Error:', errorText);
        return res.status(openAIResponse.status).json({ 
          success: false, 
          error: `OpenAI API Error: ${errorText}` 
        });
      }
      
      const openAIData = await openAIResponse.json() as OpenAIResponse;
      const result = openAIData.choices[0].message.content.trim();
      
      res.json({ 
        success: true, 
        message: 'OpenAI API is working correctly', 
        response: result 
      });
    } catch (error) {
      console.error('Error testing OpenAI API:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to test OpenAI API: ' + (error as Error).message 
      });
    }
  });
  
  // Add a Gemini API test route
  app.get('/api/gemini-test', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ 
          success: false, 
          error: 'Gemini API key is not configured' 
        });
      }
      
      // Make a simple text request to test the API connection
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Please return a short message confirming that Gemini API is working correctly." }]
          }]
        })
      });
      
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Test Error:', errorText);
        return res.status(geminiResponse.status).json({ 
          success: false, 
          error: `Gemini API Error: ${errorText}` 
        });
      }
      
      const geminiData = await geminiResponse.json() as GeminiResponse;
      
      if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
        console.error('Unexpected Gemini response format:', geminiData);
        return res.status(500).json({ error: 'Invalid response from Gemini API' });
      }
      
      const result = geminiData.candidates[0].content.parts[0].text.trim();
      
      res.json({ 
        success: true, 
        message: 'Gemini API is working correctly', 
        response: result 
      });
    } catch (error) {
      console.error('Error testing Gemini API:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to test Gemini API: ' + (error as Error).message 
      });
    }
  });
  
  /**
   * Initialize SendGrid with API key
   */
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid API key configured');
  } else {
    console.warn('SendGrid API key not configured - email notifications will not work');
  }

  /**
   * Email notification endpoint
   * Handles sending email notifications to caregivers when medications are taken or snoozed
   */
  app.post('/api/send-caregiver-email', async (req: Request, res: Response) => {
    try {
      const { to, userName, action, medicationName, medicationDosage, time } = req.body;
      
      // Validate required fields
      if (!to || !userName || !action || !medicationName || !time) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }
      
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ 
          success: false, 
          error: 'SendGrid API key is not configured' 
        });
      }
      
      // Format the time for display
      const timeDate = new Date(time);
      const timeFormatted = timeDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Format the date for display
      const dateFormatted = timeDate.toLocaleDateString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Create subject line
      const subject = `Medication ${action === 'taken' ? 'Taken' : 'Snoozed'}: ${medicationName}`;
      
      // Create email body
      let bodyText = `Hello,\n\n`;
      bodyText += `This is an automated message to inform you that ${userName} has `;
      
      if (action === 'taken') {
        bodyText += `taken their medication: ${medicationName}`;
        if (medicationDosage) {
          bodyText += ` (${medicationDosage})`;
        }
      } else {
        bodyText += `snoozed the reminder for: ${medicationName}`;
        if (medicationDosage) {
          bodyText += ` (${medicationDosage})`;
        }
        bodyText += `\nThe medication will be reminded again in 10 minutes.`;
      }
      
      bodyText += `\n\nTime: ${timeFormatted} on ${dateFormatted}\n\n`;
      bodyText += `This is an automated message from the MediTrack medication reminder application.\n`;
      bodyText += `Please do not reply to this email.`;
      
      // Create HTML version of the email
      const bodyHtml = bodyText.replace(/\n/g, '<br>');
      
      // Prepare the email message
      const msg = {
        to,
        from: 'meditrack-notifications@example.com', // Replace with your validated sender
        subject,
        text: bodyText,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${bodyHtml}</div>`,
      };
      
      // Send the email
      console.log(`Sending ${action} notification email to ${to} for ${userName}`);
      await sgMail.send(msg);
      
      res.json({ 
        success: true, 
        message: 'Email notification sent successfully' 
      });
    } catch (error) {
      console.error('Error sending email notification:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send email notification: ' + (error as Error).message 
      });
    }
  });

  // Medication image analysis endpoint (using Gemini API)
  app.post('/api/analyze-medication-image', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured' });
      }
      
      // Calculate approximate size for logging
      const approximateSizeInMB = (Math.ceil((image.length * 3) / 4) / (1024 * 1024)).toFixed(2);
      console.log(`Received image for analysis, size: ~${approximateSizeInMB}MB`);
      
      // Prepare the request to Gemini API for image analysis
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                text: "This is a medication label. Extract the following information: Medication name, dosage (amount, like 50mg), and instructions for use (like 'Take once daily'). Format the result in plain text with each piece of information on a new line with labels, like this:\nMedication Name: [name]\nDosage: [dosage]\nInstructions: [instructions]\nIf you can't identify an item, write 'Unknown' as the value." 
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: image
                }
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.1
          }
        })
      });
      
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error:', errorText);
        return res.status(geminiResponse.status).json({ error: `Gemini API Error: ${errorText}` });
      }
      
      const geminiData = await geminiResponse.json() as GeminiResponse;
      
      if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
        console.error('Unexpected Gemini response format:', geminiData);
        return res.status(500).json({ error: 'Invalid response from Gemini API' });
      }
      
      const result = geminiData.candidates[0].content.parts[0].text.trim();
      console.log('Gemini Response:', result);
      
      return res.json({ result });
    } catch (error) {
      console.error('Error analyzing medication image:', error);
      res.status(500).json({ error: 'Failed to analyze image: ' + (error as Error).message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
