import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OrgContextType {
  currentOrg: {
    org_id: string;
    org_name: string;
    org_slug: string;
    clinic_type: string;
    role: string;
  } | null;
  setCurrentOrgBySlug: (slug: string) => void;
  basePath: string;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  setCurrentOrgBySlug: () => {},
  basePath: "",
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { orgMemberships, roles, loading } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [currentOrg, setCurrentOrg] = useState<OrgContextType["currentOrg"]>(null);

  const isSuperAdmin = roles.includes("super_admin");

  const setCurrentOrgBySlug = (targetSlug: string) => {
    const membership = orgMemberships.find((m) => m.org_slug === targetSlug);
    if (membership) {
      setCurrentOrg({
        org_id: membership.org_id,
        org_name: membership.org_name,
        org_slug: membership.org_slug,
        clinic_type: membership.clinic_type,
        role: membership.role,
      });
    }
  };

  // Sync from URL slug
  useEffect(() => {
    if (loading || !slug) return;

    // Already resolved for this slug — nothing to do
    if (currentOrg?.org_slug === slug) return;

    const membership = orgMemberships.find((m) => m.org_slug === slug);
    if (membership) {
      setCurrentOrg({
        org_id: membership.org_id,
        org_name: membership.org_name,
        org_slug: membership.org_slug,
        clinic_type: membership.clinic_type,
        role: membership.role,
      });
      return;
    }

    if (isSuperAdmin) {
      // Super admin can access any org — fetch it directly
      let cancelled = false;
      supabase
        .from("organizations")
        .select("id, name, slug, clinic_type")
        .eq("slug", slug)
        .maybeSingle()
        .then(({ data, error }) => {
          if (cancelled) return;
          if (data) {
            setCurrentOrg({
              org_id: data.id,
              org_name: data.name,
              org_slug: data.slug,
              clinic_type: data.clinic_type,
              role: "owner", // super admin gets full access
            });
          } else if (!error) {
            // Slug genuinely does not exist
            navigate("/admin", { replace: true });
          }
        });
      return () => {
        cancelled = true;
      };
    }

    navigate("/select-clinic", { replace: true });
  }, [slug, orgMemberships, loading, isSuperAdmin, navigate, currentOrg?.org_slug]);


  const basePath = currentOrg ? `/clinic/${currentOrg.org_slug}` : "";

  return (
    <OrgContext.Provider value={{ currentOrg, setCurrentOrgBySlug, basePath }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
