/**
 * Time override utility for MediTrack
 * 
 * This allows developers to override the current time for testing notifications
 * and schedules without waiting for actual time to pass.
 */

// Store the override time if set
let overrideTime: Date | null = null;
let overrideTimestamp: number | null = null;

// Original Date constructor for restoration
const OriginalDate = Date;
const OriginalNow = Date.now;

/**
 * Sets a time override that will affect all Date.now() calls
 * @param isoTimeString ISO string representation of the time to set as "now"
 */
export function setTimeOverride(isoTimeString: string): void {
  // Parse the ISO time string into a Date object
  overrideTime = new Date(isoTimeString);
  
  // Store the original timestamp for calculating offsets
  overrideTimestamp = overrideTime.getTime();
  
  // Override the Date.now() method
  // @ts-ignore - Redefining method
  Date.now = function() {
    return overrideTimestamp!;
  };
  
  // Create a proxy for the Date constructor
  const dateConstructor: any = function(this: any, ...args: any[]) {
    if (args.length === 0) {
      // When called with no arguments, use our override time
      return new OriginalDate(overrideTimestamp!);
    }
    // Otherwise pass arguments to the original Date constructor
    // Handle each argument individually to avoid spread operator issues
    if (args.length === 1) {
      return new OriginalDate(args[0]);
    } else if (args.length === 2) {
      return new OriginalDate(args[0], args[1]);
    } else if (args.length === 3) {
      return new OriginalDate(args[0], args[1], args[2]);
    } else if (args.length === 4) {
      return new OriginalDate(args[0], args[1], args[2], args[3]);
    } else if (args.length === 5) {
      return new OriginalDate(args[0], args[1], args[2], args[3], args[4]);
    } else if (args.length === 6) {
      return new OriginalDate(args[0], args[1], args[2], args[3], args[4], args[5]);
    } else {
      return new OriginalDate(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
    }
  };
  
  // Copy all properties from the original Date to our constructor
  Object.setPrototypeOf(dateConstructor, OriginalDate);
  dateConstructor.prototype = OriginalDate.prototype;
  
  // Replace the global Date object
  // @ts-ignore - Redefining global
  global.Date = dateConstructor;
  
  console.log(`Time override set to: ${overrideTime.toLocaleString()}`);
}

/**
 * Clears the time override and restores the original Date behavior
 */
export function clearTimeOverride(): void {
  if (overrideTime) {
    // @ts-ignore - Restoring global Date object
    global.Date = OriginalDate;
    // Restore original Date.now
    Date.now = OriginalNow;
    overrideTime = null;
    overrideTimestamp = null;
    console.log("Time override cleared, using system time");
  }
}

/**
 * Returns the current override status
 */
export function getTimeOverrideStatus(): { active: boolean; currentOverride: string | null } {
  return {
    active: overrideTime !== null,
    currentOverride: overrideTime?.toISOString() || null
  };
}

/**
 * Process command line arguments for time override
 * Looks for --currentTime="2025-05-08T14:30:00Z" format
 */
export function processTimeOverrideFromArgs(): void {
  // Check for command line arguments
  const args = process.argv;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--currentTime=')) {
      const timeString = arg.split('=')[1].replace(/"/g, '');
      setTimeOverride(timeString);
      break;
    }
  }
}

// Initialize on import - check for command line args
processTimeOverrideFromArgs();

// Export the current time function that respects overrides
export function getCurrentTime(): Date {
  return new Date();
}