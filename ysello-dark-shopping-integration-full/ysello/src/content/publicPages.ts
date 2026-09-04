export type PublicPage = {
  path: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  type?: "website" | "article";
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

export const siteContentLastModified = "2026-07-23";

export const publicPages: PublicPage[] = [
  {
    path: "/",
    title:
      "Digital Products Marketplace — Software, Assets & Services | Ysello",
    description:
      "Browse trusted digital products, software, creative assets, courses, and expert services from reviewed sellers with clear delivery and protected checkout.",
    heading: "Buy digital products from trusted sellers",
    intro:
      "Compare software, creative assets, courses, business resources, and expert services with delivery, licensing, seller, and support details in view.",
    changeFrequency: "daily",
    priority: 1,
  },
  {
    path: "/catalog",
    title: "Browse digital products and services · Ysello",
    description:
      "Explore digital products and expert services by category, seller, price, and delivery type on Ysello.",
    heading: "Browse digital products and expert services",
    intro:
      "Find professional assets, software, education, creative tools, and seller-delivered services with clear purchase details.",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/blog",
    title: "Digital marketplace buying and selling guides · Ysello",
    description:
      "Practical guides for buying, selling, licensing, delivery, and trust in digital marketplaces.",
    heading: "Digital marketplace field notes",
    intro:
      "Useful guidance for evaluating products, publishing trustworthy listings, handling licenses, and delivering digital work.",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/terms",
    title: "Terms and Conditions · Ysello",
    description: "The rules for using Ysello as a buyer, seller, or visitor.",
    heading: "Terms and Conditions",
    intro:
      "Read the marketplace rules that apply to visitors, buyers, sellers, payments, and platform enforcement.",
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    path: "/privacy",
    title: "Privacy Policy · Ysello",
    description:
      "What Ysello collects, why it is used, and the choices available to you.",
    heading: "Privacy Policy",
    intro:
      "Understand the information used to operate accounts, orders, support, security, and marketplace services.",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/refund-policy",
    title: "Refund Policy · Ysello",
    description:
      "How refund requests are evaluated for digital downloads and expert services.",
    heading: "Refund Policy",
    intro:
      "Learn when a refund may be appropriate and how requests are reviewed for downloads and services.",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    path: "/seller-policy",
    title: "Seller Policy · Ysello",
    description:
      "Standards for approved Ysello sellers and every digital product or service they publish.",
    heading: "Seller Policy",
    intro:
      "Review listing, delivery, customer-care, safety, and enforcement standards for marketplace sellers.",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    path: "/buyer-protection",
    title: "Buyer Protection Policy · Ysello",
    description:
      "The safeguards around payment, delivery, downloads, support, refunds, and disputes on Ysello.",
    heading: "Buyer Protection Policy",
    intro:
      "See how listing details, payment confirmation, delivery records, support, and disputes work together.",
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    path: "/prohibited-products",
    title: "Prohibited Products Policy · Ysello",
    description:
      "Products and services that are not permitted on the Ysello digital marketplace.",
    heading: "Prohibited Products Policy",
    intro:
      "Understand the marketplace boundaries for accounts, credentials, abusive tools, illegal goods, and stolen material.",
    changeFrequency: "yearly",
    priority: 0.5,
  },
  {
    path: "/copyright",
    title: "Copyright and IP Complaint Policy · Ysello",
    description:
      "How rights holders can report allegedly infringing marketplace content to Ysello.",
    heading: "Copyright and IP Complaint Policy",
    intro:
      "Find the information required for an intellectual-property notice and learn how complaints are reviewed.",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/contact",
    title: "Contact and marketplace support · Ysello",
    description:
      "Find the right Ysello contact route for orders, technical help, trust and safety, business, media, legal, and IP questions.",
    heading: "Contact Ysello",
    intro:
      "Choose the appropriate support route so the right context reaches the right team.",
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    path: "/about",
    title: "About the Ysello digital marketplace",
    description:
      "Learn why Ysello is built around original digital work, clear delivery terms, marketplace safeguards, and human support.",
    heading: "About Ysello",
    intro:
      "Ysello brings original digital downloads and expert services into one marketplace with clear purchase and delivery records.",
    changeFrequency: "yearly",
    priority: 0.6,
  },
];

export function findPublicPage(path: string) {
  return publicPages.find((page) => page.path === path);
}
