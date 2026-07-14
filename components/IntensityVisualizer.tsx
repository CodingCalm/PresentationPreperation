
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter, ReferenceLine } from 'recharts';
import { VocalDataPoint, WordMarkerPoint } from '../types';

interface IntensityVisualizerProps {
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
  
  const val = payload.intensity;
  const isSelected = selectedWord && selectedWord.word === payload.word && Math.abs(selectedWord.time - payload.time) < 0.05;

  // Determine relative loudness peaks and quiet points
  const range = (maxVal || 1.0) - (minVal || 0.0);
  const ratio = range > 0 ? (val - (minVal || 0.0)) / range : 0.5;
  const isHigh = ratio >= 0.70;
  const isLow = ratio <= 0.30;

  // Alternating label offset to prevent overlap
  const idx = typeof index === 'number' ? index : 0;
  const isEven = idx % 2 === 0;
  const yOffset = isSelected ? 32 : (isEven ? 16 : 28);

  // Styling based on state
  let themeColor = "#FBBF24"; // Amber/gold default
  let statusText = "";

  if (isHigh) {
    themeColor = "#10B981"; // Emerald for high intensity
    statusText = " 🔊";
  } else if (isLow) {
    themeColor = "#6B7280"; // Muted gray for quiet words
    statusText = " 🔈";
  }

  if (isSelected) {
    themeColor = "#FBBF24";
  }

  return (
    <g style={{ cursor: 'pointer' }}>
      {/* Dashed connector line from line chart down to text label */}
      <line 
        x1={cx} 
        y1={cy} 
        x2={cx} 
        y2={cy - yOffset + 5} 
        stroke={isSelected ? "#FBBF24" : "#4B5563"} 
        strokeWidth={isSelected ? 1.5 : 1}
        strokeDasharray={isSelected ? "none" : "2 2"}
      />

      {/* Pulsing selection background */}
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
      
      {/* Anchor dot */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={isSelected ? 6 : 4.5} 
        fill={themeColor} 
        stroke="#111827" 
        strokeWidth={1.5} 
      />
      
      {/* Word text label with background outline for high legibility */}
      <text
        x={cx}
        y={cy - yOffset} 
        fill={isSelected ? "#FBBF24" : (isHigh ? "#34D399" : (isLow ? "#9CA3AF" : "#E2E8F0"))}
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


const IntensityVisualizer: React.FC<IntensityVisualizerProps> = ({ data, wordMarkers, selectedWord, onSelectWord }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 bg-gray-800 rounded-lg min-h-[200px] flex items-center justify-center border border-gray-700">
        Spela in din röst för att se intensitetsvisualisering.
      </div>
    );
  }

  const yAxisDomainMin = 0;
  const yAxisDomainMax = 1;

  // Extract min/max values of markers to pass to CustomWordDot for relative peaks
  const markerIntensities = wordMarkers && wordMarkers.length > 0 ? wordMarkers.map(m => m.intensity) : [];
  const minVal = markerIntensities.length > 0 ? Math.min(...markerIntensities) : 0.0;
  const maxVal = markerIntensities.length > 0 ? Math.max(...markerIntensities) : 1.0;

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
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} 
            allowDecimals={true} 
            stroke="#9CA3AF"
            label={{ value: 'Röststyrka (Intensitet %)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', dx: -10, fontSize: 11 }}
            dx={-5}
            width={80}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              if (name === "Röstens Intensitet") return [`${(value * 100).toFixed(0)}%`, "Intensitet"];
              if (name === "Ord" && props.payload && props.payload.word) return [`${props.payload.word}: ${(props.payload.intensity * 100).toFixed(0)}%`, "Ord"];
              return [value, name];
            }}
            labelFormatter={(label: number) => {
              const closestWord = wordMarkers?.find(w => Math.abs(w.time - label) < 0.15);
              return `Tid: ${label.toFixed(2)}s ${closestWord ? `(${closestWord.word})` : ''}`;
            }}
            contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.95)', border: '1px solid #4B5563', borderRadius: '0.5rem' }}
            itemStyle={{ color: '#F3F4F6' }}
            labelStyle={{ color: '#10B981', fontWeight: 'bold' }}
          />
          <Legend 
            payload={[
              { value: 'Röstens Intensitet (%)', type: 'line' as const, id: 'intensity', color: '#34D399' },
              ...(wordMarkers && wordMarkers.length > 0 ? [{ value: 'Ord (🔊 Hög, 🔈 Låg)', type: 'circle' as const, id: 'words', color: '#10B981' }] : [])
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
            dataKey="intensity" 
            name="Röstens Intensitet"
            stroke="#34D399" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 7, fill: '#FBBF24', stroke: '#111827', strokeWidth: 2 }} 
          />
          
          {wordMarkers && wordMarkers.length > 0 && (
            <Scatter 
              name="Ord" 
              data={wordMarkers} 
              dataKey="intensity" 
              shape={<CustomWordDot selectedWord={selectedWord} maxVal={maxVal} minVal={minVal} />}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IntensityVisualizer;
