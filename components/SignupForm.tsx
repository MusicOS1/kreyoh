"use client";

import { useState } from "react";
import { signup } from "../app/signup/actions";
import Link from "next/link";

export default function SignupForm({ error, next="/home" }: { error?: string; next?: string }) {
  const [visible, setVisible] = useState(false);
  const [identity, setIdentity] = useState("");
  const [path,setPath]=useState<"creative"|"fan"|null>(null);

  return (
    <form action={signup} className="login-card"><input name="next" type="hidden" value={next}/>
      <div>
        <span className="eyebrow">CREATE YOUR ACCOUNT</span>
        <h2>Join FACKTS Music</h2>
        <p>
          Choose the Creative path or the Fan path. Project access is assigned
          separately when you join or are invited into a project.
        </p>
      </div>

      {error && (
        <div className="form-error-alert" role="alert">
          {error}
        </div>
      )}

      <label>
        Full Name
        <input
          name="full_name"
          required
          autoComplete="name"
          placeholder="Your full name"
        />
      </label>

      <fieldset className="signup-paths" aria-label="Choose how you join FACKTS Music">
        <legend>Choose your FACKTS Music path</legend>
        <p>Two ways in. One music community.</p>
        <div className="signup-path-grid">
          <label className={"signup-path-card"+(path==="creative"?" selected":"")}>
            <input type="radio" name="account_path" value="creative" required checked={path==="creative"} onChange={()=>{setPath("creative");setIdentity("");}}/>
            <strong>CREATIVE</strong>
            <span>Artists, producers, engineers, songwriters, managers, filmmakers and other music professionals.</span>
          </label>
          <label className={"signup-path-card"+(path==="fan"?" selected":"")}>
            <input type="radio" name="account_path" value="fan" required checked={path==="fan"} onChange={()=>{setPath("fan");setIdentity("");}}/>
            <strong>FAN</strong>
            <span>Listen, discover, follow, like, comment, vote and build your music library.</span>
          </label>
        </div>
      </fieldset>
      {path==="creative"&&<div className="signup-identity-field">
        <label htmlFor="signup-account-type">What kind of creative are you?</label>
        <select id="signup-account-type" name="creator_type" required className="dark-select" value={identity} onChange={e=>setIdentity(e.target.value)}>
          <option value="" disabled>Select your primary discipline</option>
          <option>Artist</option>
          <option>Artist + Producer</option>
          <option>Producer</option>
          <option>Songwriter / Composer</option>
          <option>Engineer / Technical</option>
          <option>A&R</option>
          <option>Artist Manager</option>
          <option>Studio Owner</option>
          <option>Videographer / Photographer</option>
          <option>Designer / Visual Creative</option>
          <option>Content / Media</option>
          <option>Session Musician</option>
          <option>Other Creative</option>
        </select>
        <small>Choose your professional identity, not a project position. Project access is granted separately by invitation or assignment.</small>
      </div>}
      {path==="creative"&&identity==="Other Creative"&&<label className="signup-other-creative">
        Specify your discipline
        <input name="other_creative_type" maxLength={80} minLength={2} required placeholder="e.g. DJ, dancer, photographer, music curator"/>
      </label>}
      {path==="fan"&&<p className="signup-fan-description">Your account opens in FACKTS Listen. You can become a creative later without losing your listening history.</p>}

      <label>
        Email Address
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>

      <label>
        Password
        <span className="password-field">
          <input
            name="password"
            type={visible ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <button type="button" onClick={() => setVisible(!visible)}>
            {visible ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      <label>
        Confirm Password
        <input
          name="confirm_password"
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repeat password"
        />
      </label>

      <label className="terms-check">
        <input name="accepted_terms" type="checkbox" required />
        <span>I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Use</Link> and acknowledge the <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Notice</Link> and <Link href="/copyright" target="_blank" rel="noopener noreferrer">Copyright Policy</Link>.</span>
      </label>

      <button className="login-submit-btn" type="submit">
        Create Account →
      </button>
    </form>
  );
}
