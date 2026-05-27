import React, { createContext, useContext, useState, useEffect } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "customer" | "mechanic";
  phone: string | null;
  location: string | null;
  bio: string | null;
  rating: number | null;
  reviewCount: number;
  warningCount: number;
  flaggedForReview: boolean;
  suspended: boolean;
  verified: boolean;
  isAdmin: boolean;
  mustChangePassword: boolean;
  hasPinSet: boolean;
  pinLocked: boolean;
  photoUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerificationStatus: "none" | "pending" | "approved" | "rejected";
  insuranceDocumentUploaded: boolean;
  certificationDocumentUploaded: boolean;
  adminVerifiedMechanic: boolean;
  verificationNotes: string | null;
  verificationRequestedAt: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  // Identity / privacy
  legalName: string | null;
  displayName: string | null;
  username: string | null;
  showLegalNamePublicly: boolean;
  // Map presence (mechanics)
  mapCity: string | null;
  mapState: string | null;
  mapLat: number | null;
  mapLng: number | null;
  serviceRadiusMiles: number;
  isMobileMechanic: boolean;
  shopType: string | null;
  willingToTravelMiles: number | null;
  emergencyAvailable: boolean;
  mapVisible: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isPinSession: boolean;
  login: (token: string, user: AuthUser, sessionType?: "full" | "pin") => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isPinSession, setIsPinSession] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("bidwrenx_token");
    const userStr = localStorage.getItem("bidwrenx_user");
    const sessionType = localStorage.getItem("bidwrenx_session_type");
    if (token && userStr) {
      try {
        setUser(JSON.parse(userStr));
        setIsPinSession(sessionType === "pin");
      } catch {
        localStorage.removeItem("bidwrenx_token");
        localStorage.removeItem("bidwrenx_user");
        localStorage.removeItem("bidwrenx_session_type");
      }
    }
  }, []);

  const login = (token: string, userData: AuthUser, sessionType: "full" | "pin" = "full") => {
    localStorage.setItem("bidwrenx_token", token);
    localStorage.setItem("bidwrenx_user", JSON.stringify(userData));
    localStorage.setItem("bidwrenx_session_type", sessionType);
    setUser(userData);
    setIsPinSession(sessionType === "pin");
  };

  const updateUser = (userData: AuthUser) => {
    localStorage.setItem("bidwrenx_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("bidwrenx_token");
    localStorage.removeItem("bidwrenx_user");
    localStorage.removeItem("bidwrenx_session_type");
    setUser(null);
    setIsPinSession(false);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isPinSession, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
