import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { useToast } from "@/hooks/use-toast";
import { useGetMyReferral, getGetMyReferralQueryKey, useUpdateMyIdentity, useUpdateMyMapSettings } from "@workspace/api-client-react";
import {
  KeyRound, ShieldCheck, ShieldX, AlertTriangle, Lock,
  Eye, EyeOff, ChevronRight, Trash2, RefreshCw, Link2,
  Copy, Check, Share2, Twitter, Facebook, UserCircle, Globe,
  MapPin, Car, Zap, Map,
} from "lucide-react";

type Mode = "view" | "set-pin" | "remove-pin";

export default function SettingsPage() {
  const { user, updateUser, isPinSession } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("view");
  const [referralCopied, setReferralCopied] = useState(false);

  const { data: referralInfo } = useGetMyReferral({
    query: { queryKey: getGetMyReferralQueryKey(), enabled: user?.role === "mechanic" },
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Identity state — initialised from current user
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [legalName, setLegalName] = useState(user?.legalName ?? "");
  const [showLegalName, setShowLegalName] = useState(user?.showLegalNamePublicly ?? false);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Live username validation state
  type UsernameStatus = "idle" | "checking" | "valid" | "invalid";
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateIdentity = useUpdateMyIdentity();
  const updateMapSettings = useUpdateMyMapSettings();

  // Map presence state
  const [mapCity, setMapCity] = useState(user?.mapCity ?? "");
  const [mapState_, setMapState_] = useState(user?.mapState ?? "");
  const [serviceRadius, setServiceRadius] = useState(user?.serviceRadiusMiles ?? 25);
  const [isMobile, setIsMobile] = useState(user?.isMobileMechanic ?? false);
  const [shopType, setShopType] = useState<"shop" | "mobile" | "both">((user?.shopType as "shop" | "mobile" | "both") ?? "shop");
  const [emergencyAvail, setEmergencyAvail] = useState(user?.emergencyAvailable ?? false);
  const [mapVisibleSetting, setMapVisibleSetting] = useState(user?.mapVisible ?? true);
  const [willingToTravel, setWillingToTravel] = useState(user?.willingToTravelMiles ?? 0);
  const [mapSettingsLoading, setMapSettingsLoading] = useState(false);

  // Debounced live username check — fires 500ms after the user stops typing
  useEffect(() => {
    const token = localStorage.getItem("bidwrenx_token") ?? "";
    const trimmed = username.trim();

    // If unchanged from saved value, don't re-check
    if (trimmed === (user?.username ?? "")) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }
    if (!trimmed) {
      setUsernameStatus("idle");
      setUsernameError(null);
      return;
    }

    setUsernameStatus("checking");
    setUsernameError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(trimmed)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus("valid");
          setUsernameError(null);
        } else {
          setUsernameStatus("invalid");
          setUsernameError(data.error ?? "Username is not available");
        }
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, user?.username]);

  if (!user) { setLocation("/login"); return null; }

  const reset = () => {
    setMode("view");
    setCurrentPassword("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setShowPassword(false);
  };

  const apiCall = async (method: string, url: string, body: object) => {
    const token = localStorage.getItem("bidwrenx_token") ?? "";
    return fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || confirmPin.length !== 4) { setError("Enter a 4-digit PIN in both fields"); return; }
    if (newPin !== confirmPin) { setError("PINs don't match"); return; }
    if (!currentPassword) { setError("Password is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiCall("POST", "/api/users/me/pin", { pin: newPin, currentPassword });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to set PIN"); return; }
      updateUser(data);
      toast({ title: "PIN set successfully", description: "You can now use Quick PIN to sign in." });
      reset();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleRemovePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { setError("Password is required"); return; }
    setLoading(true); setError("");
    try {
      const res = await apiCall("DELETE", "/api/users/me/pin", { currentPassword });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Failed to remove PIN"); return; }
      updateUser(data);
      toast({ title: "PIN removed", description: "Quick PIN login has been disabled." });
      reset();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleSaveMapSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapSettingsLoading(true);
    try {
      const updated = await updateMapSettings.mutateAsync({
        data: {
          mapCity: mapCity.trim() || null,
          mapState: mapState_.trim() || null,
          serviceRadiusMiles: serviceRadius,
          isMobileMechanic: isMobile,
          shopType,
          emergencyAvailable: emergencyAvail,
          mapVisible: mapVisibleSetting,
          willingToTravelMiles: willingToTravel,
        },
      });
      updateUser(updated as any);
      toast({
        title: "Map presence saved",
        description: mapCity.trim()
          ? "Your pin will appear on the mechanic map."
          : "No location set — your pin won't appear on the map.",
      });
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.response?.data?.error ?? e?.message, variant: "destructive" });
    } finally {
      setMapSettingsLoading(false);
    }
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === "invalid") return; // block submit on invalid username
    setIdentityLoading(true);
    setIdentityError(null);
    try {
      const updated = await updateIdentity.mutateAsync({
        data: {
          displayName: displayName.trim() || null,
          username: username.trim() || null,
          legalName: legalName.trim() || null,
          showLegalNamePublicly: showLegalName,
        },
      });
      updateUser(updated as any);
      toast({ title: "Public identity saved" });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Failed to save";
      // Show username-related errors inline on the username field
      if (msg.toLowerCase().includes("username")) {
        setUsernameStatus("invalid");
        setUsernameError(msg);
      } else {
        setIdentityError(msg);
      }
    } finally {
      setIdentityLoading(false);
    }
  };

  const hasPinSet = user.hasPinSet;

  return (
    <AppLayout>
      <PageHeader title="Account Settings" />

      <div className="max-w-xl space-y-4">

        {/* Public Identity — mechanics only */}
        {user.role === "mechanic" && (
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UserCircle size={17} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Public Identity</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control what customers see instead of your legal name.
                </p>
              </div>
            </div>
            <form onSubmit={handleSaveIdentity} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Display name</label>
                <Input
                  placeholder="e.g. Mike the Mechanic"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Shown to customers on bids, messages, and your profile. If blank, your username (or account name) is used.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <Input
                    className={`pl-7 pr-8 ${usernameStatus === "invalid" ? "border-red-500/60 focus-visible:ring-red-500/30" : usernameStatus === "valid" ? "border-emerald-500/60 focus-visible:ring-emerald-500/30" : ""}`}
                    placeholder="e.g. mikethemechanic"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    maxLength={50}
                  />
                  {usernameStatus === "checking" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                  )}
                  {usernameStatus === "valid" && (
                    <Check size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  )}
                </div>
                {usernameError ? (
                  <p className="text-xs text-red-400">{usernameError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, underscores, dots, and hyphens only. Used as fallback if no display name is set.
                  </p>
                )}
              </div>

              <div className="pt-1 border-t border-border space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Legal name <span className="text-muted-foreground font-normal">(private by default)</span></p>
                  <Input
                    placeholder="Your full legal name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Stored securely. Only shown publicly if you enable the toggle below.
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setShowLegalName(!showLegalName)}
                    className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${showLegalName ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showLegalName ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Globe size={13} className="text-muted-foreground" />
                      Show legal name on public profile
                    </p>
                    <p className="text-xs text-muted-foreground">
                      When enabled, your legal name appears alongside your display name.
                    </p>
                  </div>
                </label>
              </div>

              {identityError && (
                <p className="text-xs text-red-400 -mt-1">{identityError}</p>
              )}
              <Button type="submit" size="sm" disabled={identityLoading || usernameStatus === "invalid" || usernameStatus === "checking"}>
                {identityLoading ? "Saving…" : "Save identity"}
              </Button>
            </form>
          </div>
        )}

        {/* Map Presence — mechanics only */}
        {user.role === "mechanic" && (
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin size={17} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Map Presence</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control how you appear on the "Find Mechanics" map.
                </p>
              </div>
              {user.mapLat && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  On map
                </span>
              )}
            </div>
            <form onSubmit={handleSaveMapSettings} className="p-5 space-y-4">
              {/* City / State */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">City</label>
                  <Input
                    placeholder="e.g. Austin"
                    value={mapCity}
                    onChange={(e) => setMapCity(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">State</label>
                  <Input
                    placeholder="e.g. TX"
                    value={mapState_}
                    onChange={(e) => setMapState_(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>
              {/* Location preview */}
              {user.mapLat && user.mapCity && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400">
                  <MapPin size={12} className="shrink-0" />
                  <span>
                    Pin set at <strong>{user.mapCity}{user.mapState ? `, ${user.mapState}` : ""}</strong>
                    {" "}— visible to customers searching nearby.
                  </span>
                </div>
              )}
              {!user.mapLat && (mapCity.trim() || mapState_.trim()) && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                  <MapPin size={12} className="shrink-0" />
                  <span>Save settings to geocode your location and appear on the map.</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground -mt-2">
                Your approximate city center is shown — never your exact address.
              </p>

              {/* Service radius */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Service radius</label>
                  <span className="text-sm text-primary font-semibold">{serviceRadius} mi</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={150}
                  step={5}
                  value={serviceRadius}
                  onChange={(e) => setServiceRadius(Number(e.target.value))}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 mi</span><span>150 mi</span>
                </div>
              </div>

              {/* Willing to travel (only when mobile) */}
              {isMobile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Willing to travel</label>
                    <span className="text-sm text-primary font-semibold">
                      {willingToTravel === 0 ? "No travel" : `${willingToTravel} mi`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={10}
                    value={willingToTravel}
                    onChange={(e) => setWillingToTravel(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How far you're willing to travel to a customer's location.
                  </p>
                </div>
              )}

              {/* Shop type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Shop type</label>
                <div className="flex gap-2">
                  {(["shop", "mobile", "both"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setShopType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        shopType === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "shop" ? "🏪 Shop" : t === "mobile" ? "🚐 Mobile" : "🔀 Both"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1 border-t border-border">
                {([
                  { key: "isMobile" as const, label: "Mobile mechanic", sub: "I come to the customer's location", icon: <Car size={13} className="text-muted-foreground" />, val: isMobile, set: setIsMobile },
                  { key: "emergency" as const, label: "Available for emergencies", sub: "Customers can see you're available for urgent jobs", icon: <Zap size={13} className="text-muted-foreground" />, val: emergencyAvail, set: setEmergencyAvail },
                  { key: "visible" as const, label: "Show me on the map", sub: "Visible to all customers browsing mechanics", icon: <Map size={13} className="text-muted-foreground" />, val: mapVisibleSetting, set: setMapVisibleSetting },
                ] as const).map(({ key, label, sub, icon, val, set }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer select-none">
                    <button
                      type="button"
                      onClick={() => set(!val)}
                      className={`relative mt-0.5 w-9 h-5 rounded-full transition-colors shrink-0 ${val ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1.5">{icon}{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <Button type="submit" size="sm" disabled={mapSettingsLoading}>
                {mapSettingsLoading ? "Saving…" : "Save map settings"}
              </Button>
            </form>
          </div>
        )}

        {/* Quick PIN card */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound size={17} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Quick PIN Login</p>
                {hasPinSet ? (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck size={10} /> Active
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1">
                    <ShieldX size={10} /> Not set
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sign in quickly with a 4-digit PIN — locked after 5 failed attempts.
              </p>
            </div>
          </div>

          <div className="p-5">
            {isPinSession && mode !== "view" && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  You're signed in via PIN. <strong>Sign in with your full password</strong> to manage PIN settings.
                </p>
              </div>
            )}

            {isPinSession ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
                <Lock size={14} className="shrink-0" />
                <span>Sign in with your password to manage Quick PIN settings.</span>
              </div>
            ) : mode === "view" ? (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={hasPinSet ? "outline" : "default"}
                  onClick={() => setMode("set-pin")}
                  className="gap-1.5"
                >
                  {hasPinSet ? <RefreshCw size={13} /> : <KeyRound size={13} />}
                  {hasPinSet ? "Change PIN" : "Set up PIN"}
                </Button>
                {hasPinSet && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMode("remove-pin")}
                    className="gap-1.5 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40"
                  >
                    <Trash2 size={13} />
                    Remove PIN
                  </Button>
                )}
              </div>
            ) : mode === "set-pin" ? (
              <form onSubmit={handleSetPin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">New 4-digit PIN</label>
                  <PinInput
                    value={newPin}
                    onChange={setNewPin}
                    error={!!error && newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm PIN</label>
                  <PinInput
                    value={confirmPin}
                    onChange={setConfirmPin}
                    autoFocus={false}
                    error={confirmPin.length === 4 && newPin !== confirmPin}
                  />
                  {confirmPin.length === 4 && newPin !== confirmPin && (
                    <p className="text-xs text-red-400">PINs don't match</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Confirm with your password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={loading || newPin.length < 4 || confirmPin.length < 4 || !currentPassword}>
                    {loading ? "Saving…" : hasPinSet ? "Change PIN" : "Set PIN"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRemovePin} className="space-y-4">
                <p className="text-sm text-muted-foreground">Confirm your password to remove Quick PIN login.</p>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-9"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" variant="destructive" disabled={loading || !currentPassword}>
                    {loading ? "Removing…" : "Remove PIN"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Referral — mechanics only */}
        {user.role === "mechanic" && (
          <div className="rounded-xl border border-border bg-card">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 size={17} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Referral Link</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Share your referral link and grow your customer base.
                </p>
              </div>
              {referralInfo && (
                <span className="text-xs font-semibold text-primary">
                  {referralInfo.referralCount} {referralInfo.referralCount === 1 ? "referral" : "referrals"}
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {referralInfo ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Your referral code</p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <code className="font-mono text-primary font-bold tracking-widest flex-1 text-sm">
                        {referralInfo.referralCode}
                      </code>
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${referralInfo.referralCode}`;
                          await navigator.clipboard.writeText(url);
                          setReferralCopied(true);
                          toast({ title: "Referral link copied!" });
                          setTimeout(() => setReferralCopied(false), 2000);
                        }}
                        className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {referralCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={async () => {
                        const url = `${window.location.origin}${import.meta.env.BASE_URL}mechanic/${user.id}`;
                        await navigator.clipboard.writeText(url);
                        setReferralCopied(true);
                        toast({ title: "Profile link copied!" });
                        setTimeout(() => setReferralCopied(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/60 transition-colors"
                    >
                      <Share2 size={12} /> Share profile
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${referralInfo.referralCode}`;
                        const text = `Sign up on BidWrenx using my referral link! ${url}`;
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/60 hover:text-sky-400 hover:border-sky-500/40 transition-colors"
                    >
                      <Twitter size={12} /> Twitter / X
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${referralInfo.referralCode}`;
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/60 hover:text-blue-400 hover:border-blue-500/40 transition-colors"
                    >
                      <Facebook size={12} /> Facebook
                    </button>
                  </div>

                  {referralInfo.referralCount > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent referrals</p>
                      <div className="space-y-1.5">
                        {referralInfo.referredUsers.slice(0, 5).map((u, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20 border border-border">
                            <span className="text-sm font-medium">{u.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(u.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>Loading referral info…</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account security */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-5 border-b border-border">
            <p className="font-semibold text-sm">Account Security</p>
          </div>
          <div className="divide-y divide-border">
            <button
              onClick={() => setLocation("/change-password")}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs text-muted-foreground mt-0.5">Update your account password</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
