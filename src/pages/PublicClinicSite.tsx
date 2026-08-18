import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  MapPin, Phone, Mail, CheckCircle, Calendar, Star,
  ChevronDown, MessageCircle, Instagram, Facebook, ExternalLink,
  Loader2, Users, Award, ShoppingBag, Stethoscope,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { getTemplate, type WebsiteTemplate } from "@/config/websiteTemplates";
import type { SiteSettings as ClinicSiteSettings } from "@/hooks/useClinicSettings";

interface GalleryItem {
  id: string;
  image_url: string;
  title?: string;
  description?: string;
}

type SiteSettings = ClinicSiteSettings;

interface ClinicInfo {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: SiteSettings | null;
}

interface Treatment {
  id: string;
  name: string;
  price: number;
  category: string | null;
  description: string | null;
  duration: number | null;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  specialty: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patients?: { first_name: string; last_name: string } | null;
}

function FadeInSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PublicClinicSite() {
  const { slug } = useParams<{ slug: string }>();
  const [clinic, setClinic] = useState<ClinicInfo | null>(null);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [headerSolid, setHeaderSolid] = useState(false);

  // Booking form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const bookingRef = useRef<HTMLDivElement>(null);

  const s = clinic?.settings || {};
  const tpl: WebsiteTemplate = getTemplate(s.template);
  const c = tpl.colors;
  // Clinic-chosen colors override the template palette accents
  const primaryColor = s.primary_color || c.primary;
  const accentColor = s.accent_color || c.accent;
  const radius = tpl.radius;

  const dynamicStyles = useMemo(() => ({
    "--site-primary": primaryColor,
    "--site-accent": accentColor,
    backgroundColor: c.bg,
    color: c.text,
    fontFamily: tpl.font,
  } as React.CSSProperties), [primaryColor, accentColor, c.bg, c.text, tpl.font]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: radius,
  };
  const headingStyle: React.CSSProperties = { fontFamily: tpl.headingFont, color: c.text };
  const mutedStyle: React.CSSProperties = { color: c.muted };

  useEffect(() => {
    const handleScroll = () => setHeaderSolid(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!slug) return;
    const fetchClinic = async () => {
      const { data: org, error } = await supabase
        .from("organizations")
        .select("id, name, address, phone, email, logo_url, settings")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !org) { setNotFound(true); setLoading(false); return; }
      setClinic(org as ClinicInfo);

      const [treatmentsRes, staffRes, reviewsRes] = await Promise.all([
        supabase.from("treatments").select("id, name, price, category, description, duration").eq("org_id", org.id).eq("status", "active").order("category"),
        supabase.from("staff").select("id, full_name, role, specialty").eq("org_id", org.id).eq("status", "active").in("role", ["dentist", "doctor", "hygienist", "owner"]),
        supabase.from("patient_reviews").select("id, rating, comment, created_at, patients(first_name, last_name)").eq("org_id", org.id).order("created_at", { ascending: false }).limit(6),
      ]);

      setTreatments(treatmentsRes.data || []);
      setStaff(staffRes.data || []);
      setReviews((reviewsRes.data as any) || []);
      setLoading(false);
    };
    fetchClinic();
  }, [slug]);

  const handleBook = async () => {
    if (!name || !phone || !selectedStaff || !date || !time) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setBooking(true);
    try {
      const res = await supabase.functions.invoke("public-booking", {
        body: { org_slug: slug, patient_name: name, patient_phone: phone, staff_id: selectedStaff, treatment_id: selectedTreatment || null, appointment_date: date, appointment_time: time },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message || "Booking failed");
      setBooked(true);
      toast({ title: "Appointment booked successfully!" });
    } catch (err: any) {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const scrollToBooking = () => bookingRef.current?.scrollIntoView({ behavior: "smooth" });

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-5xl mx-auto space-y-8 pt-20">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinic Not Found</h1>
          <p className="text-gray-500">This clinic page doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : null;
  const hours = s.operating_hours || [];
  const certs = s.certifications || [];
  const gallery = s.gallery_items || [];
  const confirmMsg = s.booking_confirmation_message || "We'll be in touch to confirm your appointment.";
  const heroTitle = s.hero_title || s.welcome_text || `Welcome to ${clinic?.name}`;
  const heroSubtitle = s.hero_subtitle || s.short_description || "Professional dental care for you and your family";

  const SectionTitle = ({ title, subtitle, align = "center" }: { title: string; subtitle?: string; align?: "center" | "left" }) => (
    <div className={`mb-10 ${align === "center" ? "text-center" : ""}`}>
      <h2 className="text-3xl font-bold" style={headingStyle}>{title}</h2>
      {subtitle && <p className="mt-2" style={mutedStyle}>{subtitle}</p>}
    </div>
  );

  const ctaButtons = (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      {s.hero_cta_type === "whatsapp" && s.whatsapp_number ? (
        <Button size="lg" className="font-semibold px-8 shadow-lg text-base text-white bg-green-500 hover:bg-green-600" style={{ borderRadius: radius }} asChild>
          <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-5 w-5" /> {s.hero_cta_label || "Chat on WhatsApp"}
          </a>
        </Button>
      ) : s.hero_cta_type === "call" && clinic?.phone ? (
        <Button size="lg" className="font-semibold px-8 shadow-lg text-base text-white" style={{ backgroundColor: primaryColor, borderRadius: radius }} asChild>
          <a href={`tel:${clinic.phone}`}><Phone className="mr-2 h-5 w-5" /> {s.hero_cta_label || "Call Now"}</a>
        </Button>
      ) : (
        <Button size="lg" className="font-semibold px-8 shadow-lg text-base text-white" style={{ backgroundColor: primaryColor, borderRadius: radius }} onClick={scrollToBooking}>
          <Calendar className="mr-2 h-5 w-5" /> {s.hero_cta_label || "Book Appointment"}
        </Button>
      )}
      {clinic?.phone && (
        <Button size="lg" variant="outline" className="px-8 text-base" style={{ borderColor: c.border, color: c.text, backgroundColor: "transparent", borderRadius: radius }} asChild>
          <a href={`tel:${clinic.phone}`}><Phone className="mr-2 h-5 w-5" /> Call Us</a>
        </Button>
      )}
    </div>
  );

  const heroStats = (
    <div className="mt-10 flex flex-wrap items-center gap-6 sm:gap-10">
      {staff.length > 0 && (
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" style={{ color: primaryColor }} />
          <span className="text-sm font-medium" style={mutedStyle}>{staff.length} Doctor{staff.length > 1 ? "s" : ""}</span>
        </div>
      )}
      {treatments.length > 0 && (
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" style={{ color: primaryColor }} />
          <span className="text-sm font-medium" style={mutedStyle}>{treatments.length} Services</span>
        </div>
      )}
      {avgRating && (
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium" style={mutedStyle}>{avgRating} Rating</span>
        </div>
      )}
    </div>
  );

  /* ───────── Hero variants ───────── */
  const renderHero = () => {
    const title = <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 leading-tight" style={headingStyle}>{heroTitle}</h1>;
    const sub = <p className="text-lg sm:text-xl mb-8 max-w-xl" style={mutedStyle}>{heroSubtitle}</p>;

    switch (tpl.hero) {
      case "split":
        return (
          <section className="pt-28 pb-16" style={{ backgroundColor: c.heroBg }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
              <div>{title}{sub}{ctaButtons}{heroStats}</div>
              <div className="overflow-hidden shadow-xl" style={{ borderRadius: radius, minHeight: 320, backgroundColor: hexToRgba(primaryColor, 0.12), backgroundImage: s.hero_image_url ? `url(${s.hero_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }} />
            </div>
          </section>
        );
      case "image-full":
        return (
          <section className="relative min-h-[75vh] flex items-end" style={{ backgroundColor: c.heroBg, backgroundImage: s.hero_image_url ? `url(${s.hero_image_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0.25))" }} />
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-32 text-white">
              <h1 className="text-4xl sm:text-6xl font-bold mb-4 leading-tight" style={{ fontFamily: tpl.headingFont }}>{heroTitle}</h1>
              <p className="text-lg sm:text-xl mb-8 max-w-xl text-white/80">{heroSubtitle}</p>
              {ctaButtons}
            </div>
          </section>
        );
      case "minimal":
        return (
          <section className="pt-40 pb-20" style={{ backgroundColor: c.heroBg }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6">
              <p className="text-xs uppercase tracking-[0.3em] mb-6" style={mutedStyle}>{clinic?.name}</p>
              {title}{sub}{ctaButtons}
            </div>
          </section>
        );
      case "bold-left":
        return (
          <section className="pt-32 pb-16" style={{ backgroundColor: c.heroBg }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <div className="max-w-2xl border-l-4 pl-6" style={{ borderColor: primaryColor }}>
                {title}{sub}{ctaButtons}
              </div>
              {heroStats}
            </div>
          </section>
        );
      case "gradient":
        return (
          <section className="pt-32 pb-20 text-center" style={{ background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.14)}, ${hexToRgba(accentColor, 0.18)})` }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center">
              {title}{sub}{ctaButtons}
              <div className="flex justify-center w-full">{heroStats}</div>
            </div>
          </section>
        );
      case "card":
        return (
          <section className="pt-28 pb-16 px-4" style={{ backgroundColor: c.heroBg }}>
            <div className="max-w-5xl mx-auto p-10 sm:p-14 text-center shadow-xl" style={{ ...cardStyle, borderRadius: `calc(${radius} * 2)` }}>
              <div className="flex flex-col items-center">{title}{sub}{ctaButtons}</div>
            </div>
          </section>
        );
      case "dark":
        return (
          <section className="relative pt-36 pb-24 overflow-hidden" style={{ backgroundColor: c.heroBg }}>
            <div className="absolute -top-40 right-0 w-[520px] h-[520px] rounded-full blur-3xl" style={{ backgroundColor: hexToRgba(primaryColor, 0.18) }} />
            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
              <span className="text-xs uppercase tracking-[0.35em] mb-5" style={{ color: primaryColor }}>Premium Dental Care</span>
              {title}{sub}{ctaButtons}
            </div>
          </section>
        );
      case "editorial":
        return (
          <section className="pt-32 pb-14" style={{ backgroundColor: c.heroBg, borderBottom: `1px solid ${c.border}` }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-8">{title}</div>
              <div className="lg:col-span-4">{sub}{ctaButtons}</div>
            </div>
          </section>
        );
      case "wave":
        return (
          <section className="relative pt-32 pb-24 text-center overflow-hidden" style={{ backgroundColor: c.heroBg }}>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center">{title}{sub}{ctaButtons}</div>
            <svg viewBox="0 0 1440 120" className="absolute bottom-0 left-0 w-full" preserveAspectRatio="none" style={{ height: 80 }}>
              <path d="M0,64 C360,140 1080,-20 1440,64 L1440,120 L0,120 Z" fill={c.bg} />
            </svg>
          </section>
        );
      default:
        return (
          <section className="relative min-h-[65vh] flex items-center justify-center overflow-hidden" style={{ backgroundColor: c.heroBg }}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-32 -right-48 w-[600px] h-[600px] rounded-full blur-3xl" style={{ backgroundColor: hexToRgba(primaryColor, 0.07) }} />
              <div className="absolute -bottom-32 -left-48 w-[500px] h-[500px] rounded-full blur-3xl" style={{ backgroundColor: hexToRgba(accentColor, 0.06) }} />
            </div>
            {s.hero_image_url && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.hero_image_url})`, opacity: 0.08 }} />}
            <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-20 flex flex-col items-center">
              {title}{sub}{ctaButtons}
              <div className="flex justify-center w-full">{heroStats}</div>
            </div>
            <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <ChevronDown className="h-6 w-6" style={{ color: c.muted }} />
            </motion.div>
          </section>
        );
    }
  };

  /* ───────── Sections ───────── */
  const bookingSection = (
    <FadeInSection key="booking" className="mb-20">
      <div ref={bookingRef} className="scroll-mt-24 overflow-hidden shadow-md" style={cardStyle}>
        <div className="p-6" style={{ borderBottom: `1px solid ${c.border}` }}>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={headingStyle}>
            <Calendar className="h-6 w-6" style={{ color: primaryColor }} /> Book an Appointment
          </h2>
          <p className="mt-1 text-sm" style={mutedStyle}>Select your preferred service, doctor, date and time</p>
        </div>
        <div className="p-6">
          {booked ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10 space-y-4">
              <div className="h-16 w-16 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}>
                <CheckCircle className="h-8 w-8" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-bold" style={headingStyle}>Appointment Booked!</h3>
              <p className="text-sm max-w-sm mx-auto" style={mutedStyle}>{confirmMsg}</p>
              <Button variant="outline" style={{ borderColor: c.border, color: c.text }} onClick={() => { setBooked(false); setName(""); setPhone(""); setSelectedStaff(""); setSelectedTreatment(""); setDate(""); setTime(""); }}>
                Book Another
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Full Name *</label>
                <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="h-11" style={{ borderColor: c.border }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Phone *</label>
                <Input placeholder="080xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" style={{ borderColor: c.border }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Service</label>
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="h-11" style={{ borderColor: c.border }}><SelectValue placeholder="Select service (optional)" /></SelectTrigger>
                  <SelectContent>
                    {treatments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} — ₦{t.price.toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Doctor *</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="h-11" style={{ borderColor: c.border }}><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}{m.specialty ? ` — ${m.specialty}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Preferred Date *</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={new Date().toISOString().split("T")[0]} className="h-11" style={{ borderColor: c.border }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Preferred Time *</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11" style={{ borderColor: c.border }} />
              </div>
              <div className="sm:col-span-2">
                <Button className="w-full h-12 text-white text-base font-semibold shadow-sm" style={{ backgroundColor: primaryColor, borderRadius: radius }} onClick={handleBook} disabled={booking}>
                  {booking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</> : "Book Appointment"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </FadeInSection>
  );

  const servicesSection = treatments.length > 0 ? (
    <FadeInSection key="services" className="mb-20">
      <SectionTitle title="Our Services" subtitle="Comprehensive dental treatments" align={tpl.hero === "editorial" || tpl.hero === "bold-left" ? "left" : "center"} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {treatments.slice(0, 12).map((t, i) => (
          <FadeInSection key={t.id} delay={i * 0.04}>
            <div className="p-5 h-full shadow-sm" style={cardStyle}>
              <div className="h-10 w-10 flex items-center justify-center mb-3" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), borderRadius: radius }}>
                <Stethoscope className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold" style={headingStyle}>{t.name}</h3>
              {t.description && <p className="text-sm mt-1 line-clamp-2" style={mutedStyle}>{t.description}</p>}
              <div className="flex items-center justify-between mt-4">
                <span className="font-bold" style={{ color: primaryColor }}>₦{t.price.toLocaleString()}</span>
                {t.duration && <span className="text-xs" style={mutedStyle}>{t.duration} min</span>}
              </div>
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  const gallerySection = gallery.length > 0 ? (
    <FadeInSection key="gallery" className="mb-20">
      <SectionTitle title="Our Gallery" subtitle="See our procedures and facilities" />
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
        {gallery.map((item, i) => (
          <FadeInSection key={item.id} delay={i * 0.05}>
            <div className="break-inside-avoid group relative overflow-hidden shadow-sm" style={cardStyle}>
              <img src={item.image_url} alt={item.title || "Gallery image"} className="w-full h-auto object-cover" loading="lazy" />
              {(item.title || item.description) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div>
                    {item.title && <p className="text-white font-semibold text-sm">{item.title}</p>}
                    {item.description && <p className="text-white/80 text-xs mt-0.5">{item.description}</p>}
                  </div>
                </div>
              )}
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  const doctorsSection = staff.length > 0 ? (
    <FadeInSection key="doctors" className="mb-20">
      <SectionTitle title="Our Doctors" subtitle="Experienced professionals dedicated to your care" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((doc, i) => (
          <FadeInSection key={doc.id} delay={i * 0.08}>
            <div className="text-center p-6 shadow-sm" style={cardStyle}>
              <div className="h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-white shadow-sm" style={{ backgroundColor: primaryColor }}>
                {doc.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <h3 className="font-semibold text-lg" style={headingStyle}>{doc.full_name}</h3>
              {doc.specialty && <p className="text-sm mt-1" style={{ color: primaryColor }}>{doc.specialty}</p>}
              <p className="mt-2 text-xs capitalize" style={mutedStyle}>{doc.role}</p>
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  const reviewsSection = reviews.length > 0 ? (
    <FadeInSection key="reviews" className="mb-20">
      <SectionTitle title="What Patients Say" subtitle={avgRating ? `${avgRating} average rating` : undefined} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r, i) => (
          <FadeInSection key={r.id} delay={i * 0.06}>
            <div className="p-5 h-full shadow-sm" style={cardStyle}>
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className={`h-4 w-4 ${k < r.rating ? "fill-yellow-400 text-yellow-400" : ""}`} style={k < r.rating ? undefined : { color: c.border }} />
                ))}
              </div>
              {r.comment && <p className="text-sm" style={{ color: c.text }}>“{r.comment}”</p>}
              <p className="text-xs mt-3" style={mutedStyle}>
                {r.patients ? `${r.patients.first_name} ${r.patients.last_name?.[0] || ""}.` : "Verified patient"}
              </p>
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  const hoursSection = hours.length > 0 ? (
    <FadeInSection key="hours" className="mb-20">
      <SectionTitle title="Operating Hours" />
      <div className="max-w-md mx-auto shadow-sm overflow-hidden" style={cardStyle}>
        {hours.map((h, i) => {
          const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }) === h.day;
          return (
            <div key={h.day} className="flex items-center justify-between px-6 py-3.5" style={{ borderBottom: i < hours.length - 1 ? `1px solid ${c.border}` : undefined, backgroundColor: isToday ? hexToRgba(primaryColor, 0.05) : undefined }}>
              <span className="text-sm" style={{ color: isToday ? c.text : c.muted, fontWeight: isToday ? 700 : 400 }}>
                {h.day} {isToday && <span className="text-xs ml-1" style={{ color: primaryColor }}>(Today)</span>}
              </span>
              <span className="text-sm" style={{ color: h.closed ? c.muted : c.text, fontWeight: h.closed ? 400 : 600 }}>
                {h.closed ? "Closed" : `${h.open} – ${h.close}`}
              </span>
            </div>
          );
        })}
      </div>
    </FadeInSection>
  ) : null;

  const contactSection = (
    <FadeInSection key="contact" className="mb-20">
      <SectionTitle title="Contact & Address" subtitle="Get in touch with us" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {clinic?.address && (
          <div className="p-5 flex items-start gap-3 shadow-sm" style={cardStyle}>
            <div className="h-10 w-10 flex items-center justify-center shrink-0" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), borderRadius: radius }}>
              <MapPin className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Address</p>
              <p className="text-sm mt-0.5" style={{ color: c.text }}>{clinic.address}</p>
            </div>
          </div>
        )}
        {clinic?.phone && (
          <div className="p-5 flex items-start gap-3 shadow-sm" style={cardStyle}>
            <div className="h-10 w-10 flex items-center justify-center shrink-0" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), borderRadius: radius }}>
              <Phone className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Phone</p>
              <a href={`tel:${clinic.phone}`} className="text-sm mt-0.5 hover:underline block" style={{ color: c.text }}>{clinic.phone}</a>
            </div>
          </div>
        )}
        {clinic?.email && (
          <div className="p-5 flex items-start gap-3 shadow-sm" style={cardStyle}>
            <div className="h-10 w-10 flex items-center justify-center shrink-0" style={{ backgroundColor: hexToRgba(primaryColor, 0.08), borderRadius: radius }}>
              <Mail className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Email</p>
              <a href={`mailto:${clinic.email}`} className="text-sm mt-0.5 hover:underline block" style={{ color: c.text }}>{clinic.email}</a>
            </div>
          </div>
        )}
        {s.whatsapp_number && (
          <div className="p-5 flex items-start gap-3 shadow-sm" style={cardStyle}>
            <div className="h-10 w-10 flex items-center justify-center shrink-0 bg-green-50" style={{ borderRadius: radius }}>
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>WhatsApp</p>
              <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="text-sm mt-0.5 hover:underline block" style={{ color: c.text }}>Chat with us</a>
            </div>
          </div>
        )}
      </div>
    </FadeInSection>
  );

  const certsSection = certs.length > 0 ? (
    <FadeInSection key="certs" className="mb-20">
      <div className="flex flex-wrap justify-center gap-4">
        {certs.map((cert, i) => (
          <div key={i} className="flex items-center gap-2 px-5 py-3 rounded-full" style={{ border: `1px solid ${c.border}`, backgroundColor: c.surface }}>
            <Award className="h-4 w-4" style={{ color: primaryColor }} />
            <span className="text-sm font-medium" style={{ color: c.text }}>{cert.title}</span>
          </div>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  /* ── Trust bar ── */
  const trustItems = [
    s.trust_years ? { label: "Years in practice", value: s.trust_years } : null,
    s.trust_patients ? { label: "Patients treated", value: s.trust_patients } : null,
    (s.trust_rating || avgRating) ? { label: "Patient rating", value: `${s.trust_rating || avgRating} ★` } : null,
    s.trust_extra_value ? { label: s.trust_extra_label || "Certified", value: s.trust_extra_value } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const trustBarSection = s.show_trust_bar === false || (trustItems.length === 0 && certs.length === 0) ? null : (
    <FadeInSection key="trustbar" className="mb-20">
      <div className="p-6 sm:p-8 shadow-sm" style={cardStyle}>
        {trustItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {trustItems.map((t) => (
              <div key={t.label}>
                <p className="text-2xl sm:text-3xl font-bold" style={{ color: primaryColor, fontFamily: tpl.headingFont }}>{t.value}</p>
                <p className="text-xs mt-1 uppercase tracking-wider" style={mutedStyle}>{t.label}</p>
              </div>
            ))}
          </div>
        )}
        {certs.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 mt-6 pt-6" style={{ borderTop: trustItems.length ? `1px solid ${c.border}` : undefined }}>
            {certs.map((cert, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full" style={{ border: `1px solid ${c.border}`, color: c.text }}>
                <Award className="h-3.5 w-3.5" style={{ color: primaryColor }} /> {cert.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </FadeInSection>
  );

  /* ── Services overview (custom cards, falls back to treatments) ── */
  const serviceCards = s.service_cards || [];
  const servicesOverviewSection = serviceCards.length > 0 ? (
    <FadeInSection key="services-overview" className="mb-20">
      <SectionTitle title={s.services_title || "Our Services"} subtitle={s.services_subtitle || "Comprehensive dental care under one roof"} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCards.map((sc, i) => (
          <FadeInSection key={`${sc.title}-${i}`} delay={i * 0.05}>
            <div className="p-5 h-full shadow-sm" style={cardStyle}>
              <div className="h-10 w-10 flex items-center justify-center mb-3" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), borderRadius: radius }}>
                <Stethoscope className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              <h3 className="font-semibold" style={headingStyle}>{sc.title}</h3>
              {sc.description && <p className="text-sm mt-1" style={mutedStyle}>{sc.description}</p>}
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : servicesSection;

  /* ── Why choose us ── */
  const whyItems = s.why_items || [];
  const whySection = whyItems.length > 0 ? (
    <FadeInSection key="why" className="mb-20">
      <SectionTitle title={s.why_title || "Why Choose Us"} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {whyItems.map((w, i) => (
          <FadeInSection key={`${w.title}-${i}`} delay={i * 0.06}>
            <div className="p-5 h-full shadow-sm" style={cardStyle}>
              <CheckCircle className="h-6 w-6 mb-3" style={{ color: primaryColor }} />
              <h3 className="font-semibold" style={headingStyle}>{w.title}</h3>
              {w.description && <p className="text-sm mt-1" style={mutedStyle}>{w.description}</p>}
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  /* ── Meet the dentist ── */
  const dentistSection = s.dentist_name ? (
    <FadeInSection key="dentist" className="mb-20">
      <SectionTitle title="Meet the Dentist" />
      <div className="grid lg:grid-cols-5 gap-8 items-center p-6 sm:p-8 shadow-sm" style={cardStyle}>
        <div className="lg:col-span-2">
          <div
            className="w-full overflow-hidden"
            style={{ borderRadius: radius, minHeight: 260, backgroundColor: hexToRgba(primaryColor, 0.1), backgroundImage: s.dentist_photo_url ? `url(${s.dentist_photo_url})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        </div>
        <div className="lg:col-span-3">
          <h3 className="text-2xl font-bold" style={headingStyle}>{s.dentist_name}</h3>
          {s.dentist_credentials && <p className="text-sm mt-1 font-medium" style={{ color: primaryColor }}>{s.dentist_credentials}</p>}
          {s.dentist_bio && <p className="text-sm mt-4 whitespace-pre-line leading-relaxed" style={mutedStyle}>{s.dentist_bio}</p>}
          <div className="mt-6">{ctaButtons}</div>
        </div>
      </div>
    </FadeInSection>
  ) : null;

  /* ── Testimonials (manual first, else patient reviews) ── */
  const manualTestimonials = s.testimonials || [];
  const testimonialsSection = manualTestimonials.length > 0 ? (
    <FadeInSection key="testimonials" className="mb-20">
      <SectionTitle title="What Patients Say" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {manualTestimonials.map((t, i) => (
          <FadeInSection key={`${t.name}-${i}`} delay={i * 0.06}>
            <div className="p-5 h-full shadow-sm" style={cardStyle}>
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: 5 }).map((_, k) => (
                  <Star key={k} className={`h-4 w-4 ${k < (t.rating || 5) ? "fill-yellow-400 text-yellow-400" : ""}`} style={k < (t.rating || 5) ? undefined : { color: c.border }} />
                ))}
              </div>
              <p className="text-sm" style={{ color: c.text }}>“{t.text}”</p>
              <div className="flex items-center gap-2 mt-3">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                ) : (
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: primaryColor }}>
                    {t.name?.[0] || "P"}
                  </div>
                )}
                <span className="text-xs font-medium" style={mutedStyle}>{t.name}</span>
              </div>
            </div>
          </FadeInSection>
        ))}
      </div>
    </FadeInSection>
  ) : reviewsSection;

  /* ── Pricing / what to expect ── */
  const pricingItems = s.pricing_items || [];
  const pricingSection = (pricingItems.length > 0 || s.what_to_expect) ? (
    <FadeInSection key="pricing" className="mb-20">
      <SectionTitle title={s.pricing_title || "Pricing & What to Expect"} subtitle={s.pricing_note} />
      <div className="grid lg:grid-cols-2 gap-6">
        {pricingItems.length > 0 && (
          <div className="overflow-hidden shadow-sm" style={cardStyle}>
            {pricingItems.map((p, i) => (
              <div key={`${p.name}-${i}`} className="flex items-center justify-between px-5 py-4" style={{ borderBottom: i < pricingItems.length - 1 ? `1px solid ${c.border}` : undefined }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: c.text }}>{p.name}</p>
                  {p.note && <p className="text-xs mt-0.5" style={mutedStyle}>{p.note}</p>}
                </div>
                <span className="text-sm font-bold" style={{ color: primaryColor }}>{p.price}</span>
              </div>
            ))}
          </div>
        )}
        {s.what_to_expect && (
          <div className="p-6 shadow-sm" style={cardStyle}>
            <h3 className="font-semibold mb-2" style={headingStyle}>What to Expect</h3>
            <p className="text-sm whitespace-pre-line leading-relaxed" style={mutedStyle}>{s.what_to_expect}</p>
          </div>
        )}
      </div>
    </FadeInSection>
  ) : null;

  /* ── FAQ ── */
  const faqs = s.faqs || [];
  const faqSection = faqs.length > 0 ? (
    <FadeInSection key="faq" className="mb-20">
      <SectionTitle title="Frequently Asked Questions" />
      <div className="max-w-3xl mx-auto space-y-3">
        {faqs.map((f, i) => (
          <details key={`${f.question}-${i}`} className="p-5 shadow-sm" style={cardStyle}>
            <summary className="cursor-pointer font-medium text-sm list-none flex items-center justify-between gap-4" style={{ color: c.text }}>
              {f.question}
              <ChevronDown className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
            </summary>
            <p className="text-sm mt-3 whitespace-pre-line leading-relaxed" style={mutedStyle}>{f.answer}</p>
          </details>
        ))}
      </div>
    </FadeInSection>
  ) : null;

  /* ── Location & hours ── */
  const locationSection = (
    <FadeInSection key="location" className="mb-20">
      <SectionTitle title="Location & Hours" subtitle="Find us and plan your visit" />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="overflow-hidden shadow-sm" style={cardStyle}>
          {s.map_embed_url ? (
            <iframe
              src={s.map_embed_url}
              title="Clinic location map"
              className="w-full"
              style={{ height: 320, border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8" style={{ height: 320 }}>
              <MapPin className="h-7 w-7 mb-3" style={{ color: primaryColor }} />
              <p className="text-sm" style={{ color: c.text }}>{clinic?.address || "Address coming soon"}</p>
            </div>
          )}
        </div>
        <div className="overflow-hidden shadow-sm" style={cardStyle}>
          {clinic?.address && (
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${c.border}` }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Address</p>
              <p className="text-sm mt-1" style={{ color: c.text }}>{clinic.address}</p>
              {s.directions_url && (
                <a href={s.directions_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium mt-1 inline-block hover:underline" style={{ color: primaryColor }}>
                  Get directions
                </a>
              )}
            </div>
          )}
          {hours.map((h, i) => {
            const isToday = new Date().toLocaleDateString("en-US", { weekday: "long" }) === h.day;
            return (
              <div key={h.day} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: i < hours.length - 1 ? `1px solid ${c.border}` : undefined, backgroundColor: isToday ? hexToRgba(primaryColor, 0.05) : undefined }}>
                <span className="text-sm" style={{ color: isToday ? c.text : c.muted, fontWeight: isToday ? 700 : 400 }}>{h.day}</span>
                <span className="text-sm" style={{ color: h.closed ? c.muted : c.text, fontWeight: h.closed ? 400 : 600 }}>
                  {h.closed ? "Closed" : `${h.open} – ${h.close}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </FadeInSection>
  );

  /* ── Final CTA ── */
  const finalCtaSection = (
    <FadeInSection key="final-cta" className="mb-20">
      <div className="p-8 sm:p-12 text-center shadow-sm" style={{ ...cardStyle, background: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.12)}, ${hexToRgba(accentColor, 0.14)})` }}>
        <h2 className="text-2xl sm:text-3xl font-bold" style={headingStyle}>
          {s.final_cta_title || "Ready to book your visit?"}
        </h2>
        <p className="mt-2 text-sm sm:text-base max-w-xl mx-auto" style={mutedStyle}>
          {s.final_cta_subtitle || "Reserve your appointment in under a minute — or message us on WhatsApp."}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" className="font-semibold px-8 text-white" style={{ backgroundColor: primaryColor, borderRadius: radius }} onClick={scrollToBooking}>
            <Calendar className="mr-2 h-5 w-5" /> {s.final_cta_label || "Book Appointment"}
          </Button>
          {s.whatsapp_number && (
            <Button size="lg" className="font-semibold px-8 bg-green-500 hover:bg-green-600 text-white" style={{ borderRadius: radius }} asChild>
              <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp Us
              </a>
            </Button>
          )}
        </div>
      </div>
    </FadeInSection>
  );

  const orderedSections: React.ReactNode[] = [
    trustBarSection,
    servicesOverviewSection,
    whySection,
    gallerySection,
    dentistSection,
    doctorsSection,
    testimonialsSection,
    pricingSection,
    bookingSection,
    faqSection,
    locationSection,
    contactSection,
    finalCtaSection,
  ];

  return (
    <div className="min-h-screen" style={dynamicStyles}>
      {/* ── Sticky Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: headerSolid ? primaryColor : "transparent",
          boxShadow: headerSolid ? "0 1px 12px rgba(0,0,0,0.06)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clinic?.logo_url && (
              <img src={clinic.logo_url} alt={clinic?.name} className="h-10 w-10 rounded-full object-cover border-2 border-white/30 shadow-sm" />
            )}
            <span className="text-lg font-bold drop-shadow-sm" style={{ color: headerSolid ? "#fff" : (tpl.dark || tpl.hero === "image-full" ? "#fff" : c.text), fontFamily: tpl.headingFont }}>{clinic?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/site/${slug}/shop`}>
              <Button size="sm" variant="ghost" style={{ color: headerSolid || tpl.dark || tpl.hero === "image-full" ? "#fff" : c.muted }}>
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Shop
              </Button>
            </Link>
            {clinic?.phone && (
              <Button size="sm" variant="ghost" className="hidden sm:flex" style={{ color: headerSolid || tpl.dark || tpl.hero === "image-full" ? "#fff" : c.muted }} asChild>
                <a href={`tel:${clinic.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" /> Call</a>
              </Button>
            )}
            {s.whatsapp_number && (
              <Button size="sm" variant="ghost" style={{ color: headerSolid || tpl.dark || tpl.hero === "image-full" ? "#fff" : c.muted }} asChild>
                <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> WhatsApp
                </a>
              </Button>
            )}
            <Button size="sm" className="font-semibold shadow-md text-white" style={{ backgroundColor: primaryColor, borderRadius: radius }} onClick={scrollToBooking}>
              Book Now
            </Button>
          </div>
        </div>
      </header>

      {renderHero()}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-14">
        {orderedSections}
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${c.border}`, backgroundColor: tpl.dark ? c.surface : hexToRgba(primaryColor, 0.04) }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {clinic?.logo_url && <img src={clinic.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />}
                <span className="font-bold" style={headingStyle}>{clinic?.name}</span>
              </div>
              {s.short_description && <p className="text-sm" style={mutedStyle}>{s.short_description}</p>}
              {s.footer_note && <p className="text-xs mt-2" style={mutedStyle}>{s.footer_note}</p>}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={mutedStyle}>Quick Links</h4>
              <button onClick={scrollToBooking} className="text-sm block mb-1 hover:underline" style={{ color: c.text }}>Book Appointment</button>
              <Link to={`/site/${slug}/shop`} className="text-sm block mb-1 hover:underline" style={{ color: c.text }}>Shop</Link>
              {clinic?.phone && <a href={`tel:${clinic.phone}`} className="text-sm block mb-1 hover:underline" style={{ color: c.text }}>Call Us</a>}
              {s.whatsapp_number && (
                <a href={`https://wa.me/${s.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="text-sm block hover:underline" style={{ color: c.text }}>WhatsApp</a>
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={mutedStyle}>Contact</h4>
              {clinic?.phone && <p className="text-sm mb-1" style={{ color: c.text }}>{clinic.phone}</p>}
              {clinic?.email && <p className="text-sm mb-1" style={{ color: c.text }}>{clinic.email}</p>}
              {clinic?.address && <p className="text-sm" style={{ color: c.text }}>{clinic.address}</p>}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={mutedStyle}>Hours</h4>
              {hours.filter((h) => !h.closed).slice(0, 3).map((h) => (
                <p key={h.day} className="text-sm mb-1" style={{ color: c.text }}>{h.day}: {h.open} – {h.close}</p>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3" style={mutedStyle}>Follow Us</h4>
              <div className="flex gap-3">
                {s.instagram_url && (
                  <a href={s.instagram_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {s.facebook_url && (
                  <a href={s.facebook_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {s.google_review_url && (
                  <a href={s.google_review_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: hexToRgba(primaryColor, 0.1), color: primaryColor }}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 text-center" style={{ borderTop: `1px solid ${c.border}` }}>
            <p className="text-xs" style={mutedStyle}>© {new Date().getFullYear()} {clinic?.name}. Powered by Clinexus</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      {s.whatsapp_number && (
        <a
          href={`https://wa.me/${s.whatsapp_number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-xl hover:bg-green-600 transition-all hover:scale-110"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
