/**
 * Time utility functions for MediTrack
 */

// Store the override time if set
let overrideTimeOffset: number | null = null;

/**
 * Gets the current time, taking into account any time override
 */
export function getCurrentTime(): Date {
  if (overrideTimeOffset === null) {
    return new Date();
  }
  
  // Create a new date with the offset applied
  return new Date(Date.now() + overrideTimeOffset);
}

/**
 * Sets a time override by specifying an ISO time string
 * Will calculate the offset from now and apply that to all getCurrentTime calls
 */
export function setTimeOverride(isoTimeString: string): void {
  const targetTime = new Date(isoTimeString).getTime();
  const currentTime = Date.now();
  
  overrideTimeOffset = targetTime - currentTime;
  
  console.log(`Time override set to: ${new Date(targetTime).toLocaleString()}`);
  console.log(`Time offset: ${overrideTimeOffset}ms`);
}

/**
 * Clears any time override
 */
export function clearTimeOverride(): void {
  if (overrideTimeOffset !== null) {
    overrideTimeOffset = null;
    console.log("Time override cleared, using system time");
  }
}

/**
 * Returns the current override status
 */
export function getTimeOverrideStatus(): { active: boolean; currentOverrideTime: string | null } {
  if (overrideTimeOffset === null) {
    return { active: false, currentOverrideTime: null };
  }
  
  const currentOverrideTime = new Date(Date.now() + overrideTimeOffset);
  return { 
    active: true, 
    currentOverrideTime: currentOverrideTime.toISOString() 
  };
}

/**
 * Process command line arguments for time override
 * Looks for --currentTime="2025-05-08T14:30:00Z" format
 */
export function processTimeOverrideFromArgs(): void {
  // Only run this in Node.js environment
  if (typeof process !== 'undefined' && process.argv) {
    const args = process.argv;
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--currentTime=')) {
        const timeString = arg.split('=')[1].replace(/"/g, '');
        setTimeOverride(timeString);
        break;
      }
    }
  } else if (typeof window !== 'undefined') {
    // For browser, check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const timeOverride = urlParams.get('currentTime');
    
    if (timeOverride) {
      setTimeOverride(timeOverride);
    }
  }
}

// Initialize time override either from command line or URL params
processTimeOverrideFromArgs();