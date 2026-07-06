import { useState } from 'react';
import Globe from './components/Globe';
import TargetCursor from './components/TargetCursor';
import BackgroundGallery from './components/BackgroundGallery';
import './components/TargetCursor.css';
import './App.css';

type SelectedCountry = {
  code: string;
  name: string;
};

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  return (
    <div className="app-shell">
      <BackgroundGallery />
      <div className="bg-gallery-mask" />
      <div className="bg-gallery-vignette bg-gallery-vignette--top" />
      <div className="bg-gallery-vignette bg-gallery-vignette--bottom" />
      <main className="center-globe-layout">
        <div className="center-globe-stage">
          <Globe
            onCountryClick={setSelectedCountry}
            onCountryHover={setHoveredCountry}
          />
        </div>

        {selectedCountry && (
          <div className="country-chip" aria-live="polite">
            <span>{selectedCountry.code}</span>
            <strong>{selectedCountry.name}</strong>
          </div>
        )}
      </main>
      <TargetCursor
        spinDuration={4.4}
        hideDefaultCursor={true}
        hoverDuration={0.7}
        cursorColor="#6aeaff"
        cursorColorOnTarget="#6aeaff"
        isHoveringCountry={!!hoveredCountry}
      />
    </div>
  );
}
