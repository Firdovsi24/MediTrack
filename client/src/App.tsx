import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { AppProvider } from "@/contexts/AppContext";
import PinLockScreen from "@/components/PinLockScreen";
import WelcomeScreen from "@/components/WelcomeScreen";
import { getSettings, updateSettings } from "@/lib/storage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showPinLock, setShowPinLock] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if PIN protection is enabled
    const checkSettings = async () => {
      const settings = await getSettings();
      const hasPinProtection = Boolean(settings.pinProtection && settings.pin);
      
      // Always skip welcome screen
      setShowWelcome(false);
      setShowPinLock(hasPinProtection);
      setPinVerified(!hasPinProtection);
      setLoading(false);
      
      // Mark as visited if it's first time
      if (!settings.hasVisitedBefore) {
        await updateSettings({ hasVisitedBefore: true });
      }
    };
    
    checkSettings();
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  const handlePinVerified = () => {
    setShowPinLock(false);
    setPinVerified(true);
  };

  // Show loading state while checking settings
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Show welcome screen for first time users
  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  // Show PIN lock screen if PIN protection is enabled
  if (showPinLock && !pinVerified) {
    return <PinLockScreen onVerified={handlePinVerified} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
