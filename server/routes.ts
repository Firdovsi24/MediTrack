import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fetch from "node-fetch";

// OpenAI API response type
interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// We're not using server-side storage for this app since all data is stored locally in the browser
// But we're implementing a minimal API structure to maintain Express app compatibility and to proxy API calls to OpenAI

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a health check route
  app.get('/api/health', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    res.json({ 
      status: 'ok', 
      message: 'Server is running',
      openai_configured: !!apiKey 
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
  
  // OpenAI Vision API proxy endpoint
  app.post('/api/analyze-medication-image', async (req: Request, res: Response) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }
      
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'OpenAI API key is not configured' });
      }
      
      // Calculate approximate size for logging
      const approximateSizeInMB = (Math.ceil((image.length * 3) / 4) / (1024 * 1024)).toFixed(2);
      console.log(`Received image for analysis, size: ~${approximateSizeInMB}MB`);
      
      // Use the newer gpt-4o model which supports vision capabilities and has better performance
      // It also has a larger context window which helps with handling larger images
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: "You are a medication information extractor. Your job is to analyze medication labels and extract key details in a structured format."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "This is a medication label. Extract the following information: Medication name, dosage (amount, like 50mg), and instructions for use (like 'Take once daily'). Format the result in plain text with each piece of information on a new line with labels, like this:\nMedication Name: [name]\nDosage: [dosage]\nInstructions: [instructions]\nIf you can't identify an item, write 'Unknown' as the value."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500 // Increase token limit for more detailed responses
        })
      });
      
      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API Error:', errorText);
        return res.status(openAIResponse.status).json({ error: `OpenAI API Error: ${errorText}` });
      }
      
      const openAIData = await openAIResponse.json() as OpenAIResponse;
      
      if (!openAIData.choices || !openAIData.choices[0] || !openAIData.choices[0].message) {
        console.error('Unexpected OpenAI response format:', openAIData);
        return res.status(500).json({ error: 'Invalid response from OpenAI API' });
      }
      
      const result = openAIData.choices[0].message.content.trim();
      console.log('OpenAI Response:', result);
      
      return res.json({ result });
    } catch (error) {
      console.error('Error analyzing medication image:', error);
      res.status(500).json({ error: 'Failed to analyze image: ' + (error as Error).message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
