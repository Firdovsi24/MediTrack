/**
 * Utility functions for playing sounds in the MediTrack application.
 * Optimized for elderly users with gentle, calming sounds.
 */

// Sound file paths
const SOUNDS = {
  notification: '/sounds/soft-notification2.mp3',  // Gentle notification sound
  confirmation: '/sounds/piano-confirmation.mp3',  // Gentle confirmation sound
  gentleAlert: '/sounds/gentle-notification.mp3',   // Alternative gentle alert
  softConfirm: '/sounds/soft-confirmation.mp3'     // Alternative confirmation sound
};

// Cache audio elements to avoid recreating them
const audioCache: Record<string, HTMLAudioElement> = {};

/**
 * Play a sound with error handling and auto-play restrictions workaround
 * 
 * @param soundKey - Key of the sound to play from the SOUNDS object
 * @param volume - Volume level between 0 and 1 (default 0.8)
 * @returns Promise that resolves when the sound starts playing or rejects on error
 */
export function playSound(soundKey: keyof typeof SOUNDS, volume = 0.8): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Get or create audio element
      let audio = audioCache[soundKey];
      if (!audio) {
        audio = new Audio();
        audio.src = SOUNDS[soundKey];
        audioCache[soundKey] = audio;
      }
      
      // Reset audio to beginning if it was playing
      audio.currentTime = 0;
      audio.volume = volume;
      audio.loop = false;
      
      // Force the audio to load before playing
      audio.load();
      
      // Play with user interaction workaround if needed
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Sound '${soundKey}' played successfully`);
          resolve();
        }).catch(err => {
          console.warn(`Auto-play prevented for sound '${soundKey}'. Error:`, err);
          
          // Set up event listeners to play on first user interaction (browsers require this)
          const playOnInteraction = () => {
            audio.play()
              .then(() => {
                console.log(`Sound '${soundKey}' played after user interaction`);
                resolve();
              })
              .catch(error => {
                console.error(`Failed to play sound '${soundKey}' after user interaction:`, error);
                reject(error);
              })
              .finally(() => {
                // Clean up event listeners
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
              });
          };
          
          // Add event listeners for various user interactions
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('keydown', playOnInteraction, { once: true });
          document.addEventListener('touchstart', playOnInteraction, { once: true });
        });
      }
    } catch (error) {
      console.error(`Error creating audio for sound '${soundKey}':`, error);
      reject(error);
    }
  });
}

/**
 * Play notification sound
 * @param volume Optional volume (0.0 to 1.0)
 */
export function playNotificationSound(volume = 0.8): Promise<void> {
  return playSound('notification', volume);
}

/**
 * Play confirmation sound
 * @param volume Optional volume (0.0 to 1.0)
 */
export function playConfirmationSound(volume = 0.8): Promise<void> {
  return playSound('confirmation', volume);
}

/**
 * Preload sounds for faster playback
 */
export function preloadSounds(): void {
  Object.keys(SOUNDS).forEach(key => {
    const soundKey = key as keyof typeof SOUNDS;
    const audio = new Audio();
    audio.src = SOUNDS[soundKey];
    audio.preload = 'auto';
    audioCache[soundKey] = audio;
    
    // Just load it, don't play
    audio.load();
  });
  
  console.log('Preloaded MediTrack sounds');
}