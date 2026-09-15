"use client";

import { useState } from "react";
import { signup } from "../app/signup/actions";

export default function SignupForm({ error }: { error?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <form action={signup} className="login-card">
      <div>
        <span className="eyebrow">CREATE YOUR ACCOUNT</span>
        <h2>Join FACKTS Music</h2>
        <p>
          Build your professional music profile. Project access is assigned
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

      <label>
        I mainly work as
        <select
          name="creator_type"
          required
          defaultValue="Artist"
          className="dark-select"
        >
          <option>Artist</option>
          <option>Producer</option>
          <option>Artist + Producer</option>
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

        <small>
          This describes your professional identity. It does not automatically
          give access to another person's project. Project roles and permissions
          activate when the project invites or assigns you.
        </small>
      </label>

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
        <span>I accept the basic terms and privacy notice.</span>
      </label>

      <button className="login-submit-btn" type="submit">
        Create Account →
      </button>
    </form>
  );
}
