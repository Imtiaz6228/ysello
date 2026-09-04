import { Link, Navigate, useLocation } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";

export type LegalSection = { title: string; body: string };
export type LegalPageContent = {
  title: string;
  eyebrow: string;
  description: string;
  sections: LegalSection[];
};

const commonContact =
  "Questions can be sent through the Contact page or support center. Legal notices should include your name, contact details, the relevant URL or order number, and a clear description of the issue.";
export const legalPages: Record<string, LegalPageContent> = {
  "/terms": {
    title: "Terms and Conditions",
    eyebrow: "LEGAL · UPDATED JULY 2026",
    description: "The rules for using Ysello as a buyer, seller, or visitor.",
    sections: [
      {
        title: "Using the platform",
        body: "You must provide accurate information, protect your account, comply with applicable law, and be old enough to form a binding contract where you live. You may not bypass platform payments, manipulate reviews, scrape private data, or interfere with platform security.",
      },
      {
        title: "Marketplace relationship",
        body: "Sellers are responsible for their listings, licenses, delivery promises, and legal compliance. Ysello provides marketplace, payment coordination, digital delivery, support, and dispute tools. Product approval is not an endorsement or guarantee.",
      },
      {
        title: "Payments and enforcement",
        body: "Orders may be delayed for fraud checks or manual payment approval. We may suspend accounts, remove products, hold payouts, reverse transactions, preserve evidence, or report illegal activity when reasonably necessary for safety or compliance.",
      },
      {
        title: "Liability and changes",
        body: "The service is provided with reasonable care but without guarantees of uninterrupted availability. Liability is limited to the extent permitted by law. Material changes will be announced through the service or email.",
      },
    ],
  },
  "/privacy": {
    title: "Privacy Policy",
    eyebrow: "PRIVACY FIRST",
    description:
      "What Ysello collects, why it is used, and the choices available to you.",
    sections: [
      {
        title: "Data we collect",
        body: "We collect account details, verification status, order and payment references, support messages, security logs, device information, and content you choose to upload. Payment providers handle full payment credentials; Ysello stores provider references and status.",
      },
      {
        title: "How data is used",
        body: "Data is used to operate accounts and orders, prevent fraud, deliver files, provide support, enforce policies, meet legal duties, and improve reliability. We do not sell personal information or use private order content for unrelated advertising.",
      },
      {
        title: "Storage and sharing",
        body: "We share only what is necessary with payment, email, hosting, analytics, fraud-prevention, and legal service providers under appropriate safeguards. Retention follows operational, security, dispute, tax, and legal needs.",
      },
      {
        title: "Your choices",
        body: "You may request access, correction, export, restriction, or deletion where applicable. Security and legal records may need to be retained. Marketing emails include an opt-out; essential order and security notices do not.",
      },
    ],
  },
  "/refund-policy": {
    title: "Refund Policy",
    eyebrow: "FAIR OUTCOMES",
    description:
      "How refund requests are evaluated for downloads and services.",
    sections: [
      {
        title: "Eligible requests",
        body: "A refund may be appropriate when a product is materially different from its listing, unusable because of a seller-controlled defect, not delivered, duplicated, or purchased through an unauthorized transaction. Contact support promptly with evidence.",
      },
      {
        title: "Digital downloads",
        body: "A change of mind is generally not refundable after a file is accessed, except where consumer law says otherwise. Defective files should first be offered a reasonable repair or replacement. Download logs help us evaluate requests fairly.",
      },
      {
        title: "Services",
        body: "Service refunds consider work completed, agreed milestones, delivery dates, and the order chat. A partial refund may be appropriate where useful work was delivered. Buyers should not approve completion until the promised deliverable arrives.",
      },
      {
        title: "Process",
        body: "Submit a request from the order dashboard. Sellers may respond, but Ysello makes the platform decision. Approved provider refunds return to the original method when possible; bank, crypto, or manual payments may require separate payout details.",
      },
    ],
  },
  "/seller-policy": {
    title: "Seller Policy",
    eyebrow: "BUILD TRUST",
    description:
      "Standards for approved sellers and every product they publish.",
    sections: [
      {
        title: "Verification and listings",
        body: "Sellers must pass approval, use accurate identity and business information, disclose delivery terms and license scope, and submit every product for review before publication. Material product updates may require renewed moderation.",
      },
      {
        title: "Files and delivery",
        body: "Files must be safe, original or properly licensed, and accurately described. Service delivery belongs in the protected order workspace. Sellers must keep supported products accessible to eligible previous buyers when updates are promised.",
      },
      {
        title: "Customer care",
        body: "Respond professionally, meet delivery commitments, assist with legitimate defects, and participate in disputes. Never pressure buyers for positive reviews or ask them to pay or communicate outside Ysello.",
      },
      {
        title: "Enforcement",
        body: "Listings may be rejected or removed. Stores may be suspended for safety concerns, repeated poor delivery, policy violations, legal complaints, or fraud. Serious cases can result in permanent removal and withheld payouts as permitted by law.",
      },
    ],
  },
  "/buyer-protection": {
    title: "Buyer Protection Policy",
    eyebrow: "PURCHASE WITH CONTEXT",
    description:
      "The safeguards around payment, delivery, downloads, and disputes.",
    sections: [
      {
        title: "Before purchase",
        body: "Approved products show price, seller, delivery type, rating, and key terms. Verified badges identify approved sellers, not guaranteed outcomes. Review the listing and seller policy before paying.",
      },
      {
        title: "Protected payment",
        body: "Hosted card and PayPal payments are confirmed server-side. Bank, crypto, and manual methods require staff approval before delivery. Ysello never asks you to send passwords or full payment credentials in messages.",
      },
      {
        title: "Delivery and evidence",
        body: "Downloads use authenticated or expiring links with count limits. Services use an order chat that preserves the delivery record. Confirmation emails and invoices are generated after successful payment.",
      },
      {
        title: "When something goes wrong",
        body: "Open an order-linked ticket, refund request, or dispute. Keep communication and files in Ysello so support can review the evidence. Outcomes may include repair, replacement, partial refund, full refund, or denial.",
      },
    ],
  },
  "/prohibited-products": {
    title: "Prohibited Products Policy",
    eyebrow: "NO GREY MARKET",
    description: "Products and services that do not belong on Ysello.",
    sections: [
      {
        title: "Accounts and access",
        body: "No buying, selling, renting, or transferring social-media, email, gaming, streaming, financial, or other accounts. No credentials, passwords, session cookies, recovery methods, API keys, license keys obtained without authorization, or account-recovery bypasses.",
      },
      {
        title: "Abuse and cyber harm",
        body: "No hacking tools, malware, phishing kits, credential stuffing, spam or bot services, denial-of-service services, unauthorized scraping, surveillance tools intended for abuse, fake engagement, fake reviews, or evasion services.",
      },
      {
        title: "Illegal and stolen material",
        body: "No illegal goods, stolen or copyrighted files, leaked data, counterfeit products, doxxing data, exploitative sexual material, regulated goods, fraud services, or content that facilitates serious harm.",
      },
      {
        title: "Enforcement and reporting",
        body: "Product approval does not prevent later removal. Report suspected violations from the product or support page. We may preserve evidence, suspend associated accounts, revoke delivery, refund affected buyers, and cooperate with lawful requests.",
      },
    ],
  },
  "/copyright": {
    title: "Copyright & IP Complaint Policy",
    eyebrow: "RESPECT ORIGINAL WORK",
    description:
      "How rights holders can report allegedly infringing marketplace content.",
    sections: [
      {
        title: "Submitting a notice",
        body: "Provide your identity and contact details, the protected work, the exact Ysello URL, a good-faith statement, an accuracy and authority statement, and your physical or electronic signature. Incomplete notices may delay review.",
      },
      {
        title: "Our review",
        body: "We may temporarily restrict a listing while assessing a sufficiently detailed complaint. We notify the seller where appropriate, preserve relevant records, and may request licenses, source files, or additional evidence.",
      },
      {
        title: "Counter-notices and repeat issues",
        body: "Sellers may respond with evidence of ownership, permission, license, or mistaken identification. Repeated or deliberate infringement can result in product removal, store suspension, and termination.",
      },
      { title: "Contact", body: commonContact },
    ],
  },
  "/contact": {
    title: "Contact",
    eyebrow: "LET’S SORT IT OUT",
    description:
      "The right route for support, business, safety, and legal questions.",
    sections: [
      {
        title: "Order and technical support",
        body: "Sign in and open a categorized ticket for payment, download, refund, product, seller, or technical issues. Order-linked tickets are the fastest route because the relevant history is attached automatically.",
      },
      {
        title: "Trust and safety",
        body: "Use the product report action or choose Seller issue in the support center. For urgent risks, include the listing URL, seller name, reason, and any non-sensitive evidence.",
      },
      {
        title: "Business and media",
        body: "For partnerships, marketplace questions, or media inquiries, use the support center and select Technical issue, then begin the subject with PARTNERSHIP or MEDIA so it can be routed correctly.",
      },
      { title: "Legal and IP", body: commonContact },
    ],
  },
  "/about": {
    title: "About Ysello",
    eyebrow: "A MORE USEFUL DIGITAL MARKET",
    description:
      "Why Ysello is built around original work, clear delivery, and human support.",
    sections: [
      {
        title: "The idea",
        body: "Digital marketplaces are better when the rules are legible. Ysello brings original downloads and expert services into one exchange with product review, seller verification, secure payment confirmation, delivery records, and real support.",
      },
      {
        title: "What belongs here",
        body: "Templates, creative assets, educational resources, software from authorized publishers, and well-scoped professional services. Accounts, credentials, stolen work, abuse tools, spam, fake reviews, and grey-market access do not.",
      },
      {
        title: "How trust works",
        body: "Trust is a system, not a badge. Products are reviewed before publication; verified buyers power ratings; downloads are controlled; service work stays in an order chat; and staff can suspend users, remove products, refund orders, and resolve disputes.",
      },
      {
        title: "Still becoming",
        body: "Ysello is designed to grow carefully. New payment methods, categories, and seller tools should make the exchange safer and more useful—not merely larger.",
      },
    ],
  },
};

export function LegalPage() {
  const { pathname } = useLocation();
  const page = legalPages[pathname];
  if (!page) return <Navigate to="/" replace />;
  return (
    <main className="commerce-page">
      <Seo
        title={page.title}
        description={page.description}
        canonicalPath={pathname}
      />
      <MarketHeader />
      <section className="legal-hero">
        <span className="section-index">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
        {pathname === "/contact" ? (
          <nav className="legal-contact-actions" aria-label="Contact options">
            <Link className="primary-link" to="/support">
              Open signed-in support
            </Link>
            <Link to="/buyer-protection">Buyer protection</Link>
            <Link to="/copyright">IP complaint requirements</Link>
          </nav>
        ) : null}
      </section>
      <section className="legal-layout">
        <aside aria-label="Policy pages">
          {Object.entries(legalPages).map(([path, item]) => (
            <Link
              aria-current={path === pathname ? "page" : undefined}
              className={path === pathname ? "active" : ""}
              to={path}
              key={path}
            >
              {item.title}
            </Link>
          ))}
        </aside>
        <article>
          {page.sections.map((section, index) => (
            <section key={section.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            </section>
          ))}
        </article>
      </section>
      <MarketFooter />
    </main>
  );
}
