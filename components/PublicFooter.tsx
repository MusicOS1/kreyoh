import Link from "next/link";
import { FacktsMusicLogo } from "./Branding";

export default function PublicFooter() {
  return (
    <footer className="public-footer public-footer-expanded">
      <Link href="/" className="public-footer-brand"><FacktsMusicLogo size={34} showTagline={false} /></Link>
      <div className="public-footer-links"><Link href="/about">About</Link><Link href="/partner">Partner With Us</Link><Link href="/contact">Contact</Link><Link href="/login">Sign In</Link></div>
      <span>© {new Date().getFullYear()} FACKTS Music — a FACKTS Africa platform</span>
      <div><a href="mailto:info@facktsafrica.co.ke">info@facktsafrica.co.ke</a><a href="tel:+254711468303">+254 711 468 303</a></div>
    </footer>
  );
}
