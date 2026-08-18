import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, ExternalLink, Upload, Image as ImageIcon,
  Globe, Palette, Clock, Share2, Shield, MessageSquare, Camera, LayoutTemplate,
  BarChart3, Sparkle, UserRound, Quote, Receipt, HelpCircle, MapPin, Megaphone,
} from "lucide-react";
import { websiteTemplates, defaultTemplateId } from "@/config/websiteTemplates";

import {
  useClinicSettings, useUpdateClinicSettings,
  type SiteSettings, type OperatingHour, type Certification, type GalleryItem,
  type ServiceCard, type WhyChooseItem, type TestimonialItem, type PricingItem, type FaqItem,
} from "@/hooks/useClinicSettings";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const DEFAULT_HOURS: OperatingHour[] = [
  { day: "Monday", open: "09:00", close: "17:00" },
  { day: "Tuesday", open: "09:00", close: "17:00" },
  { day: "Wednesday", open: "09:00", close: "17:00" },
  { day: "Thursday", open: "09:00", close: "17:00" },
  { day: "Friday", open: "09:00", close: "17:00" },
  { day: "Saturday", open: "09:00", close: "13:00" },
  { day: "Sunday", open: "09:00", close: "13:00", closed: true },
];

export default function WebsiteSettingsPage() {
  const { data: clinicSettings } = useClinicSettings();
  const updateClinic = useUpdateClinicSettings();
  const heroImageRef = useRef<HTMLInputElement>(null);
  const galleryImageRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

  const settings = clinicSettings?.settings || {};

  // Form state
  const [form, setForm] = useState<SiteSettings>({});
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [newCert, setNewCert] = useState("");
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [newGalleryTitle, setNewGalleryTitle] = useState("");
  const [newGalleryDesc, setNewGalleryDesc] = useState("");
  const [serviceCards, setServiceCards] = useState<ServiceCard[]>([]);
  const [whyItems, setWhyItems] = useState<WhyChooseItem[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  // Sync from server
  useEffect(() => {
    if (settings) {
      setHours(settings.operating_hours || DEFAULT_HOURS);
      setCerts(settings.certifications || []);
      setGallery(settings.gallery_items || []);
      setServiceCards(settings.service_cards || []);
      setWhyItems(settings.why_items || []);
      setTestimonials(settings.testimonials || []);
      setPricingItems(settings.pricing_items || []);
      setFaqs(settings.faqs || []);
    }
  }, [clinicSettings]);

  const get = (key: keyof SiteSettings) => (form[key] as string) ?? (settings as any)?.[key] ?? "";

  const set = (key: keyof SiteSettings, value: string) => setForm({ ...form, [key]: value });

  const publicSiteUrl = clinicSettings?.slug
    ? `${window.location.origin}/site/${clinicSettings.slug}`
    : "";

  const handleSave = (extraFields?: Partial<SiteSettings>) => {
    if (!clinicSettings) return;
    const merged: SiteSettings = {
      ...settings,
      ...form,
      operating_hours: hours,
      certifications: certs,
      gallery_items: gallery,
      service_cards: serviceCards,
      why_items: whyItems,
      testimonials,
      pricing_items: pricingItems,
      faqs,
      ...extraFields,
    };
    updateClinic.mutate({ id: clinicSettings.id, settings: merged });
  };

  const selectedTemplate = (form.template as string) || (settings as any)?.template || defaultTemplateId;

  const handleSelectTemplate = (id: string) => {
    setForm({ ...form, template: id });
    handleSave({ template: id });
  };



  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicSettings) return;
    setHeroUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${clinicSettings.id}/hero.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("clinic-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("clinic-logos").getPublicUrl(path);
      const heroUrl = urlData.publicUrl + "?t=" + Date.now();
      setForm({ ...form, hero_image_url: heroUrl });
      handleSave({ hero_image_url: heroUrl });
      toast({ title: "Hero image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setHeroUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicSettings) return;
    setGalleryUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const id = crypto.randomUUID();
      const path = `${clinicSettings.id}/gallery/${id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("clinic-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("clinic-logos").getPublicUrl(path);
      const imageUrl = urlData.publicUrl + "?t=" + Date.now();
      const newItem: GalleryItem = {
        id,
        image_url: imageUrl,
        title: newGalleryTitle.trim() || undefined,
        description: newGalleryDesc.trim() || undefined,
      };
      const updatedGallery = [...gallery, newItem];
      setGallery(updatedGallery);
      setNewGalleryTitle("");
      setNewGalleryDesc("");
      // Save immediately
      const merged: SiteSettings = {
        ...settings,
        ...form,
        operating_hours: hours,
        certifications: certs,
        gallery_items: updatedGallery,
      };
      updateClinic.mutate({ id: clinicSettings.id, settings: merged });
      toast({ title: "Gallery image added" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setGalleryUploading(false);
    }
  };

  const removeGalleryItem = (idx: number) => {
    const updated = gallery.filter((_, i) => i !== idx);
    setGallery(updated);
  };

  const updateHour = (idx: number, field: keyof OperatingHour, value: any) => {
    const updated = [...hours];
    (updated[idx] as any)[field] = value;
    setHours(updated);
  };

  const addCert = () => {
    if (!newCert.trim()) return;
    setCerts([...certs, { title: newCert.trim() }]);
    setNewCert("");
  };

  const removeCert = (idx: number) => {
    setCerts(certs.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Website Settings" description="Manage your public clinic website content and appearance" />

      {/* Public site link */}
      <Card className="glass-card border-secondary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Your Public Clinic Website</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-all">{publicSiteUrl || "Loading..."}</p>
          </div>
          {publicSiteUrl && (
            <Button variant="outline" size="sm" className="shrink-0 border-border/50" asChild>
              <a href={publicSiteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Site
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs defaultValue="templates">
          <TabsList className="bg-muted/50 backdrop-blur-sm flex-wrap h-auto gap-1">
            <TabsTrigger value="templates"><LayoutTemplate className="mr-1.5 h-3.5 w-3.5" />Templates</TabsTrigger>
            <TabsTrigger value="identity"><Globe className="mr-1.5 h-3.5 w-3.5" />Identity & Hero</TabsTrigger>
            <TabsTrigger value="pagecontent"><Megaphone className="mr-1.5 h-3.5 w-3.5" />Page Sections</TabsTrigger>

            <TabsTrigger value="gallery"><Camera className="mr-1.5 h-3.5 w-3.5" />Gallery</TabsTrigger>
            <TabsTrigger value="hours"><Clock className="mr-1.5 h-3.5 w-3.5" />Hours</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="mr-1.5 h-3.5 w-3.5" />Appearance</TabsTrigger>
            <TabsTrigger value="social"><Share2 className="mr-1.5 h-3.5 w-3.5" />Social & Contact</TabsTrigger>
            <TabsTrigger value="trust"><Shield className="mr-1.5 h-3.5 w-3.5" />Trust & Certs</TabsTrigger>
            <TabsTrigger value="booking"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Booking</TabsTrigger>
          </TabsList>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Website Templates</CardTitle>
                <CardDescription>
                  Pick one of {websiteTemplates.length} complete dental website designs. Each template changes the layout,
                  hero style, colours, typography and section order of your public site.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {websiteTemplates.map((t) => {
                    const active = selectedTemplate === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTemplate(t.id)}
                        className={`text-left rounded-xl border transition-all overflow-hidden hover:shadow-md ${active ? "border-secondary ring-2 ring-secondary/40" : "border-border/50"}`}
                      >
                        {/* Mini preview */}
                        <div className="h-28 relative" style={{ backgroundColor: t.colors.heroBg }}>
                          <div className="absolute top-0 left-0 right-0 h-5 flex items-center justify-between px-2" style={{ backgroundColor: t.colors.primary }}>
                            <div className="h-1.5 w-8 rounded-full bg-white/70" />
                            <div className="h-2 w-6 rounded-sm bg-white/80" />
                          </div>
                          <div className={`absolute inset-x-3 top-8 space-y-1.5 ${["centered", "gradient", "card", "wave", "dark"].includes(t.hero) ? "text-center" : ""}`}>
                            <div className="h-2.5 rounded" style={{ backgroundColor: t.colors.text, opacity: 0.85, width: t.hero === "editorial" ? "80%" : "60%", marginInline: ["centered", "gradient", "card", "wave", "dark"].includes(t.hero) ? "auto" : undefined }} />
                            <div className="h-1.5 rounded" style={{ backgroundColor: t.colors.muted, width: "45%", marginInline: ["centered", "gradient", "card", "wave", "dark"].includes(t.hero) ? "auto" : undefined }} />
                            <div className="h-3 w-14 rounded" style={{ backgroundColor: t.colors.primary, marginInline: ["centered", "gradient", "card", "wave", "dark"].includes(t.hero) ? "auto" : undefined }} />
                          </div>
                          <div className="absolute bottom-1.5 inset-x-3 grid grid-cols-3 gap-1.5">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="h-4 rounded" style={{ backgroundColor: t.colors.surface, border: `1px solid ${t.colors.border}` }} />
                            ))}
                          </div>
                        </div>
                        <div className="p-3 bg-card/60">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{t.name}</p>
                            {active && <Badge className="text-[10px] bg-secondary">Active</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {[t.colors.primary, t.colors.accent, t.colors.bg].map((col) => (
                              <span key={col} className="h-3.5 w-3.5 rounded-full border border-border/60" style={{ backgroundColor: col }} />
                            ))}
                            <span className="ml-auto text-[10px] text-muted-foreground">{t.tags[0]}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Selecting a template saves instantly. Colours set under “Appearance” override the template palette.
                </p>
              </CardContent>
            </Card>
          </TabsContent>


          {/* Identity & Hero */}
          <TabsContent value="identity" className="mt-4 space-y-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Clinic Identity & Hero Section</CardTitle>
                <CardDescription>Configure what visitors see first</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg pt-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Short Description</Label>
                  <Textarea
                    className="bg-muted/30 border-border/40 min-h-[60px]"
                    placeholder="A modern dental clinic dedicated to your smile..."
                    value={get("short_description")}
                    onChange={(e) => set("short_description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Hero Title</Label>
                  <Input
                    className="bg-muted/30 border-border/40"
                    placeholder="Your Smile, Our Priority"
                    value={get("hero_title")}
                    onChange={(e) => set("hero_title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Hero Subtitle</Label>
                  <Input
                    className="bg-muted/30 border-border/40"
                    placeholder="Professional dental care for the whole family"
                    value={get("hero_subtitle")}
                    onChange={(e) => set("hero_subtitle", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Hero Background Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-36 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center overflow-hidden">
                      {get("hero_image_url") ? (
                        <img src={get("hero_image_url")} alt="Hero" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <input ref={heroImageRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
                      <Button variant="outline" size="sm" onClick={() => heroImageRef.current?.click()} disabled={heroUploading}>
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        {heroUploading ? "Uploading..." : "Upload Image"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1">Recommended: 1920×800px</p>
                    </div>
                  </div>
                </div>
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery */}
          <TabsContent value="gallery" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Gallery</CardTitle>
                <CardDescription>Add procedure photos and clinic images shown in a masonry grid on your website</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Upload new */}
                <div className="border border-dashed border-border/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Add Gallery Image</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Title (optional)</Label>
                      <Input className="bg-muted/30 border-border/40 h-8 text-xs" placeholder="e.g. Teeth Whitening" value={newGalleryTitle} onChange={(e) => setNewGalleryTitle(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input className="bg-muted/30 border-border/40 h-8 text-xs" placeholder="e.g. Before & after" value={newGalleryDesc} onChange={(e) => setNewGalleryDesc(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <input ref={galleryImageRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
                    <Button variant="outline" size="sm" onClick={() => galleryImageRef.current?.click()} disabled={galleryUploading}>
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      {galleryUploading ? "Uploading..." : "Upload & Add"}
                    </Button>
                  </div>
                </div>

                {/* Existing gallery items */}
                {gallery.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No gallery images yet. Upload your first image above.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {gallery.map((item, i) => (
                      <div key={item.id} className="relative group rounded-lg overflow-hidden border border-border/40 bg-card/50">
                        <img src={item.image_url} alt={item.title || "Gallery"} className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => removeGalleryItem(i)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {item.title && (
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{item.title}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Gallery"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operating Hours */}
          <TabsContent value="hours" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Operating Hours</CardTitle>
                <CardDescription>Set your clinic's working hours</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 max-w-lg">
                {hours.map((h, i) => (
                  <div key={h.day} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                    <span className="text-sm font-medium w-24">{h.day}</span>
                    <Switch
                      checked={!h.closed}
                      onCheckedChange={(checked) => updateHour(i, "closed", !checked)}
                    />
                    {!h.closed ? (
                      <>
                        <Input type="time" className="w-28 bg-muted/30 h-8 text-xs" value={h.open} onChange={(e) => updateHour(i, "open", e.target.value)} />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="time" className="w-28 bg-muted/30 h-8 text-xs" value={h.close} onChange={(e) => updateHour(i, "close", e.target.value)} />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">Closed</span>
                    )}
                  </div>
                ))}
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20 mt-4" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Hours"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Color Theme</CardTitle>
                <CardDescription>Customize your website's brand colors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-8 w-8 rounded border border-border/40 cursor-pointer" value={get("primary_color") || "#2563eb"} onChange={(e) => set("primary_color", e.target.value)} />
                      <Input className="bg-muted/30 border-border/40 flex-1" value={get("primary_color") || "#2563eb"} onChange={(e) => set("primary_color", e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="h-8 w-8 rounded border border-border/40 cursor-pointer" value={get("accent_color") || "#1d4ed8"} onChange={(e) => set("accent_color", e.target.value)} />
                      <Input className="bg-muted/30 border-border/40 flex-1" value={get("accent_color") || "#1d4ed8"} onChange={(e) => set("accent_color", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border/40">
                  <p className="text-xs text-muted-foreground mb-2">Preview</p>
                  <div className="flex gap-3">
                    <div className="h-10 w-20 rounded-md" style={{ backgroundColor: get("primary_color") || "#2563eb" }} />
                    <div className="h-10 w-20 rounded-md" style={{ backgroundColor: get("accent_color") || "#1d4ed8" }} />
                    <div className="h-10 flex-1 rounded-md flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: get("primary_color") || "#2563eb" }}>
                      Book Now
                    </div>
                  </div>
                </div>
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Colors"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Social & Contact */}
          <TabsContent value="social" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Social Links & Contact</CardTitle>
                <CardDescription>Connect your social media and WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg pt-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">WhatsApp Number</Label>
                  <Input className="bg-muted/30 border-border/40" placeholder="e.g. 2348012345678" value={get("whatsapp_number")} onChange={(e) => set("whatsapp_number", e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Include country code without + sign</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Instagram URL</Label>
                  <Input className="bg-muted/30 border-border/40" placeholder="https://instagram.com/yourclinic" value={get("instagram_url")} onChange={(e) => set("instagram_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Facebook URL</Label>
                  <Input className="bg-muted/30 border-border/40" placeholder="https://facebook.com/yourclinic" value={get("facebook_url")} onChange={(e) => set("facebook_url", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Google Review URL</Label>
                  <Input className="bg-muted/30 border-border/40" placeholder="https://g.page/yourclinic/review" value={get("google_review_url")} onChange={(e) => set("google_review_url", e.target.value)} />
                </div>
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Social Links"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trust & Certifications */}
          <TabsContent value="trust" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Certifications & Licenses</CardTitle>
                <CardDescription>Display trust signals on your website</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-w-lg">
                <div className="flex gap-2">
                  <Input className="bg-muted/30 border-border/40 flex-1" placeholder="e.g. Licensed by Nigerian Medical Council" value={newCert} onChange={(e) => setNewCert(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCert()} />
                  <Button variant="outline" onClick={addCert} disabled={!newCert.trim()}>
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {certs.map((cert, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-sm">{cert.title}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCert(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {certs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No certifications added yet</p>}
                </div>
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Certifications"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking */}
          <TabsContent value="booking" className="mt-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">Booking Settings</CardTitle>
                <CardDescription>Customize the booking experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg pt-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Welcome Text (shown on website header)</Label>
                  <Textarea
                    className="bg-muted/30 border-border/40 min-h-[60px]"
                    placeholder="Welcome to our clinic! Book your appointment today."
                    value={get("welcome_text")}
                    onChange={(e) => set("welcome_text", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Booking Confirmation Message</Label>
                  <Textarea
                    className="bg-muted/30 border-border/40 min-h-[60px]"
                    placeholder="Thank you for booking! We'll confirm your appointment shortly via WhatsApp."
                    value={get("booking_confirmation_message")}
                    onChange={(e) => set("booking_confirmation_message", e.target.value)}
                  />
                </div>
                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Booking Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Page sections (one-page layout) */}
          <TabsContent value="pagecontent" className="mt-4 space-y-4">
            <Card className="glass-card">
              <CardHeader className="border-b border-border/30">
                <CardTitle className="text-base">One-Page Layout Content</CardTitle>
                <CardDescription>
                  Your site is a single scrolling page: Hero → About → Services &amp; Booking → Reviews → Visit → Footer.
                  Edit the copy for each band here. Colours and fonts still come from your chosen template.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-lg pt-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hero</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Eyebrow badge</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Asaba's Premier Dental Clinic" value={get("hero_eyebrow")} onChange={(e) => set("hero_eyebrow", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Highlighted second line</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Personal Touch." value={get("hero_highlight")} onChange={(e) => set("hero_highlight", e.target.value)} />
                    <p className="text-[10px] text-muted-foreground">Shown under the hero title in your primary colour.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Hero badge card title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Same-day appointments" value={get("hero_badge_title")} onChange={(e) => set("hero_badge_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Hero badge card subtitle</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Call or book online and we'll fit you in." value={get("hero_badge_subtitle")} onChange={(e) => set("hero_badge_subtitle", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About section</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Eyebrow</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="About us" value={get("about_eyebrow")} onChange={(e) => set("about_eyebrow", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Dental excellence, redefined for Asaba." value={get("about_title")} onChange={(e) => set("about_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Paragraph 1</Label>
                    <Textarea className="bg-muted/30 border-border/40 min-h-[80px]" value={get("about_body")} onChange={(e) => set("about_body", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Paragraph 2</Label>
                    <Textarea className="bg-muted/30 border-border/40 min-h-[80px]" value={get("about_body_2")} onChange={(e) => set("about_body_2", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Highlight banner title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Trusted by 5,000+ patients" value={get("about_highlight_title")} onChange={(e) => set("about_highlight_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Highlight banner subtitle</Label>
                    <Input className="bg-muted/30 border-border/40" value={get("about_highlight_subtitle")} onChange={(e) => set("about_highlight_subtitle", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Services &amp; booking band</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Eyebrow</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Our services" value={get("booking_eyebrow")} onChange={(e) => set("booking_eyebrow", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Select your services & book instantly." value={get("booking_section_title")} onChange={(e) => set("booking_section_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Subtitle</Label>
                    <Textarea className="bg-muted/30 border-border/40 min-h-[60px]" value={get("booking_section_subtitle")} onChange={(e) => set("booking_section_subtitle", e.target.value)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Services listed here come from your Treatments page, grouped by category.</p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reviews band</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Eyebrow</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Patient stories" value={get("reviews_eyebrow")} onChange={(e) => set("reviews_eyebrow", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="What our patients say." value={get("reviews_title")} onChange={(e) => set("reviews_title", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visit band</p>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Eyebrow</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Location" value={get("visit_eyebrow")} onChange={(e) => set("visit_eyebrow", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Title</Label>
                    <Input className="bg-muted/30 border-border/40" placeholder="Visit us today." value={get("visit_title")} onChange={(e) => set("visit_title", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Subtitle</Label>
                    <Textarea className="bg-muted/30 border-border/40 min-h-[60px]" value={get("visit_subtitle")} onChange={(e) => set("visit_subtitle", e.target.value)} />
                  </div>
                </div>

                <Button className="bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20" onClick={() => handleSave()} disabled={updateClinic.isPending}>
                  {updateClinic.isPending ? "Saving..." : "Save Page Content"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </motion.div>
    </div>
  );
}
