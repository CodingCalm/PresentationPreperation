
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts';
import { VocalDataPoint, WordMarkerPoint } from '../types'; 

interface PitchVisualizerProps {
  data: VocalDataPoint[] | null;
  wordMarkers?: WordMarkerPoint[] | null;
  selectedWord: WordMarkerPoint | null;
  onSelectWord: (word: WordMarkerPoint | null) => void;
}

const CustomWordDot = (props: any) => {
  const { cx, cy, payload, selectedWord, index, maxVal, minVal } = props;
  if (!payload || typeof payload.word !== 'string' || payload.word.trim() === '') {
    return null;
  }
  
  const val = payload.pitch;
  const isSelected = selectedWord && selectedWord.word === payload.word && Math.abs(selectedWord.time - payload.time) < 0.05;

  // Determine if this word is a pitch peak or valley relative to the recording
  const range = (maxVal || 200) - (minVal || 100);
  const ratio = range > 0 ? (val - (minVal || 100)) / range : 0.5;
  const isHigh = ratio >= 0.70;
  const isLow = ratio <= 0.30;

  // Alternating offset to prevent label overlapping
  const idx = typeof index === 'number' ? index : 0;
  const isEven = idx % 2 === 0;
  const yOffset = isSelected ? 32 : (isEven ? 16 : 28);

  // Color theme
  let themeColor = "#FBBF24"; // Amber/gold default
  let statusText = "";
  let badgeColor = "#FCD34D";

  if (isHigh) {
    themeColor = "#EF4444"; // Vibrant Red for high pitch
    statusText = " ↗";
    badgeColor = "#FCA5A5";
  } else if (isLow) {
    themeColor = "#3B82F6"; // Clear Blue for low pitch
    statusText = " ↘";
    badgeColor = "#93C5FD";
  }

  if (isSelected) {
    themeColor = "#FBBF24";
    badgeColor = "#FBBF24";
  }

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Dashed connector stem from the actual plot point to the text label */}
      <line 
        x1={cx} 
        y1={cy} 
        x2={cx} 
        y2={cy - yOffset + 5} 
        stroke={isSelected ? "#FBBF24" : "#4B5563"} 
        strokeWidth={isSelected ? 1.5 : 1}
        strokeDasharray={isSelected ? "none" : "2 2"}
      />

      {/* Dynamic pulse effect for selected/active word */}
      {isSelected && (
        <circle 
          cx={cx} 
          cy={cy} 
          r={12} 
          fill={themeColor} 
          fillOpacity={0.2} 
          stroke={themeColor} 
          strokeWidth={1} 
          strokeDasharray="2 2"
        />
      )}
      
      {/* Anchor point on the line chart */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={isSelected ? 6 : 4.5} 
        fill={themeColor} 
        stroke="#111827" 
        strokeWidth={1.5} 
      />
      
      {/* High-legibility text tag with thick outline stroke */}
      <text
        x={cx}
        y={cy - yOffset} 
        fill={isSelected ? "#FBBF24" : (isHigh ? "#FCA5A5" : (isLow ? "#93C5FD" : "#E2E8F0"))}
        fontSize={isSelected ? "12" : "10.5"} 
        fontWeight={isSelected || isHigh ? "800" : "600"}
        textAnchor="middle"
        stroke="#111827" 
        strokeWidth={3}  
        paintOrder="stroke" 
      >
        {`${payload.word}${statusText}`}
      </text>
    </g>
  );
};


