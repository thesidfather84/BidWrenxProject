import "leaflet/dist/leaflet.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { Link } from "wouter";
import { useListMechanicsMap } from "@workspace/api-client-react";
import type { MechanicMapEntry } from "@workspace/api-client-react";
import { Wrench, MapPin, Star, BadgeCheck, X, SlidersHorizontal, Locate, Zap, Car, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Fix Leaflet default icon (broken in Vite)
function createPin(color: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2.5px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:15px;line-height:1;display:block;">${emoji}</span></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
  });
}

const ICONS = {
  emergency: createPin("#ef4444", "🚨"),
  verified: createPin("#10b981", "🔧"),
  mobile: createPin("#8b5cf6", "🚐"),
  default: createPin("#3b82f6", "🔧"),
};

function getMechanicIcon(m: MechanicMapEntry): L.DivIcon {
  if (m.emergencyAvailable) return ICONS.emergency;
  if (m.adminVerifiedMechanic) return ICONS.verified;
  if (m.isMobileMechanic) return ICONS.mobile;
  return ICONS.default;
}

const CATEGORIES = [
  "Brakes", "Engine", "Transmission", "Electrical", "AC & Heating",
  "Suspension", "Tires", "Diagnostics", "Oil & Fluids", "Body & Paint",
];

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Filters {
  categories: string[];
  mobileOnly: boolean;
  verifiedOnly: boolean;
  emergencyOnly: boolean;
  minRating: number;
  maxDistanceMiles: number;
}

function LocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 11);
        onLocate(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  return (
    <button
      onClick={handleLocate}
      className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium shadow-md hover:bg-muted transition-colors"
    >
      <Locate size={14} className={locating ? "animate-spin text-primary" : "text-muted-foreground"} />
      {locating ? "Locating…" : "My Location"}
    </button>
  );
}

