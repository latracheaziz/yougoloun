import type { Content } from './types';

/** English copy — verbatim from docs/yougoloun-content.pdf (pages 1–4). */
export const en: Content = {
  lang: 'en',
  dir: 'ltr',
  brand: { name: 'YOUGOLOUN', nameAlt: 'يقولون' },

  // §1 Navigation & Header
  nav: {
    items: [
      { target: 'home', label: 'Home' },
      { target: 'about', label: 'About' },
      { target: 'services', label: 'Services' },
      { target: 'portfolio', label: 'Portfolio' },
      { target: 'process', label: 'How We Work' },
      { target: 'faq', label: 'FAQ' },
      { target: 'contact', label: 'Contact' },
    ],
    privacy: 'Privacy Policy',
    cta: { short: "Let's Talk", long: 'Book a Strategy Call' },
  },

  // §2 Hero
  hero: {
    tagline: 'FULL-SERVICE DIGITAL MARKETING & GROWTH AGENCY FOR GCC & MENA',
    headline: 'Moving Brands Forward.',
    subheadline:
      'Strategy grounded in operations. Creative powered by AI and real-world production. Execution measured in results. We build complete digital growth engines for businesses that mean business across the GCC and MENA.',
    actions: { primary: 'Book a Strategy Call', secondary: 'View Our Work' },
    pillars: ['Strategic Execution', 'Data-Driven Growth', 'AI & Studio Production', 'Integrated Revenue Systems'],
  },

  // §3 About
  about: {
    title: 'About Yougoloun',
    body: 'Yougoloun operates as a strategic growth partner and extension of your business. We move brands beyond vanity metrics and scattered campaigns by building structured, repeatable marketing systems across brand strategy, content production, paid acquisition, and customer retention.',
  },

  // §4 Four Principal Marketing Cornerstones
  cornerstones: {
    title: 'Four Principal Marketing Cornerstones',
    statement: {
      lead: 'We operate at the intersection of four principal marketing cornerstones',
      emphasis: 'Building systems, not campaigns.',
    },
    items: [
      { key: 'performance', title: 'Performance', body: 'Data-driven acquisition strategies that maximize your return on ad spend (ROAS).' },
      { key: 'strategy', title: 'Strategy', body: 'Identity and positioning systems that build lasting brand trust.' },
      { key: 'production', title: 'Production', body: 'High-impact visual storytelling, studio shoots, and AI-assisted content systems.' },
      { key: 'growth', title: 'Growth', body: 'Integrated conversion and retention funnels for predictable scaling.' },
    ],
  },

  // §5 Core Positioning
  positioning: {
    label: 'Core Positioning',
    title: 'From Attention to Revenue Systems',
    items: [
      { num: '01', from: 'Visibility', to: 'To Conversion', body: 'Turning targeted reach into measurable store visits, inquiries, and online orders.' },
      { num: '02', from: 'Content', to: 'To Structured Systems', body: 'Replacing random posting with purposeful content engines built around customer psychology.' },
      { num: '03', from: 'Branding', to: 'To Revenue-Driven Identity', body: 'Crafting cohesive visual and verbal identities that command premium market positioning.' },
    ],
  },

  // §6 Complete Agency Services
  services: {
    title: 'Complete Agency Services',
    label: 'Full-Service Offering',
    items: [
      { num: '01', title: 'Performance Marketing & Paid Media', body: 'Data-driven acquisition campaigns across Meta (Instagram & Facebook), TikTok, Snapchat, and Google Ads to maximize lead quality and sales.' },
      { num: '02', title: 'Brand Strategy & Visual Identity', body: 'Building distinctive brand identities, brand guidelines, packaging direction, and market positioning tailored to GCC audiences.' },
      { num: '03', title: 'Social Media Management & Growth', body: 'End-to-end content calendars, account management, and platform-native strategies that grow engaged communities.' },
      { num: '04', title: 'Commercial Photography & On-Location Production', body: 'Professional food, beverage, and product photography, menu shoots, and high-definition promotional reels filmed on location to showcase authentic quality.' },
      { num: '05', title: 'Video & AI-Powered Creative Content', body: 'AI-enhanced visuals, motion graphics, and modern short-form video storytelling designed to capture attention fast.' },
      { num: '06', title: 'Influencer Marketing & UGC Campaigns', body: 'Identifying, contracting, and managing relevant content creators and food/lifestyle influencers, alongside producing authentic User-Generated Content (UGC) that builds immediate social proof.' },
      { num: '07', title: 'Search Engine Optimization (SEO) & Google Business Profile', body: 'Improving organic search rankings on Google and optimizing local Google Maps listings so nearby customers discover your physical branches first.' },
      { num: '08', title: 'Web Design, Landing Pages & Conversion Optimization (CRO)', body: 'Designing fast, mobile-first websites and high-converting landing pages backed by continuous A/B testing of creatives and funnels.' },
      { num: '09', title: 'E-Commerce Growth & Customer Retention (WhatsApp, Email & SMS)', body: 'Managing online store campaigns (Salla, Zid, Shopify), reducing cart abandonment, and building automated WhatsApp, email, and loyalty flows that turn one-time buyers into repeat customers.' },
      { num: '10', title: 'Bilingual Copywriting & Brand Messaging', body: 'Crafting persuasive Arabic and English copy for websites, ad campaigns, product descriptions, packaging, and brand storytelling.' },
      { num: '11', title: 'Tracking Infrastructure & Performance Analytics', body: 'Setting up Meta, TikTok, Snapchat, and Google Analytics (GA4) tracking pixels alongside transparent monthly KPI dashboards measuring real ROAS.' },
      { num: '12', title: 'Community & Online Reputation Management', body: 'Proactive management of social media comments, direct messages, and Google Maps reviews to protect brand image and boost customer satisfaction.' },
    ],
  },

  // §7 Featured Projects & Portfolio
  portfolio: {
    title: 'Featured Projects & Portfolio',
    scopeLabel: 'Scope',
    items: [
      {
        slug: 'hajiss',
        name: 'Hajiss Cafe',
        nameAlt: 'مقهى هاجس',
        description: 'A specialty coffee destination dedicated strictly to refined coffee craft and cafe hospitality, designed without a working space.',
        scope: ['Brand positioning', 'visual storytelling', 'specialty coffee photography', 'local Google Maps optimization', 'launch campaigns'],
      },
      {
        slug: 'ghalia',
        name: 'Ghalia Chocolate',
        nameAlt: 'شوكولاتة غالية',
        description: 'An artisanal chocolate and luxury confectionery brand crafted for elevated gifting and indulgence.',
        scope: ['Luxury visual identity direction', 'commercial product photography', 'seasonal gifting campaigns', 'paid social acquisition'],
      },
      {
        slug: 'odun',
        name: 'Odun Pide',
        nameAlt: 'أودن بيديه',
        description: 'An authentic Turkish baked goods and traditional oven-baked pide concept bringing handcrafted flavors to the table.',
        scope: ['Brand launch strategy', 'on-location food videography', 'influencer tasting campaigns', 'local awareness ads'],
      },
    ],
  },

  // §8 How We Work
  process: {
    title: 'How We Work',
    label: '4-Step Process',
    stepLabel: 'Step',
    steps: [
      { num: '01', title: 'Discovery & Audit', body: 'We analyze your business model, competitors, target audience, and current digital presence to uncover growth opportunities.' },
      { num: '02', title: 'Strategy & Infrastructure Setup', body: 'We build your custom marketing roadmap, set up tracking pixels and analytics, and establish your visual and messaging guidelines.' },
      { num: '03', title: 'Production & Campaign Launch', body: 'Our creative and media teams produce your photo, video, and copy assets and launch targeted campaigns across key channels.' },
      { num: '04', title: 'Optimization & Scaling', body: 'We track real conversion data weekly, refine underperforming creatives, and scale winning campaigns for sustainable revenue growth.' },
    ],
  },

  // §9 FAQ
  faq: {
    title: 'Frequently Asked Questions',
    label: 'FAQ',
    items: [
      {
        q: 'What industries does Yougoloun specialize in?',
        a: 'We work across multiple sectors in the GCC and MENA, with deep hands-on expertise in specialty coffee, F&B, restaurants, luxury confectionery, retail, and e-commerce.',
      },
      {
        q: 'Do you offer both one-time launch packages and monthly retainers?',
        a: 'Yes. We provide complete brand launch packages for new concepts as well as ongoing monthly growth retainers covering content, media buying, and analytics.',
      },
      {
        q: 'How do you measure campaign success?',
        a: 'Every partnership is tied to clear KPIs, including cost per acquisition (CPA), return on ad spend (ROAS), qualified leads, store foot traffic, and online order revenue.',
      },
    ],
  },

  // §10 Call-to-Action & Footer
  contact: {
    headline: 'Ready to build a predictable growth engine for your brand?',
    body: 'Book a free strategy consultation with the Yougoloun team today.',
    labels: { email: 'Email', phone: 'Phone / WhatsApp', location: 'Locations' },
    location: 'Hail, Kingdom of Saudi Arabia',
    copyright: '© 2026 YOUGOLOUN (يقولون). All rights reserved.',
  },

  // ⚠ NOT FROM THE PDF
  ui: {
    skipToContent: 'Skip to content',
    scrollHint: 'Scroll',
    menu: 'Menu',
    close: 'Close',
    switchLang: { label: 'العربية', short: 'AR', ariaLabel: 'التبديل إلى العربية' },
    holdHint: 'Hold anywhere to awaken the voice',
    cursor: { view: 'View', drag: 'Drag', talk: 'Talk', react: 'React', hold: 'Hold' },
    altitude: 'Altitude',
    localTime: 'Local time in Hail',
    sound: { on: 'Sound on', off: 'Sound off' },
    whatsapp: 'WhatsApp',
    whatsappMessage: "Hello Yougoloun, I'd like to book a strategy call.",
    loading: 'Loading',
    hailLabel: 'Hail, KSA',
    earthCredit: 'Earth textures: Solar System Scope (CC BY 4.0)',
    notFound: { title: 'Page not found', back: 'Back to home' },
    arrival: { place: 'Hail, Saudi Arabia' },
    serviceFilters: { all: 'All', growth: 'Growth', brand: 'Brand', content: 'Content' },
    carousel: { previous: 'Previous project', next: 'Next project' },
    mapLabels: { aja: 'AJA', salma: 'SALMA', nafud: 'NAFUD' },
    visitSite: 'Visit website',
    buzz: {
      word: 'They say',
      hashtag: '#Yougoloun',
      handle: '@yougoloun',
      live: 'Live',
      growth: 'Growth',
      funnelTitle: 'Funnel',
      notifications: ['New follower', 'New order', 'New message', 'You were mentioned'],
      funnel: ['Reach', 'Engagement', 'Conversion', 'Loyalty'],
      hint: 'Tap to react',
    },
    feed: {
      title: 'Fresh from our studio',
      hint: 'Drag a card to browse',
      open: 'View creative',
      previous: 'Previous creative',
      next: 'Next creative',
      posts: [
        'Yougoloun ad creative: marketing that makes a difference in your numbers',
        'Yougoloun creative: managing and integrating smart conversations with confidence',
        'Yougoloun creative: your smart partner for voice conversations',
        'Yougoloun creative: transform your office into a sustainable workspace',
      ],
    },
  },

  // ⚠ NOT FROM THE PDF — title approved by the client
  seo: {
    title: 'Yougoloun | Digital Marketing & Growth Agency in Hail, Saudi Arabia',
    description: 'Moving Brands Forward. Yougoloun is a full-service digital marketing agency in Hail, Saudi Arabia, building digital growth engines for brands across the GCC and MENA.',
    ogLocale: 'en_US',
  },
};
