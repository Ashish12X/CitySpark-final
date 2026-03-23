import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';

// Fix leaflet icon issue in react-leaflet (Keep defaults just in case)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createStatusIcon = (colorClass) => {
  return L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="w-7 h-7 rounded-full border-[3px] border-white shadow-md relative overflow-hidden flex items-center justify-center ${colorClass}">
             <div class="w-2.5 h-2.5 rounded-full bg-white opacity-90"></div>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const getStatusIcon = (status) => {
  switch(status) {
    case 'Reported': return createStatusIcon('bg-destructive'); // Red
    case 'In Progress': return createStatusIcon('bg-amber-500'); // Yellow
    case 'Resolved': return createStatusIcon('bg-emerald-500'); // Green
    default: return createStatusIcon('bg-slate-400');
  }
};

const userLocationIcon = L.divIcon({
  className: 'bg-transparent border-0',
  html: `<div class="relative w-8 h-8 flex items-center justify-center">
           <div class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-50"></div>
           <div class="relative w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg z-10"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const StatusBadge = ({ status, t }) => {
  switch(status) {
    case 'Reported':
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-destructive/10 text-destructive border border-destructive/20 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1"></span>{t('Reported')}</span>;
    case 'In Progress':
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1"></span>{t('In Progress')}</span>;
    case 'Resolved':
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>{t('Resolved')}</span>;
    default:
      return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-secondary-foreground w-fit">{t(status)}</span>;
  }
};

const LocationFlyer = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 14, { animate: true, duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

const MapView = () => {
  const { issues } = useApp();
  const { t } = useLanguage();
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn("Map Geolocation Error:", error);
        },
        { timeout: 10000 }
      );
    }
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-4.5rem)] overflow-hidden">
      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {issues.map(issue => (
          issue.lat && issue.lng ? (
            <Marker key={issue.id} position={[issue.lat, issue.lng]} icon={getStatusIcon(issue.progress)}>
              <Popup className="custom-popup rounded-lg overflow-hidden border-0 shadow-lg min-w-[220px]">
                <div className="p-0">
                  {issue.img && <img src={issue.img} alt={t(issue.title)} className="w-full h-28 object-cover rounded-t-lg border-b border-border/10" />}
                  <div className="p-4 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h3 className="font-bold text-base text-foreground leading-tight">{t(issue.title)}</h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                       <StatusBadge status={issue.progress} t={t} />
                       <div className="inline-block bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold">
                         {t(issue.category)}
                       </div>
                    </div>
                    
                    <p className="text-sm line-clamp-3 text-muted-foreground leading-relaxed">{t(issue.description) || t('No description provided.')}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
        {userCoords && (
          <Marker position={userCoords} icon={userLocationIcon}>
            <Popup className="custom-popup rounded-lg border-0 shadow-lg min-w-[140px]">
              <div className="p-3 text-center">
                <p className="font-bold text-foreground text-sm">{t('You are here')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('Your current location')}</p>
              </div>
            </Popup>
          </Marker>
        )}
        <LocationFlyer coords={userCoords} />
      </MapContainer>

      <div className="absolute top-6 left-6 z-[1000] bg-background/95 backdrop-blur-md p-4 rounded-xl shadow-antigravity pointer-events-none border border-border/50 max-w-sm">
        <h2 className="font-extrabold text-xl tracking-tight mb-1 text-foreground">{t('City Intelligence Map')}</h2>
        <p className="text-sm text-muted-foreground flex items-center leading-relaxed">
          {t('Visualizing live civic reports and maintenance progress across your community.')}
        </p>
      </div>
    </div>
  );
};

export default MapView;
