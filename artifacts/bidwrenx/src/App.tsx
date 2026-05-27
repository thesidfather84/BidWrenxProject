import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import TermsPage from "@/pages/terms";
import SafetyPage from "@/pages/safety";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerJobs from "@/pages/customer/jobs";
import NewJob from "@/pages/customer/new-job";
import CustomerJobDetail from "@/pages/customer/job-detail";
import MechanicDashboard from "@/pages/mechanic/dashboard";
import BrowseJobs from "@/pages/mechanic/browse-jobs";
import MechanicJobDetail from "@/pages/mechanic/job-detail";
import MyBids from "@/pages/mechanic/my-bids";
import MechanicVerification from "@/pages/mechanic/verification";
import MessagesPage from "@/pages/messages";
import ThreadPage from "@/pages/thread";
import AdminDashboard from "@/pages/admin";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import ChangePasswordPage from "@/pages/change-password";
import SettingsPage from "@/pages/settings";
import MechanicProfilePage from "@/pages/mechanic-profile";
import MechanicsMapPage from "@/pages/mechanics-map";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AdminRoute() {
  const { user, isAuthenticated, isPinSession } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (isPinSession) {
      setLocation("/login");
    } else if (!user?.isAdmin) {
      setLocation(user?.role === "customer" ? "/customer/dashboard" : "/mechanic/dashboard");
    }
  }, [isAuthenticated, isPinSession, user, setLocation]);

  if (!isAuthenticated || isPinSession || !user?.isAdmin) return null;
  return <AdminDashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/safety" component={SafetyPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/change-password" component={ChangePasswordPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/customer/dashboard" component={CustomerDashboard} />
      <Route path="/customer/jobs" component={CustomerJobs} />
      <Route path="/customer/jobs/new" component={NewJob} />
      <Route path="/customer/jobs/:id" component={CustomerJobDetail} />
      <Route path="/mechanic/dashboard" component={MechanicDashboard} />
      <Route path="/mechanic/jobs" component={BrowseJobs} />
      <Route path="/mechanic/jobs/:id" component={MechanicJobDetail} />
      <Route path="/mechanic/bids" component={MyBids} />
      <Route path="/mechanic/verification" component={MechanicVerification} />
      <Route path="/mechanics-map" component={MechanicsMapPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/messages/:jobId/:otherUserId" component={ThreadPage} />
      <Route path="/mechanic/:id" component={MechanicProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
