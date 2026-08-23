import React from "react";
import Link from "next/link";
import { ArrowUpRight, ClockIcon, LockIcon, SparklesIcon } from "./Icons";

type FeatureItem = {
  title: string;
  description: string;
};

type PlaceholderModuleProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  phase?: string;
  badge?: string;
  description: string;
  plannedFeatures: FeatureItem[];
  icon?: React.ReactNode;
};

export default function PlaceholderModule({
  title,
  subtitle,
  eyebrow = "PROJECT 001 / ROADMAP",
  phase = "Phase 2 Core",
  badge = "ACTIVATION SCHEDULED",
  description,
  plannedFeatures,
  icon,
}: PlaceholderModuleProps) {
  return (
    <div className="content">
      {/* Page Heading */}
      <div className="heading enter">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="date">
          <span className="module-phase-tag">
            <LockIcon size={12} /> {phase}
          </span>
        </div>
      </div>

      {/* Hero Preview Card */}
      <div className="placeholder-hero-card enter d1">
        <div className="placeholder-hero-glow" />
        
        <div className="placeholder-hero-content">
          <div className="placeholder-hero-badge">
            <SparklesIcon size={14} className="accent-violet" />
            <span>{badge}</span>
          </div>

          <h2>{title} Module is being activated next.</h2>
          <p className="placeholder-lead">{description}</p>

          <div className="placeholder-actions">
            <Link href="/workspace" className="primary-button-inline">
              Return to Project 001 Workspace
            </Link>
            <Link href="/beats" className="secondary-button-inline">
              Explore Beat Library <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Planned Capabilities Grid */}
      <div className="placeholder-features-section enter d2">
        <div className="placeholder-features-header">
          <div>
            <span className="eyebrow">DESIGN SPECIFICATIONS</span>
            <h3>Planned Module Capabilities</h3>
          </div>
          <span className="phase-pill-subtle">
            <ClockIcon size={12} /> Target: Phase 2 Rollout
          </span>
        </div>

        <div className="placeholder-features-grid">
          {plannedFeatures.map((feature, idx) => (
            <div key={idx} className="placeholder-feature-card">
              <div className="feature-card-header">
                <span className="feature-num">{String(idx + 1).padStart(2, "0")}</span>
                <h4>{feature.title}</h4>
              </div>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subtle Brand Tag */}
      <div className="placeholder-footer enter d3">
        <span>This music venture runs on <strong>FACKTS Music</strong>.</span>
      </div>
    </div>
  );
}

