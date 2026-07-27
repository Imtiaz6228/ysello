export type MarketplaceTaxonomyItem = {
  slug: string;
  name: string;
  description: string;
  accent: "blue" | "purple" | "orange" | "emerald" | "rose" | "cyan";
  icon: string;
  subcategories: Array<{
    slug: string;
    name: string;
    description: string;
  }>;
};

export const marketplaceTaxonomy: MarketplaceTaxonomyItem[] = [
  {
    slug: "ai-tools-workflows",
    name: "AI Tools & Workflows",
    description: "Responsible automations, prompt systems and practical AI resources.",
    accent: "purple",
    icon: "AI",
    subcategories: [
      {
        slug: "ai-prompt-systems",
        name: "Prompt systems",
        description: "Reusable prompt frameworks with clear review steps.",
      },
      {
        slug: "ai-operations-playbooks",
        name: "AI operations",
        description: "Research, support and content workflows for teams.",
      },
      {
        slug: "ai-workflow-services",
        name: "AI setup services",
        description: "Expert implementation of documented AI workflows.",
      },
    ],
  },
  {
    slug: "design-creative-assets",
    name: "Design & Creative Assets",
    description: "Original brand systems, UI kits, templates and production assets.",
    accent: "rose",
    icon: "DS",
    subcategories: [
      {
        slug: "design-templates",
        name: "Design templates",
        description: "Editable layouts for brands, campaigns and presentations.",
      },
      {
        slug: "ui-components",
        name: "UI kits & components",
        description: "Accessible interface systems for digital products.",
      },
      {
        slug: "brand-identity-assets",
        name: "Brand identity assets",
        description: "Original identity kits, guidelines and launch collateral.",
      },
    ],
  },
  {
    slug: "software-productivity",
    name: "Software & Productivity",
    description: "Authorized software, apps and systems that improve everyday work.",
    accent: "blue",
    icon: "SW",
    subcategories: [
      {
        slug: "productivity-apps",
        name: "Productivity apps",
        description: "Planning, focus and collaboration software.",
      },
      {
        slug: "google-sheets-dashboards",
        name: "Spreadsheet systems",
        description: "Editable dashboards and operational workbooks.",
      },
      {
        slug: "software-apps",
        name: "Authorized software",
        description: "Software sold by authorized publishers and creators.",
      },
    ],
  },
  {
    slug: "website-themes-plugins",
    name: "Website Themes & Plugins",
    description: "Website templates, components and extensions with clear licensing.",
    accent: "cyan",
    icon: "WEB",
    subcategories: [
      {
        slug: "website-templates",
        name: "Website templates",
        description: "Responsive templates for business and commerce.",
      },
      {
        slug: "ecommerce-plugins",
        name: "E-commerce plugins",
        description: "Documented extensions for online stores.",
      },
      {
        slug: "saas-ui-kits",
        name: "SaaS UI kits",
        description: "Product-ready layouts and interface components.",
      },
    ],
  },
  {
    slug: "video-streaming-assets",
    name: "Video & Streaming Assets",
    description: "Motion graphics, editing packs, overlays and licensed audio.",
    accent: "orange",
    icon: "VID",
    subcategories: [
      {
        slug: "motion-graphics",
        name: "Motion graphics",
        description: "Titles, transitions and modular motion scenes.",
      },
      {
        slug: "streaming-overlays",
        name: "Streaming overlays",
        description: "Original broadcast scenes, alerts and channel graphics.",
      },
      {
        slug: "sound-effects",
        name: "Sound effects",
        description: "Royalty-free sound libraries with clear licensing.",
      },
    ],
  },
  {
    slug: "business-marketing-kits",
    name: "Business & Marketing Kits",
    description: "Planning systems, campaign templates and commercial resources.",
    accent: "emerald",
    icon: "BIZ",
    subcategories: [
      {
        slug: "finance-models",
        name: "Finance models",
        description: "Forecasts, budgets and decision-ready dashboards.",
      },
      {
        slug: "email-campaign-templates",
        name: "Campaign templates",
        description: "Opt-in lifecycle and launch marketing resources.",
      },
      {
        slug: "business-playbooks",
        name: "Business playbooks",
        description: "Documented systems for operations, sales and growth.",
      },
    ],
  },
  {
    slug: "learning-resources-guides",
    name: "Learning Resources & Guides",
    description: "Courses, guides and practical learning materials from specialists.",
    accent: "blue",
    icon: "EDU",
    subcategories: [
      {
        slug: "online-courses",
        name: "Online courses",
        description: "Project-based learning with clear outcomes.",
      },
      {
        slug: "study-guides",
        name: "Study guides",
        description: "Structured notes, exercises and revision plans.",
      },
      {
        slug: "professional-guides",
        name: "Professional guides",
        description: "Practical handbooks for specialist work.",
      },
    ],
  },
  {
    slug: "professional-digital-services",
    name: "Professional Digital Services",
    description: "Expert creative, technical and marketing services with defined scope.",
    accent: "purple",
    icon: "PRO",
    subcategories: [
      {
        slug: "brand-identity-services",
        name: "Brand identity design",
        description: "Custom identity systems and brand guidelines.",
      },
      {
        slug: "website-setup-services",
        name: "Website setup",
        description: "Theme setup, customization and launch support.",
      },
      {
        slug: "video-editing-services",
        name: "Video editing",
        description: "Editing and motion support for professional content.",
      },
      {
        slug: "seo-content-services",
        name: "SEO & content",
        description: "Research-led content and optimization support.",
      },
    ],
  },
];

export const marketplaceRootSlugs = new Set(
  marketplaceTaxonomy.map((category) => category.slug),
);

export const marketplaceTaxonomySlugs = new Set(
  marketplaceTaxonomy.flatMap((category) => [
    category.slug,
    ...category.subcategories.map((subcategory) => subcategory.slug),
  ]),
);
