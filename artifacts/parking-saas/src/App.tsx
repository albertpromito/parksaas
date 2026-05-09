import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";
import AdminPanel from "@/pages/admin";
import Dashboard from "@/pages/dashboard";
import Spots from "@/pages/spots";
import Sessions from "@/pages/sessions";
import Subscribers from "@/pages/subscribers";
import Plans from "@/pages/plans";
import FinanceiroPremium from "@/pages/financeiro";
import Pricing from "@/pages/pricing";
import AccessControl from "@/pages/access-control";
import { PinGuard } from "@/components/pin-guard";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — show login
  if (!user) {
    return <Login />;
  }

  // Master admin — show admin panel
  if (user.role === "admin") {
    return <AdminPanel />;
  }

  // Tenant — show main app
  return (
    <Layout>
      <Switch>
        <Route path="/">{() => <PinGuard><Dashboard /></PinGuard>}</Route>
        <Route path="/spots" component={Spots} />
        <Route path="/sessions" component={Sessions} />
        <Route path="/subscribers" component={Subscribers} />
        <Route path="/plans" component={Plans} />
        <Route path="/transactions">{() => <PinGuard><FinanceiroPremium /></PinGuard>}</Route>
        <Route path="/reports">{() => <Redirect to="/transactions" />}</Route>
        <Route path="/pricing" component={Pricing} />
        <Route path="/access-control" component={AccessControl} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="parkhub-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
