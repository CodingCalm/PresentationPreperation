
import React, { useState, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FaMicrophone, FaStopCircle, FaTrash } from 'react-icons/fa';
import { AudioRecorderRefActions } from '../types';

interface AudioRecorderProps {
  onAudioRecorded: (blob: Blob | null) => void;
  disabled?: boolean;
  showPrimaryStartButton?: boolean;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

const AudioRecorder = forwardRef<AudioRecorderRefActions, AudioRecorderProps>(
  ({ onAudioRecorded, disabled, showPrimaryStartButton = true, onRecordingStateChange }, ref) => {
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async () => {
      setError(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      onAudioRecorded(null); 
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
          };

          mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            onAudioRecorded(audioBlob);
            stream.getTracks().forEach(track => track.stop()); // Stop tracks after blob creation
            setIsRecording(false); // Ensure state is updated
            onRecordingStateChange?.(false);
          };

          mediaRecorderRef.current.start();
          setIsRecording(true);
          onRecordingStateChange?.(true);
        } catch (err) {
          console.error('Fel vid åtkomst till mikrofon:', err);
          setError('Mikrofonåtkomst nekad eller ej tillgänglig. Kontrollera behörigheter.');
          setIsRecording(false);
          onRecordingStateChange?.(false);
        }
      } else {
        setError('Ljudinspelning stöds inte av din webbläsare.');
        setIsRecording(false);
        onRecordingStateChange?.(false);
      }
    }, [audioUrl, onAudioRecorded, onRecordingStateChange]);

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        // setIsRecording(false) and onRecordingStateChange(false) are handled in onstop
      }
    }, [isRecording]);

    const resetRecording = useCallback(() => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current.stop(); // This will trigger onstop which handles cleanup
      } else if (mediaRecorderRef.current?.stream) { // If not recording but stream exists
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(null);
      onAudioRecorded(null); // Important: clear App.tsx state
      setError(null);
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      setIsRecording(false); 
      onRecordingStateChange?.(false);
    }, [audioUrl, onAudioRecorded, onRecordingStateChange, isRecording]);
    
    useImperativeHandle(ref, () => ({
      triggerStartRecording: () => {
        startRecording();
      }
    }));

    React.useEffect(() => {
      return () => {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    }, [audioUrl]);


    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center space-x-3">
          {showPrimaryStartButton && !isRecording && (
            <button
              onClick={startRecording}
              disabled={disabled || isRecording}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <FaMicrophone className="mr-2" /> Starta Inspelning
            </button>
          )}
          {isRecording && (
            <button
              onClick={stopRecording}
              disabled={!isRecording} 
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md flex items-center disabled:opacity-50 transition-colors duration-150"
            >
              <FaStopCircle className="mr-2" /> Stoppa Inspelning
            </button>
          )}
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {audioUrl && !isRecording && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg shadow flex flex-col sm:flex-row items-center justify-between gap-3">
            <audio controls src={audioUrl} className="w-full sm:w-auto flex-grow">
              Din webbläsare stöder inte ljudelementet.
            </audio>
            <button
              onClick={resetRecording}
              disabled={isRecording} // Should not be possible to click if isRecording is true, but good practice
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md flex items-center text-sm transition-colors duration-150"
              title="Rensa inspelning och analys"
            >
              <FaTrash className="mr-1 sm:mr-2" /> Rensa
            </button>
          </div>
        )}
      </div>
    );
  }
);

export default AudioRecorder;