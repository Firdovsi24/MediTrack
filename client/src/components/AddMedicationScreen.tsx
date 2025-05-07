import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { processMedicationImage, ExtractedMedicationData } from "@/lib/tesseract";
import { saveMedication } from "@/lib/storage";
import { medicationFormSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

interface AddMedicationScreenProps {
  onBack: () => void;
  onContinueToSchedule: (medicationId: string) => void;
}

const AddMedicationScreen = ({ onBack, onContinueToSchedule }: AddMedicationScreenProps) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      name: '',
      dosage: '',
      instructions: ''
    }
  });

  useEffect(() => {
    return () => {
      // Clean up camera stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraActive(true);
      setImagePreview(null);
      setIsManualEntry(false);
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        toast({
          title: "Camera Error",
          description: "Your browser doesn't support camera access. Try uploading an image instead.",
          variant: "destructive",
        });
        setCameraActive(false);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Denied",
        description: "Could not access your camera. Please check permissions or try uploading an image.",
        variant: "destructive",
      });
      setCameraActive(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setImagePreview(imageDataUrl);
    
    // Stop camera stream
    const tracks = (video.srcObject as MediaStream).getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
    setCameraActive(false);
    
    // Process image
    processImageData(imageDataUrl);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target && event.target.result) {
        const imageDataUrl = event.target.result as string;
        setImagePreview(imageDataUrl);
        setCameraActive(false);
        
        // Process image
        processImageData(file);
      }
    };
    
    reader.readAsDataURL(file);
  };

  const processImageData = async (imageData: string | File) => {
    try {
      setIsProcessing(true);
      
      // If imageData is a string (data URL), convert it to a blob
      let imageFile: File;
      if (typeof imageData === 'string') {
        const response = await fetch(imageData);
        const blob = await response.blob();
        imageFile = new File([blob], "captured-image.jpg", { type: "image/jpeg" });
      } else {
        imageFile = imageData;
      }
      
      // Process the image with OCR
      const extractedData: ExtractedMedicationData = await processMedicationImage(imageFile);
      
      // Pre-fill the form with extracted data
      if (extractedData.name) setValue('name', extractedData.name);
      if (extractedData.dosage) setValue('dosage', extractedData.dosage);
      if (extractedData.instructions) setValue('instructions', extractedData.instructions);
      
      toast({
        title: "Image Processed",
        description: "We've extracted information from your medication label. Please verify and make any necessary corrections.",
        variant: "default",
      });
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Error",
        description: "We couldn't extract information from the image. Please enter the details manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveMedicationData = async (data: { name: string; dosage: string; instructions?: string }) => {
    try {
      const newMedication = await saveMedication({
        name: data.name,
        dosage: data.dosage,
        instructions: data.instructions || '',
        imageUrl: imagePreview || undefined
      });
      
      onContinueToSchedule(newMedication.id);
    } catch (error) {
      console.error('Error saving medication:', error);
      toast({
        title: "Save Error",
        description: "There was a problem saving your medication. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-40">
      <div className="container mx-auto px-4 py-6 max-w-md h-full flex flex-col">
        <div className="flex items-center mb-6">
          <button onClick={onBack} className="p-2 mr-2">
            <i className="fas fa-arrow-left text-2xl"></i>
          </button>
          <h2 className="text-2xl font-bold">Add Medication</h2>
        </div>
        
        {!isManualEntry && (
          <>
            <div className="flex space-x-4 mb-6">
              <button 
                onClick={startCamera}
                className="flex-1 bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg transition flex justify-center items-center"
                disabled={isProcessing}
              >
                <i className="fas fa-camera mr-2"></i> Take Photo
              </button>
              <button 
                onClick={handleUploadClick}
                className="flex-1 bg-secondary hover:bg-gray-600 text-white font-bold py-4 px-4 rounded-lg transition flex justify-center items-center"
                disabled={isProcessing}
              >
                <i className="fas fa-upload mr-2"></i> Upload Image
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            
            <p className="text-center text-gray-600 mb-6">
              Take a photo of your medication bottle or upload an image
            </p>
          </>
        )}
        
        {/* Camera Preview */}
        {cameraActive && (
          <div className="bg-gray-200 rounded-xl overflow-hidden aspect-[4/3] mb-6 flex items-center justify-center">
            <video 
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            ></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button 
                onClick={captureImage}
                className="bg-primary hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition text-xl"
              >
                <i className="fas fa-camera"></i>
              </button>
            </div>
          </div>
        )}
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="bg-gray-200 rounded-xl overflow-hidden aspect-[4/3] mb-6">
            <img 
              src={imagePreview} 
              alt="Medication bottle preview" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-4 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
            <p className="text-gray-600">Processing image, please wait...</p>
          </div>
        )}
        
        {/* Medication Form */}
        <form 
          onSubmit={handleSubmit(saveMedicationData)} 
          className="flex-1 flex flex-col"
        >
          <div className="mb-4">
            <label htmlFor="medication-name" className="block text-lg font-medium mb-2">Medication Name</label>
            <input 
              {...register("name")}
              id="medication-name" 
              className={`w-full border-2 ${errors.name ? 'border-destructive' : 'border-gray-300'} rounded-lg px-4 py-3 text-lg`} 
              placeholder="e.g., Lisinopril"
            />
            {errors.name && (
              <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="medication-dosage" className="block text-lg font-medium mb-2">Dosage</label>
            <input 
              {...register("dosage")}
              id="medication-dosage" 
              className={`w-full border-2 ${errors.dosage ? 'border-destructive' : 'border-gray-300'} rounded-lg px-4 py-3 text-lg`}
              placeholder="e.g., 20mg"
            />
            {errors.dosage && (
              <p className="text-destructive text-sm mt-1">{errors.dosage.message}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="medication-instructions" className="block text-lg font-medium mb-2">Instructions</label>
            <input 
              {...register("instructions")}
              id="medication-instructions" 
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg"
              placeholder="e.g., Take 1 tablet daily"
            />
          </div>
          
          <div className="mt-auto">
            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 px-4 rounded-lg text-xl transition"
              disabled={isProcessing}
            >
              Continue to Schedule
            </button>
            
            {!isManualEntry && (
              <button 
                type="button" 
                onClick={() => setIsManualEntry(true)}
                className="w-full bg-white hover:bg-gray-100 text-primary font-bold py-4 px-4 rounded-lg text-xl mt-4 transition border-2 border-primary"
                disabled={isProcessing}
              >
                Enter Manually
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicationScreen;