function MechanicCard({ m, onClose }: { m: MechanicMapEntry; onClose: () => void }) {
  const stars = m.rating ? Math.round(m.rating * 10) / 10 : null;
  const specialties = m.specialties?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];

  return (
    <div className="min-w-[220px] max-w-[280px]">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-base font-bold text-primary">
          {m.photoUrl
            ? <img src={m.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            : m.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight flex items-center gap-1 flex-wrap">
            {m.name}
            {m.adminVerifiedMechanic && <BadgeCheck size={13} className="text-emerald-400 shrink-0" />}
          </p>
          {m.mapCity && (
            <p className="text-xs text-muted-foreground">{m.mapCity}{m.mapState ? `, ${m.mapState}` : ""}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {stars !== null && (
          <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star size={10} fill="currentColor" /> {stars} ({m.reviewCount})
          </span>
        )}
        {m.isMobileMechanic && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Mobile</span>
        )}
        {m.emergencyAvailable && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Emergency</span>
        )}
        {m.shopType === "both" && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Shop+Mobile</span>
        )}
      </div>

      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {specialties.slice(0, 3).map((s) => (
            <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s}</span>
          ))}
          {specialties.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{specialties.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          {m.serviceRadiusMiles} mi radius
        </span>
      </div>

      <Link href={`/mechanic/${m.id}`}>
        <Button size="sm" className="w-full text-xs h-8" onClick={onClose}>View Profile</Button>
      </Link>
    </div>
  );
}

export default function MechanicsMapPage() {
  const { data: mechanics = [], isLoading } = useListMechanicsMap();
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    mobileOnly: false,
    verifiedOnly: false,
    emergencyOnly: false,
    minRating: 0,
    maxDistanceMiles: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);

  const filtered = mechanics.filter((m) => {
    if (filters.mobileOnly && !m.isMobileMechanic) return false;
    if (filters.verifiedOnly && !m.adminVerifiedMechanic) return false;
    if (filters.emergencyOnly && !m.emergencyAvailable) return false;
    if (filters.minRating > 0 && ((m.rating ?? null) === null || (m.rating ?? 0) < filters.minRating)) return false;
    if (filters.maxDistanceMiles > 0 && userLoc) {
      const dist = haversineMiles(userLoc[0], userLoc[1], m.mapLat, m.mapLng);
      if (dist > filters.maxDistanceMiles) return false;
    }
    if (filters.categories.length > 0) {
      const specialties = m.specialties?.toLowerCase() ?? "";
      if (!filters.categories.some((c) => specialties.includes(c.toLowerCase()))) return false;
    }
    return true;
  });

  const toggleCategory = (cat: string) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.mobileOnly ||
    filters.verifiedOnly ||
    filters.emergencyOnly ||
    filters.minRating > 0 ||
    filters.maxDistanceMiles > 0;

  const resetFilters = () => setFilters({ categories: [], mobileOnly: false, verifiedOnly: false, emergencyOnly: false, minRating: 0, maxDistanceMiles: 0 });

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0 bg-sidebar z-10">
        <Link href="/">
          <div className="flex items-center gap-2 mr-2">
            <Wrench size={18} className="text-primary" />
            <span className="font-bold text-foreground hidden sm:inline">BidWrenx</span>
          </div>
        </Link>
        <div className="flex-1">
          <h1 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <MapPin size={15} className="text-primary" />
            Find Mechanics Near You
          </h1>
          <p className="text-xs text-muted-foreground">
            {isLoading ? "Loading…" : `${filtered.length} mechanic${filtered.length !== 1 ? "s" : ""} on map`}
          </p>
        </div>

        <button
          onClick={() => setShowFilters((f) => !f)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
            hasActiveFilters
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <SlidersHorizontal size={13} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {[filters.mobileOnly, filters.verifiedOnly, filters.emergencyOnly, filters.minRating > 0, filters.maxDistanceMiles > 0].filter(Boolean).length + (filters.categories.length > 0 ? 1 : 0)}
            </span>
          )}
        </button>

        <Link href="/register">
          <Button size="sm" className="hidden sm:flex text-xs h-8">Post a Job</Button>
        </Link>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Filter panel */}
        {showFilters && (
          <aside className="absolute left-0 top-0 bottom-0 z-[1000] w-72 bg-card border-r border-border overflow-y-auto shadow-xl flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <p className="font-semibold text-sm">Filter Mechanics</p>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button onClick={resetFilters} className="text-xs text-primary hover:underline">Reset</button>
                )}
                <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-5 flex-1">
              {/* Quick toggles */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Filters</p>
                {([
                  { key: "verifiedOnly" as const, label: "Verified only", icon: <Shield size={12} /> },
                  { key: "mobileOnly" as const, label: "Mobile mechanic", icon: <Car size={12} /> },
                  { key: "emergencyOnly" as const, label: "Emergency available", icon: <Zap size={12} /> },
                ] as const).map(({ key, label, icon }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
                      className={cn(
                        "relative w-8 h-4.5 rounded-full transition-colors shrink-0",
                        filters[key] ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                      style={{ height: "18px" }}
                    >
                      <span className={cn(
                        "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform",
                        filters[key] ? "translate-x-3.5" : "translate-x-0.5"
                      )} />
                    </button>
                    <span className="text-sm flex items-center gap-1">{icon}{label}</span>
                  </label>
                ))}
              </div>

              {/* Distance from my location */}
              {userLoc && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Max Distance {filters.maxDistanceMiles > 0 && <span className="text-primary normal-case font-normal">({filters.maxDistanceMiles} mi)</span>}
                  </p>
                  <div className="flex gap-1 flex-wrap">
                    {[0, 10, 25, 50, 100].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFilters((f) => ({ ...f, maxDistanceMiles: d }))}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                          filters.maxDistanceMiles === d
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {d === 0 ? "Any" : `${d} mi`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Min rating */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Min Rating {filters.minRating > 0 && <span className="text-primary normal-case font-normal">({filters.minRating}★+)</span>}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {[0, 3, 4, 4.5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setFilters((f) => ({ ...f, minRating: r }))}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                        filters.minRating === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {r === 0 ? "Any" : `${r}★+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                        filters.categories.includes(cat)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[39.5, -98.35]}
            zoom={5}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <LocateButton onLocate={(lat, lng) => setUserLoc([lat, lng])} />

            {userLoc && (
              <Circle
                center={userLoc}
                radius={1500}
                pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, weight: 2 }}
              />
            )}

            <MarkerClusterGroup chunkedLoading>
              {filtered.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.mapLat, m.mapLng]}
                  icon={getMechanicIcon(m)}
                >
                  <Popup maxWidth={300}>
                    <MechanicCard m={m} onClose={() => {}} />
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-6 left-4 z-[1000] bg-card border border-border rounded-lg px-3 py-2.5 shadow-md text-xs space-y-1.5">
            <p className="font-semibold text-muted-foreground mb-1">Legend</p>
            {[
              { color: "#ef4444", label: "Emergency available" },
              { color: "#10b981", label: "Admin verified" },
              { color: "#8b5cf6", label: "Mobile mechanic" },
              { color: "#3b82f6", label: "Other mechanic" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Empty state overlay */}
          {!isLoading && filtered.length === 0 && mechanics.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
              <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-xl text-center pointer-events-auto">
                <MapPin size={28} className="text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">No mechanics match your filters</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Try adjusting your filter criteria</p>
                <Button size="sm" variant="outline" onClick={resetFilters} className="text-xs">Reset filters</Button>
              </div>
            </div>
          )}

          {!isLoading && mechanics.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
              <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-xl text-center">
                <Wrench size={28} className="text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-sm">No mechanics have set their location yet</p>
                <p className="text-xs text-muted-foreground mt-1">Mechanics can add their location in Settings.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
