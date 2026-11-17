import Image from "next/image";
import { COMPANY_LINKS, LEGAL_LINKS, SIGNUP_URL, TERMS_URL } from "@/lib/site";

/**
 * Footer: brand-led and minimal. Only verified destinations from the original site;
 * no invented email, social accounts or legal pages (TERMS_URL stays null until one exists).
 * A large, low-contrast wordmark closes the page.
 */
const PRODUCT_LINKS = [
  { label: "Agents", href: "#agents" },
  { label: "FAQ", href: "#faq" },
  { label: "Sign Up", href: SIGNUP_URL },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="link-draw text-small text-ink/75 transition-colors hover:text-ink"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const legal = [...LEGAL_LINKS, ...(TERMS_URL ? [{ label: "Terms of Service", href: TERMS_URL }] : [])];

  return (
    <footer className="relative isolate overflow-hidden">
      {/* Reverse of the agents' gradient: indigo pooled at the bottom, fading up into the page */}
      <div aria-hidden="true" className="footer-ground absolute inset-x-0 bottom-0 -z-10" />
      <div className="wrap">
        <div className="grid gap-12 border-t border-ink/10 pt-16 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Image src="/digitalmantra-logo.webp" alt="DigitalMantra" width={968} height={258} className="h-8 w-auto" />
            <p className="mt-6 max-w-sm text-small text-ink-muted">
              The Intelligence Layer for Google Ads is a DigitalMantra product. Specialised agents that show what changed in
              your account, and why.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            <div>
              <p className="eyebrow text-ink-muted">Product</p>
              <ul className="mt-4 flex flex-col gap-2">
                {PRODUCT_LINKS.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-ink-muted">Company</p>
              <ul className="mt-4 flex flex-col gap-2">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-ink-muted">Legal</p>
              <ul className="mt-4 flex flex-col gap-2">
                {legal.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-2 border-t border-ink/10 py-6 text-caption text-ink-muted sm:flex-row sm:justify-between">
          <p>© 2026 DigitalMantra. All rights reserved.</p>
          <p>Product interfaces on this page are illustrative.</p>
        </div>
      </div>

      {/* Large, low-contrast wordmark, cropped by the page edge */}
      <p aria-hidden="true" className="footer-wordmark select-none text-center">
        DigitalMantra
      </p>
    </footer>
  );
}
