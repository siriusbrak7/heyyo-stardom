import { PricingTier, Testimonial, PromoCode } from "./types";

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Basic",
    price: "0",
    formats: ["MP3"],
    features: [
      "MP3 Only",
      "30 Downloads / month",
      "Personal use only",
      "No commercial rights",
      "Standard Support"
    ]
  },
  {
    name: "Pro",
    price: "39.99",
    badge: "Most Popular",
    primary: true,
    formats: ["MP3", "WAV"],
    features: [
      "MP3 + High-Res WAV",
      "Unlimited Downloads",
      "Basic Commercial Rights",
      "Up to 100k streams",
      "Priority Support"
    ]
  },
  {
    name: "Exclusive",
    price: "99.99",
    badge: "Best Value",
    formats: ["MP3", "WAV", "Stems"],
    features: [
      "All Formats + Stems",
      "Exclusive Beats included",
      "Full Commercial Rights",
      "Unlimited Streams",
      "Dedicated Manager"
    ]
  }
];

// Removed FEATURED_BEATS - now fetched from Supabase

export const PROMO_CODES: PromoCode[] = [
  { code: "START50", discount: 50, tier: "Basic", expires: "2024-12-31" },
  { code: "PROMOTION", discount: 20, tier: "All", expires: "2024-11-15" },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Marcus J.",
    role: "Independent Producer",
    content: "Curry Stardom's Pro plan changed my workflow. The WAV quality is unmatched, and I've already cleared 50k streams on my latest track using their beats.",
    avatar: "https://i.pravatar.cc/150?u=marcus"
  },
  {
    id: "2",
    name: "Elena Ray",
    role: "Vocalist / Songwriter",
    content: "The tempo adjuster on the homepage let me find the perfect vibe before I even signed up. The 'Exclusive' stems are a lifesaver for mixing!",
    avatar: "https://i.pravatar.cc/150?u=elena"
  }
];
