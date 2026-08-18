import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, LogOut, ChevronRight, Shield } from "lucide-react";
import { getRoleLabel } from "@/config/roleAccess";
import clinexusLogo from "@/assets/clinexus-logo.png";

export default function SelectClinic() {
  const { user, profile, orgMemberships, roles, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if user has exactly 1 org
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    // Super admin can also access /admin
    if (roles.includes("super_admin") && orgMemberships.length === 0) {
      navigate("/admin", { replace: true });
      return;
    }
    if (orgMemberships.length === 1) {
      navigate(`/clinic/${orgMemberships[0].org_slug}/dashboard`, { replace: true });
    }
  }, [loading, user, orgMemberships, roles, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your clinics...</p>
        </div>
      </div>
    );
  }

  if (orgMemberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <img src={clinexusLogo} alt="Clinexus" className="h-12 w-auto object-contain mx-auto mb-2" />
            <CardTitle>No Clinic Found</CardTitle>
            <CardDescription>
              You are not a member of any clinic yet. Please contact your administrator to be added.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/30 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <img src={clinexusLogo} alt="Clinexus" className="h-12 w-auto object-contain mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Welcome, {displayName}</h1>
          <p className="text-sm text-muted-foreground">Select a clinic to continue</p>
        </div>

        <div className="space-y-3">
          {orgMemberships.map((org) => (
            <Card
              key={org.org_id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 group"
              onClick={() => navigate(`/clinic/${org.org_slug}/dashboard`)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{org.org_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {getRoleLabel(org.role)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                      {org.clinic_type}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3">
          {roles.includes("super_admin") && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="text-secondary border-secondary/30 hover:bg-secondary/10">
              <Shield className="mr-2 h-4 w-4" /> Admin Panel
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-muted-foreground">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
