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
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Add a root route that redirects to the client app
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'MediTrack API is running',
      info: 'This application stores all data locally in your browser. No data is sent to the server except for image analysis.'
    });
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
      
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "This is a medication label. Extract the following information: Medication name, dosage (amount, like 50mg), and instructions for use (like 'Take once daily'). Format the result as plain text with each item on a new line. If you can't identify an item, indicate with 'Unknown'."
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
          max_tokens: 300
        })
      });
      
      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error('OpenAI API Error:', errorText);
        return res.status(openAIResponse.status).json({ error: `OpenAI API Error: ${errorText}` });
      }
      
      const openAIData = await openAIResponse.json() as OpenAIResponse;
      const result = openAIData.choices[0].message.content.trim();
      
      return res.json({ result });
    } catch (error) {
      console.error('Error analyzing medication image:', error);
      res.status(500).json({ error: 'Failed to analyze image' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
