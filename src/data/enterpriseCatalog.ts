export type CatalogAttributePreset = {
  key: string;
  label: string;
  options: string[];
  optional?: boolean;
};

const deliveryOptions = [
  "Instant download",
  "Protected order delivery",
  "Seller service",
];

export const catalogAttributePresets: Record<string, CatalogAttributePreset[]> =
  {
    "social-media": [],
    "email-services": [
      {
        key: "platform",
        label: "Platform",
        options: [
          "Platform independent",
          "Google Workspace",
          "Microsoft 365",
          "Mailchimp",
          "Klaviyo",
          "Brevo",
          "Other",
        ],
      },
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Email template",
          "Campaign workflow",
          "Deliverability guide",
          "Reporting tool",
          "Setup service",
        ],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    games: [
      {
        key: "platform",
        label: "Platform",
        options: [
          "PC",
          "PlayStation",
          "Xbox",
          "Nintendo",
          "Android",
          "iOS",
          "Platform independent",
        ],
        optional: true,
      },
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Guide",
          "Creator asset",
          "UI kit",
          "Server resource",
          "Coaching service",
          "Allowed modding resource",
        ],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "games-gaming": [
      {
        key: "platform",
        label: "Platform",
        options: [
          "PC",
          "PlayStation",
          "Xbox",
          "Nintendo",
          "Android",
          "iOS",
          "Platform independent",
        ],
        optional: true,
      },
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Guide",
          "Creator asset",
          "UI kit",
          "Server resource",
          "Coaching service",
          "Allowed modding resource",
        ],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "ai-platforms": [
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Prompt system",
          "Template",
          "Workflow",
          "Evaluation pack",
          "Training",
          "Implementation service",
        ],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "software-apps": [
      {
        key: "platform",
        label: "Platform",
        options: [
          "Windows",
          "macOS",
          "Linux",
          "Web",
          "Android",
          "iOS",
          "Multi-platform",
        ],
      },
      {
        key: "condition",
        label: "License type",
        options: ["Commercial", "Personal", "Open source", "Subscription"],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "design-creative": [
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Template",
          "Font",
          "Graphic",
          "Icon set",
          "Brand system",
          "Design service",
        ],
      },
      {
        key: "condition",
        label: "License type",
        options: ["Personal", "Commercial", "Extended commercial"],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "websites-code": [
      {
        key: "platform",
        label: "Technology",
        options: [
          "HTML/CSS",
          "React",
          "Vue",
          "WordPress",
          "Shopify",
          "Node.js",
          "Other",
        ],
      },
      {
        key: "productKind",
        label: "Resource type",
        options: [
          "Theme",
          "Component",
          "Starter",
          "Plugin",
          "Source code",
          "Development service",
        ],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: deliveryOptions,
      },
    ],
    "professional-services": [
      {
        key: "productKind",
        label: "Service type",
        options: [
          "Design",
          "Development",
          "Marketing",
          "Writing",
          "Translation",
          "Automation",
          "Security review",
          "Consulting",
        ],
      },
      {
        key: "duration",
        label: "Engagement",
        options: ["One-time delivery", "Milestone project", "Monthly retainer"],
      },
      {
        key: "deliveryMethod",
        label: "Delivery method",
        options: ["Protected order delivery", "Seller service"],
      },
    ],
  };
