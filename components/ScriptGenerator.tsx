
import React, { useState } from 'react';
import { PracticeMode } from '../types';
import { FaLightbulb, FaBullhorn, FaQuestionCircle, FaCommentDots, FaHandSparkles } from 'react-icons/fa';


interface ScriptGeneratorProps {
  onGenerateScript: (practiceMode: PracticeMode, customPrompt?: string) => void;
  isLoading: boolean;
}

const practiceModeIcons: Record<PracticeMode, React.ReactElement> = {
  [PracticeMode.SJÄLVSAKER]: <FaBullhorn className="mr-2" />,
  [PracticeMode.FRÅGANDE]: <FaQuestionCircle className="mr-2" />,
  [PracticeMode.ENTUSIASTISK]: <FaHandSparkles className="mr-2" />,
  [PracticeMode.LUGN]: <FaCommentDots className="mr-2" />,
  [PracticeMode.BESTÄMD]: <FaLightbulb className="mr-2" />,
};

const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ onGenerateScript, isLoading }) => {
  const [selectedMode, setSelectedMode] = useState<PracticeMode>(PracticeMode.SJÄLVSAKER);
  const [customInstructions, setCustomInstructions] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateScript(selectedMode, customInstructions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="practiceMode" className="block text-sm font-medium text-gray-300 mb-1">
          Välj ton att öva på:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.values(PracticeMode).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSelectedMode(mode)}
              className={`flex items-center justify-center p-3 rounded-md text-sm font-medium transition-all duration-150 ease-in-out
                ${selectedMode === mode 
                  ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
            >
              {practiceModeIcons[mode]}
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="customInstructions" className="block text-sm font-medium text-gray-300 mb-1">
          Beskriv vad ditt manus ska handla om (lämna tomt för generellt manus):
        </label>
        <input
          type="text"
          id="customInstructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-gray-100"
          placeholder="t.ex. en presentation om kvartalsrapporten"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Genererar...
          </>
        ) : (
          'Generera Nytt Manus'
        )}
      </button>
    </form>
  );
};

export default ScriptGenerator;