const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ data, wordMarkers, selectedWord, onSelectWord }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 bg-gray-800 rounded-lg min-h-[200px] flex items-center justify-center border border-gray-700">
        Spela in din röst för att se tonhöjdsvisualisering.
      </div>
    );
  }

  const pitches = data.map(p => p.pitch);
  const minPitchValue = Math.min(...pitches);
  const maxPitchValue = Math.max(...pitches);
  
  const yAxisDomainMin = minPitchValue > 0 ? Math.max(0, Math.floor(minPitchValue / 20) * 20 - 20) : 0;
  const yAxisDomainMax = Math.ceil(maxPitchValue / 20) * 20 + 20;

  // Extract min/max values of markers to pass to CustomWordDot for relative peak detection
  const markerPitches = wordMarkers && wordMarkers.length > 0 ? wordMarkers.map(m => m.pitch) : [];
  const minVal = markerPitches.length > 0 ? Math.min(...markerPitches) : minPitchValue;
  const maxVal = markerPitches.length > 0 ? Math.max(...markerPitches) : maxPitchValue;

  // Handle hover tracking over the chart to select the closest word
  const handleMouseMove = (state: any) => {
    if (!wordMarkers || wordMarkers.length === 0) return;
    if (state && state.activeLabel !== undefined) {
      const activeTime = state.activeLabel;
      if (typeof activeTime === 'number') {
        let closest = wordMarkers[0];
        let minDiff = Math.abs(wordMarkers[0].time - activeTime);
        for (const wm of wordMarkers) {
          const diff = Math.abs(wm.time - activeTime);
          if (diff < minDiff) {
            minDiff = diff;
            closest = wm;
          }
        }
        // Only select if user is reasonably close to the word's time (within 0.5s)
        if (minDiff < 0.5) {
          if (!selectedWord || selectedWord.time !== closest.time) {
            onSelectWord(closest);
          }
        } else {
          if (selectedWord) {
            onSelectWord(null);
          }
        }
      }
    }
  };

  const handleMouseLeave = () => {
    if (selectedWord) {
      onSelectWord(null);
    }
  };

  return (
    <div className="p-4 bg-gray-850 border border-gray-700 rounded-lg shadow-xl h-64 md:h-80 w-full relative transition-all">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 25,
            right: 20,
            left: -20, 
            bottom: 20, 
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            type="number" 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time) => `${time.toFixed(1)}s`}
            stroke="#9CA3AF"
            dy={10}
            label={{ value: "Tid (sekunder)", position: 'insideBottom', offset: -10, fill: '#9CA3AF', fontSize: 11 }}
          />
          <YAxis 
            domain={[yAxisDomainMin, yAxisDomainMax]} 
            allowDecimals={false} 
            stroke="#9CA3AF"
            label={{ value: 'Tonhöjd (Hz)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', dx: -10, fontSize: 11 }} 
            dx={-5}
            width={80} 
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              if (name === "Röstens Tonhöjd") return [`${value.toFixed(0)} Hz`, "Tonhöjd"];
              if (name === "Ord" && props.payload && props.payload.word) return [`${props.payload.word}: ${props.payload.pitch.toFixed(0)} Hz`, "Ord"];
              return [value, name];
            }}
            labelFormatter={(label: number) => {
              const closestWord = wordMarkers?.find(w => Math.abs(w.time - label) < 0.15);
              return `Tid: ${label.toFixed(2)}s ${closestWord ? `(${closestWord.word})` : ''}`;
            }}
            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #4B5563', borderRadius: '0.5rem' }}
            itemStyle={{ color: '#F3F4F6' }}
            labelStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
          />
          <Legend 
            payload={[
              { value: 'Röstens Tonhöjd (Hz)', type: 'line' as const, id: 'pitch', color: '#60A5FA' },
              ...(wordMarkers && wordMarkers.length > 0 ? [{ value: 'Ord (↗ Hög, ↘ Låg)', type: 'circle' as const, id: 'words', color: '#EF4444' }] : [])
            ]}
            verticalAlign="top" 
            height={36} 
            wrapperStyle={{ color: '#E5E7EB', fontSize: 11 }}
          />
          
          {/* Highlight active word vertical reference line */}
          {selectedWord && (
            <ReferenceLine 
              x={selectedWord.time} 
              stroke="#FBBF24" 
              strokeWidth={1.5} 
              strokeDasharray="4 4"
            />
          )}

          <Line 
            type="monotone" 
            dataKey="pitch" 
            name="Röstens Tonhöjd" 
            stroke="#60A5FA" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 7, fill: '#FBBF24', stroke: '#111827', strokeWidth: 2 }} 
          />
          
          {wordMarkers && wordMarkers.length > 0 && (
            <Scatter 
              name="Ord" 
              data={wordMarkers} 
              dataKey="pitch" 
              shape={<CustomWordDot selectedWord={selectedWord} maxVal={maxVal} minVal={minVal} />}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PitchVisualizer;
