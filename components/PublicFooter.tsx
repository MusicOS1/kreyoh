import Link from "next/link";
import { FacktsMusicLogo } from "./Branding";

export default function PublicFooter() {
  return (
    <footer className="public-footer public-footer-expanded fm-public-footer">
      <div className="fm-footer-brand-block">
        <Link href="/" className="public-footer-brand">
          <FacktsMusicLogo size={36} showTagline={false} />
        </Link>
        <p>Built in Nairobi. Made for the whole creative room.</p>
      </div>

      <div className="fm-footer-columns">
        <div>
          <span>Platform</span>
          <Link href="/creators">Creators</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </div>
        <div>
          <span>FACKTS Music</span>
          <Link href="/about">About</Link>
          <Link href="/partner">Partner</Link>
          <Link href="/contact">Contact</Link>
        </div>
        <div>
          <span>Reach us</span>
          <a href="mailto:info@facktsafrica.co.ke">info@facktsafrica.co.ke</a>
          <a href="tel:+254711468303">+254 711 468 303</a>
          <small>Westlands · Nairobi · Kenya</small>
        </div>
      </div>

      <div className="fm-footer-bottom">
        <span>© {new Date().getFullYear()} FACKTS Music</span>
        <span>A FACKTS Africa platform</span>
      </div>
    </footer>
  );
}
