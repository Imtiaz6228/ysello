export type BlogPost = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  time: string;
  color: string;
  published: string;
  publishedIso: string;
  sections: Array<{ title: string; body: string }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "evaluate-digital-product-before-checkout",
    tag: "BUYING WELL",
    title: "How to evaluate a digital product before checkout",
    excerpt:
      "A practical way to read licenses, delivery promises, reviews, update terms, and seller policies.",
    time: "6 min",
    color: "lime",
    published: "July 8, 2026",
    publishedIso: "2026-07-08",
    sections: [
      {
        title: "Start with the deliverable",
        body: "A useful listing states exactly what arrives, in which format, how delivery works, and what is not included. If the deliverable is vague, ask the seller before checkout and keep the answer in the order record.",
      },
      {
        title: "Read the license, not just the headline",
        body: "Check whether use is personal or commercial, whether redistribution is prohibited, how many projects or users are covered, and whether third-party assets carry separate terms.",
      },
      {
        title: "Check the support window",
        body: "Look for update commitments, compatibility notes, response expectations, and the process for reporting a defective file. A clear support boundary is more valuable than an unrealistic lifetime promise.",
      },
      {
        title: "Use evidence thoughtfully",
        body: "Verified reviews, a complete seller profile, realistic delivery times, and consistent product details are useful signals. Keep payment and delivery inside the marketplace so the support team can review the record if something goes wrong.",
      },
    ],
  },
  {
    slug: "write-a-trustworthy-product-page",
    tag: "SELLER FIELD GUIDE",
    title: "Writing a product page buyers can actually trust",
    excerpt:
      "Specific descriptions reduce disputes. Here’s what to include without turning the page into legal soup.",
    time: "8 min",
    color: "violet",
    published: "July 5, 2026",
    publishedIso: "2026-07-05",
    sections: [
      {
        title: "Name the outcome",
        body: "Lead with the task the product helps complete, then name the exact files, formats, quantities, and technical requirements. Avoid broad claims that the deliverable cannot prove.",
      },
      {
        title: "Show what is included",
        body: "A short included/not-included list removes uncertainty. Add representative previews, label them accurately, and explain whether fonts, photos, plugins, or source files are part of the purchase.",
      },
      {
        title: "Make delivery predictable",
        body: "State whether delivery is instant or manual, the normal turnaround, what information the buyer must provide, and how revisions work for services.",
      },
      {
        title: "Write for scanning",
        body: "Use plain headings, short paragraphs, and a compact license summary. Keep essential limitations near the purchase decision rather than burying them in a long description.",
      },
    ],
  },
  {
    slug: "why-account-and-credential-trading-is-not-allowed",
    tag: "TRUST & SAFETY",
    title: "Why Ysello does not allow account or credential trading",
    excerpt:
      "The practical security, consent, fraud, and ownership problems behind the line we draw.",
    time: "5 min",
    color: "coral",
    published: "July 2, 2026",
    publishedIso: "2026-07-02",
    sections: [
      {
        title: "Access is not ownership",
        body: "A login can be recovered, revoked, or disputed after a sale. Platform terms, identity checks, and recovery channels often remain connected to the original holder.",
      },
      {
        title: "Credentials expose more than one service",
        body: "Reused passwords, connected email addresses, payment records, private messages, and device sessions can turn a single transfer into a wider security incident.",
      },
      {
        title: "Consent is difficult to prove",
        body: "An account may contain information about customers, friends, team members, or previous users who never consented to a transfer. Clear ownership and privacy boundaries are essential.",
      },
      {
        title: "Safer products create durable value",
        body: "Original templates, licensed assets, education, and well-scoped services can be delivered and supported without transferring another person’s identity or access.",
      },
    ],
  },
  {
    slug: "versioning-digital-downloads",
    tag: "CREATOR OPERATIONS",
    title: "A calm versioning strategy for digital downloads",
    excerpt:
      "How to ship useful updates while keeping existing customers informed and supported.",
    time: "7 min",
    color: "cyan",
    published: "June 29, 2026",
    publishedIso: "2026-06-29",
    sections: [
      {
        title: "Use understandable versions",
        body: "Choose a consistent version format and publish a short change log. Buyers should be able to tell whether an update fixes a defect, adds content, or changes compatibility.",
      },
      {
        title: "Keep stable files stable",
        body: "Do not silently replace a working download with an incompatible one. Preserve prior versions when practical and mark the recommended version clearly.",
      },
      {
        title: "Communicate meaningful changes",
        body: "Notify buyers when an update affects setup, licensing, dependencies, or the promised deliverable. Avoid sending a message for every minor internal edit.",
      },
      {
        title: "Plan support boundaries",
        body: "Document supported versions and a reasonable transition window. A predictable maintenance policy helps buyers plan and keeps the seller’s support workload sustainable.",
      },
    ],
  },
];

export function findBlogPost(slug?: string) {
  return blogPosts.find((post) => post.slug === slug);
}
