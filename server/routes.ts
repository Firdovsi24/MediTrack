import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// We're not using server-side storage for this app since all data is stored locally in the browser
// But we're implementing a minimal API structure to maintain Express app compatibility

export async function registerRoutes(app: Express): Promise<Server> {
  // Add a health check route
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
  });

  // Add a root route that redirects to the client app
  app.get('/api', (req, res) => {
    res.json({ 
      message: 'MediRemind API is running',
      info: 'This application stores all data locally in your browser. No data is sent to the server.'
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
