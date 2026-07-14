
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VocalDataPoint, PracticeMode, ChatMessage, AudioRecorderRefActions, WordMarkerPoint } from './types';
import ScriptGenerator from './components/ScriptGenerator';
import AudioRecorder from './components/AudioRecorder';
import PitchVisualizer from './components/PitchVisualizer';
import IntensityVisualizer from './components/IntensityVisualizer'; 
import ChatInterface from './components/ChatInterface';
import { generatePracticeScript, startOrContinueChat } from './services/geminiService';
import { blobToBase64 } from './utils/audioUtils'; 
import { FaLightbulb } from 'react-icons/fa';

const App: React.FC = () => {
  const [currentScript, setCurrentScript] = useState<string>('');
  const [scriptHint, setScriptHint] = useState<string>('');
  const [scriptObjective, setScriptObjective] = useState<string>('');
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [vocalData, setVocalData] = useState<VocalDataPoint[] | null>(null); 
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [wordMarkers, setWordMarkers] = useState<WordMarkerPoint[] | null>(null);
  
  const [currentPracticeMode, setCurrentPracticeMode] = useState<PracticeMode>(PracticeMode.SJÄLVSAKER);
  const [currentCustomInstructions, setCurrentCustomInstructions] = useState<string>('');

  const [base64Audio, setBase64Audio] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [hasChatBeenInitiatedForCurrentScript, setHasChatBeenInitiatedForCurrentScript] = useState<boolean>(false);
  const [isActuallyRecording, setIsActuallyRecording] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<WordMarkerPoint | null>(null);
  const audioRecorderRef = useRef<AudioRecorderRefActions>(null);


  const practiceModeToSwedishObjective = useCallback((mode: PracticeMode): string => {
    switch (mode) {
      case PracticeMode.SJÄLVSAKER: return "självsäker";
      case PracticeMode.FRÅGANDE: return "frågande";
      case PracticeMode.ENTUSIASTISK: return "entusiastisk";
      case PracticeMode.LUGN: return "lugn";
      case PracticeMode.BESTÄMD: return "bestämd";
      default:
        const _exhaustiveCheck: never = mode;
        return (_exhaustiveCheck as string).toLowerCase(); 
    }
  }, []);

  const practiceModeToEnglishPromptTerm = useCallback((mode: PracticeMode): string => {
    switch (mode) {
      case PracticeMode.SJÄLVSAKER: return "confident";
      case PracticeMode.FRÅGANDE: return "questioning";
      case PracticeMode.ENTUSIASTISK: return "enthusiastic";
      case PracticeMode.LUGN: return "calm";
      case PracticeMode.BESTÄMD: return "assertive";
      default:
        const _exhaustiveCheck: never = mode;
        return (_exhaustiveCheck as string).toLowerCase();
    }
  }, []);

  const handleNewScript = useCallback(async (practiceMode: PracticeMode, customInstructions?: string) => {
    setIsLoadingScript(true);
    setAudioBlob(null);
    setVocalData(null); 
    setWordMarkers(null);
    setBase64Audio(null); 
    setAudioMimeType(null); 
    setChatHistory([]); 
    setChatError(null);
    setAnalysisError(null);
    setHasChatBeenInitiatedForCurrentScript(false); 
    setIsActuallyRecording(false);
    setCurrentScript('');
    setScriptHint('');

    setCurrentPracticeMode(practiceMode);
    setCurrentCustomInstructions(customInstructions || '');

    try {
      const swedishObjectiveTerm = practiceModeToSwedishObjective(practiceMode);
      let objective = `Öva en ${swedishObjectiveTerm} ton.`;
      if (customInstructions && customInstructions.trim() !== '') {
        objective = `Öva en ${swedishObjectiveTerm} ton angående: "${customInstructions.trim()}".`;
      }
      
      const englishPromptTerm = practiceModeToEnglishPromptTerm(practiceMode);
      let fullPrompt: string;

      const commonJsonInstruction = `Generera ett JSON-objekt med två nycklar: "script" och "hint". "script" ska vara ett kort övningsmanus (2-3 meningar) på svenska. "hint" ska vara ett koncist (1 mening) tips på svenska, direkt relaterat till att öva detta specifika manus med den angivna tonen. Inkludera inte tipset inom manustexten. Se till att hela outputen är giltig JSON och att både manus och tips är på svenska.`;

      if (customInstructions && customInstructions.trim() !== '') {
        fullPrompt = `"script" ska handla om "${customInstructions.trim()}" för en ${englishPromptTerm} talton. ${commonJsonInstruction}`;
      } else {
        fullPrompt = `"script" ska vara utformat för att hjälpa någon att öva en ${englishPromptTerm} talton och vara lämpligt för övning av röstvariation. ${commonJsonInstruction}`;
      }
      
      const scriptResponseText = await generatePracticeScript(fullPrompt);
      
      let jsonStr = scriptResponseText.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim();
      }

      try {
        const parsedData = JSON.parse(jsonStr);
        if (parsedData && typeof parsedData.script === 'string' && typeof parsedData.hint === 'string') {
          setCurrentScript(parsedData.script);
          setScriptHint(parsedData.hint);
        } else {
          throw new Error("Ogiltigt JSON-format från AI: 'script' eller 'hint' saknas eller är inte strängar.");
        }
      } catch (e) {
        console.error('Misslyckades med att tolka JSON-svar för manus:', e, "Mottagen text:", scriptResponseText);
        setCurrentScript('Fel vid tolkning av manusdata. Försök igen. Om problemet kvarstår, kontrollera konsolen.');
        setScriptHint('Kunde inte ladda tips på grund av tolkningsfel.');
      }
      setScriptObjective(objective);

    } catch (error) {
      console.error('Misslyckades med att generera manus:', error);
      setCurrentScript('Kunde inte ladda manus. Kontrollera din API-nyckel och försök igen.');
      setScriptHint('Kunde inte ladda tips.');
      setScriptObjective('Fel vid manusgenerering');
    }
    setIsLoadingScript(false);
  }, [practiceModeToSwedishObjective, practiceModeToEnglishPromptTerm]);

  const analyzeRecordingAndContinueChat = useCallback(async (
    currentAudioData: string | null, 
    currentAudioMimeType: string | null,
    isFollowUp: boolean
  ) => {
    if (!currentScript) return;
    setIsChatLoading(true);
    setChatError(null);

    const toneDescription = practiceModeToSwedishObjective(currentPracticeMode);
    const customInstructionText = currentCustomInstructions ? ` angående ämnet: "${currentCustomInstructions}"` : "";
    const scriptHintText = scriptHint ? ` Manustipset var: "${scriptHint}"` : "";

    let analysisPrompt: string;

    if (!isFollowUp) {
        analysisPrompt = `Baserat på följande övningsmanus: "${currentScript}"${scriptHintText}, med målsättningen att öva en ${toneDescription} ton${customInstructionText}. `;
        if (currentAudioData && currentAudioMimeType) {
            analysisPrompt += `Bifogat finns en ljudinspelning **på svenska** av användarens försök (MIME-typ: ${currentAudioMimeType}). LYSSNA på den **svenska** ljudinspelningen och ge 2-3 konkreta, handlingsbara tips på svenska för hur användaren kan förbättra sitt framförande baserat på HUR DE LÄT. Fokusera på deras ton, intonation, tempo, pausering, och hur väl den avsedda tonen och ämnet kommunicerades vokalt **på svenska**. Var specifik och ge exempel från manuset om möjligt.`;
        } else {
            analysisPrompt += `Ge en kort textbaserad analys (2-3 konkreta, handlingsbara tips) på svenska om vad användaren kan fokusera på för att förbättra sitt framförande med den angivna tonen och ämnet, baserat på texten. Fokusera på potentiella utmaningar med att leverera detta manus med den givna tonen.`;
        }
        analysisPrompt += ` Starta direkt med analysen utan en hälsningsfras. Svara på svenska.`;
    } else { 
      if (currentAudioData && currentAudioMimeType) {
        analysisPrompt = `Här är en ny ljudinspelning **på svenska** (MIME-typ: ${currentAudioMimeType}) för samma manus och målsättning som vi diskuterade tidigare. Manuset är: \"${currentScript}\". Målsättningen var en ${toneDescription} ton${customInstructionText}.${scriptHintText} Vår tidigare konversation och dina tidigare råd finns i chatthistoriken. LYSSNA noggrant på denna NYA inspelning. Jämför med eventuella tidigare försök och den feedback som getts. Vad har användaren förbättrat vokalt sedan senast? Vad kan de fortfarande arbeta på för att bättre uppnå målet med denna inspelning? Ge 2-3 konkreta, nya tips på svenska. Fokusera på förändringar, framsteg och fortsatta utvecklingsområden. Starta direkt med din uppföljningsanalys. Svara på svenska.`;
      } else { 
        analysisPrompt = `Användaren vill ha ytterligare feedback på manuset: \"${currentScript}\" (Mål: ${toneDescription} ton${customInstructionText}${scriptHintText}). Vår tidigare konversation finns i chatthistoriken. Ge ytterligare 2-3 konkreta tips baserat på vår tidigare diskussion och vad användaren kan fokusera på härnäst. Svara på svenska.`;
      }
    }

    try {
      const aiResponseText = await startOrContinueChat(
        chatHistory, 
        analysisPrompt,
        currentAudioData, 
        currentAudioMimeType
      ); 
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiMessage]);
      if (!isFollowUp) {
        setHasChatBeenInitiatedForCurrentScript(true);
      }
    } catch (error) {
      console.error("Fel vid chattanalys:", error);
      const errorMsg = "Kunde inte få analys från coachen just nu. Försök igen.";
      setChatError(errorMsg);
      setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, sender: 'ai', text: errorMsg, timestamp: new Date() }]);
    }
    setIsChatLoading(false);
  }, [currentScript, scriptHint, currentPracticeMode, currentCustomInstructions, practiceModeToSwedishObjective, chatHistory]);


  const handleAudioRecorded = useCallback(async (blob: Blob | null) => {
    setAudioBlob(blob);
    
    if (blob) {
      setVocalData(null); 
      setWordMarkers(null);
      setBase64Audio(null);
      setAudioMimeType(null);
      setAnalysisError(null); 
      setIsChatLoading(true); 
      try {
        const base64 = await blobToBase64(blob);
        const mimeType = blob.type.split(';')[0]; 
        
        setBase64Audio(base64);
        setAudioMimeType(mimeType);
        
        const duration = 10; 
        const numPoints = duration * 10; 
        const mockGeneratedVocalData: VocalDataPoint[] = Array.from({ length: numPoints }, (_, i) => {
          const time = i * 0.1;
          const pitch = 100 + Math.random() * 100 + (Math.sin(time * 0.5 + Math.random() * Math.PI) * (30 + Math.random() * 20));
          const intensity = Math.max(0, Math.min(1, 0.4 + (Math.sin(time * 0.8 + Math.random() * Math.PI * 0.5) * 0.3) + (Math.random() - 0.5) * 0.2));
          return { time, pitch, intensity };
        });
        setVocalData(mockGeneratedVocalData);

        // Generate Word Markers
        if (currentScript && mockGeneratedVocalData.length > 0) {
          const words = currentScript.split(/\s+/).filter(w => w.length > 0);
          const scriptDuration = mockGeneratedVocalData[mockGeneratedVocalData.length - 1].time;
          const generatedWordMarkers: WordMarkerPoint[] = words.map((word, index) => {
            const estimatedWordTime = (index + 0.5) * (scriptDuration / words.length);
            // Find closest vocal data point
            let closestDataPoint = mockGeneratedVocalData[0];
            let minTimeDiff = Math.abs(mockGeneratedVocalData[0].time - estimatedWordTime);
            for (let i = 1; i < mockGeneratedVocalData.length; i++) {
              const diff = Math.abs(mockGeneratedVocalData[i].time - estimatedWordTime);
              if (diff < minTimeDiff) {
                minTimeDiff = diff;
                closestDataPoint = mockGeneratedVocalData[i];
              }
            }
            return {
              word,
              time: closestDataPoint.time, // Use the time of the closest data point
              pitch: closestDataPoint.pitch,
              intensity: closestDataPoint.intensity,
            };
          });
          setWordMarkers(generatedWordMarkers);
        }
        
        await analyzeRecordingAndContinueChat(base64, mimeType, hasChatBeenInitiatedForCurrentScript);

      } catch (error) {
        console.error("Fel vid bearbetning av ljudinspelning:", error);
        const errorText = "Kunde inte bearbeta ljudinspelningen för analys.";
        setAnalysisError(errorText);
        setChatHistory(prev => [...prev, {id: `err-audio-${Date.now()}`, sender: 'ai', text: errorText, timestamp: new Date()}]);
        setIsChatLoading(false); 
      }
    } else { 
      setVocalData(null);
      setWordMarkers(null);
      setBase64Audio(null);
      setAudioMimeType(null);
      setAnalysisError(null);
      setChatHistory([]); 
      setChatError(null);   
      setHasChatBeenInitiatedForCurrentScript(false); 
      setIsChatLoading(false); 
    }
    setIsActuallyRecording(false); // Always set to false after processing or clearing
  }, [analyzeRecordingAndContinueChat, hasChatBeenInitiatedForCurrentScript, currentScript]);

  const handleUserChatMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date(),
    };
    const newHistory = [...chatHistory, userMessage];
    setChatHistory(newHistory);
    setIsChatLoading(true);
    setChatError(null);

    try {
      const aiResponseText = await startOrContinueChat(newHistory, messageText); 
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Fel vid hämtning av chattsvar:", error);
      const errorMsg = "Kunde inte få svar från coachen just nu. Försök igen.";
      setChatError(errorMsg);
       setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, sender: 'ai', text: errorMsg, timestamp: new Date() }]);
    }
    setIsChatLoading(false);
  };

  const handleTriggerFollowUpRecording = useCallback(() => {
    setVocalData(null);
    setWordMarkers(null);
    setBase64Audio(null);
    setAudioMimeType(null);
    setAnalysisError(null);
    setAudioBlob(null); 

    audioRecorderRef.current?.triggerStartRecording();
  }, [audioRecorderRef]);


  useEffect(() => {
    if (!currentScript && !isLoadingScript) { 
        handleNewScript(PracticeMode.SJÄLVSAKER, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-gray-100 flex flex-col items-center p-4 md:p-8 selection:bg-blue-500 selection:text-white">
      <header className="w-full max-w-6xl mb-8 text-center"> {/* Wider header */}
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Röstdynamik Lab
        </h1>
        <p className="text-lg text-gray-300 mt-2">
          Finslipa din ton och tonhöjd för självsäker kommunikation.
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8"> {/* Wider main content */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-4 text-blue-300">1. Övningsmanus</h2>
          <ScriptGenerator onGenerateScript={handleNewScript} isLoading={isLoadingScript} />
          {isLoadingScript ? (
            <div className="mt-4 p-4 h-40 bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <p className="text-gray-400">Genererar manus & tips...</p>
            </div>
          ) : (
            <>
              <div className="mt-4 p-6 bg-gray-700 rounded-lg shadow-inner min-h-[8rem]">
                {scriptObjective && <p className="text-sm text-blue-300 mb-2 italic">Målsättning: {scriptObjective}</p>}
                <p className="text-lg whitespace-pre-wrap">{currentScript || "Klicka på 'Generera Nytt Manus' för att börja."}</p>
              </div>
              {scriptHint && !isLoadingScript && (
                <div className="mt-3 p-3 bg-blue-800 bg-opacity-30 rounded-lg shadow-inner border border-blue-700">
                  <h4 className="text-sm font-semibold text-blue-300 mb-1 flex items-center">
                    <FaLightbulb className="mr-2 text-yellow-400" /> Manustips
                  </h4>
                  <p className="text-sm text-gray-300 italic">{scriptHint}</p>
                </div>
              )}
            </>
          )}
        </section>

        <section className="bg-gray-800 p-6 rounded-xl shadow-2xl flex flex-col">
          <h2 className="text-2xl font-semibold mb-4 text-purple-300">2. Spela In & Coacha</h2>
          <AudioRecorder 
            ref={audioRecorderRef}
            onAudioRecorded={handleAudioRecorded} 
            onRecordingStateChange={setIsActuallyRecording}
            showPrimaryStartButton={!isActuallyRecording && !hasChatBeenInitiatedForCurrentScript}
            disabled={isLoadingScript || !currentScript || (isChatLoading && !isActuallyRecording)} 
          />
          
          {(isChatLoading && !vocalData && !analysisError && (audioBlob || isActuallyRecording) && !hasChatBeenInitiatedForCurrentScript) && ( 
            <div className="mt-4 p-4 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400">Bearbetar ljud & förbereder första analys...</p>
            </div>
          )}
           {(isChatLoading && !vocalData && !analysisError && (audioBlob || isActuallyRecording) && hasChatBeenInitiatedForCurrentScript) && ( 
            <div className="mt-4 p-4 bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400">Bearbetar ljud för uppföljningsanalys...</p>
            </div>
          )}
          {analysisError && <p className="mt-4 text-red-400 text-center">{analysisError}</p>}
          
          {vocalData && (
            <>
              <div className="mt-6">
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-blue-300 flex items-center justify-between flex-wrap gap-2">
                  <span>Tonhöjdskontur (Melodi)</span>
                  <span className="text-xs text-gray-400 font-normal">Håll muspekaren över graferna eller klicka på ett ord nedan för att spåra</span>
                </h3>
                <PitchVisualizer 
                  data={vocalData} 
                  wordMarkers={wordMarkers} 
                  selectedWord={selectedWord}
                  onSelectWord={setSelectedWord}
                />
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg md:text-xl font-semibold mb-2 text-emerald-300 flex items-center justify-between flex-wrap gap-2">
                  <span>Intensitetskontur (Röststyrka)</span>
                  <span className="text-xs text-gray-400 font-normal font-sans">Håll muspekaren över graferna eller klicka på ett ord nedan för att spåra</span>
                </h3>
                <IntensityVisualizer 
                  data={vocalData} 
                  wordMarkers={wordMarkers} 
                  selectedWord={selectedWord}
                  onSelectWord={setSelectedWord}
                />
              </div>

              {/* Interactive Word Breakdown Timeline */}
              {wordMarkers && wordMarkers.length > 0 && (
                <div className="mt-6 bg-gray-850 border border-gray-750 p-4 rounded-xl shadow-xl">
                  <h3 className="text-md font-semibold text-purple-300 mb-2 flex items-center justify-between flex-wrap gap-2">
                    <span>Ord-för-ord Tidslinje (Klicka för att lokalisera på graferna)</span>
                    {selectedWord && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-500 bg-opacity-20 text-yellow-400 font-medium animate-pulse">
                        Markerat: &quot;{selectedWord.word}&quot; vid {selectedWord.time.toFixed(1)}s
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3 font-sans leading-relaxed">
                    Klicka på ett ord för att låsa markören i graferna, eller för muspekaren över dem för att se tonhöjd och röststyrka för just det ordet.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                    {(() => {
                      const maxMarkerPitch = Math.max(...wordMarkers.map(m => m.pitch));
                      const minMarkerPitch = Math.min(...wordMarkers.map(m => m.pitch));
                      const pitchRange = maxMarkerPitch - minMarkerPitch;

                      const maxMarkerIntensity = Math.max(...wordMarkers.map(m => m.intensity));
                      const minMarkerIntensity = Math.min(...wordMarkers.map(m => m.intensity));
                      const intensityRange = maxMarkerIntensity - minMarkerIntensity;

                      return wordMarkers.map((marker, index) => {
                        const isSelected = selectedWord && selectedWord.word === marker.word && Math.abs(selectedWord.time - marker.time) < 0.05;
                        
                        // Check relative high/low ranges (matching the visualizers)
                        const pitchRatio = pitchRange > 0 ? (marker.pitch - minMarkerPitch) / pitchRange : 0.5;
                        const isHighPitch = pitchRatio >= 0.70;
                        const isLowPitch = pitchRatio <= 0.30;

                        const intensityRatio = intensityRange > 0 ? (marker.intensity - minMarkerIntensity) / intensityRange : 0.5;
                        const isHighIntensity = intensityRatio >= 0.70;
                        const isLowIntensity = intensityRatio <= 0.30;
                        
                        return (
                          <button
                            key={`${marker.word}-${index}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedWord(null);
                              } else {
                                setSelectedWord(marker);
                              }
                            }}
                            onMouseEnter={() => setSelectedWord(marker)}
                            onMouseLeave={() => {
                              // Keep selection locked if clicked, can also let mouse leave
                            }}
                            className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all duration-150 ${
                              isSelected 
                                ? 'bg-blue-950/60 border-yellow-400 ring-2 ring-yellow-400/50 shadow-md scale-[1.03]' 
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <span className="font-semibold text-xs md:text-sm text-white flex items-center gap-1.5 font-sans">
                              {marker.word}
                              {isHighPitch && <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Hög tonhöjd (Peak)" />}
                              {isLowPitch && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Låg tonhöjd (Valley)" />}
                              {isHighIntensity && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hög intensitet (Kraftfullt)" />}
                              {isLowIntensity && <span className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Låg intensitet (Tyst)" />}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-mono">
                              <span className={`flex items-center ${isHighPitch ? 'text-red-400 font-medium' : isLowPitch ? 'text-blue-400' : 'text-blue-300'}`}>
                                <span className="mr-0.5">Pitch:</span> {marker.pitch.toFixed(0)} Hz {isHighPitch ? '↗' : isLowPitch ? '↘' : ''}
                              </span>
                              <span className="text-gray-600">|</span>
                              <span className={`flex items-center ${isHighIntensity ? 'text-emerald-400 font-medium' : isLowIntensity ? 'text-gray-400' : 'text-emerald-300'}`}>
                                <span className="mr-0.5">Styrka:</span> {(marker.intensity * 100).toFixed(0)}% {isHighIntensity ? '🔊' : isLowIntensity ? '🔈' : ''}
                              </span>
                              <span className="text-gray-600">|</span>
                              <span>{marker.time.toFixed(1)}s</span>
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        
          {(chatHistory.length > 0 || (isChatLoading && (audioBlob || isActuallyRecording)) || hasChatBeenInitiatedForCurrentScript ) && (
            <div className="mt-6 flex-grow flex flex-col">
               <h3 className="text-xl font-medium mb-2 text-gray-200">Interaktiv Coachning</h3>
              <ChatInterface
                messages={chatHistory}
                onSendMessage={handleUserChatMessage}
                isLoading={isChatLoading && !isActuallyRecording} 
                error={chatError}
                showFollowUpRecordButton={hasChatBeenInitiatedForCurrentScript}
                isActuallyRecording={isActuallyRecording}
                isChatProcessingAudio={isChatLoading} 
                onFollowUpRecord={handleTriggerFollowUpRecording}
              />
            </div>
          )}
        </section>
      </main>

      <footer className="w-full max-w-6xl mt-12 text-center text-gray-500 text-sm"> {/* Wider footer */}
        <p>&copy; {new Date().getFullYear()} Röstdynamik Lab. AI-driven övning.</p>
        <p className="mt-1">Kom ihåg att tillåta mikrofonåtkomst när du uppmanas. AI-coachning använder externa API:ers funktioner.</p>
      </footer>
    </div>
  );
};

export default App;
