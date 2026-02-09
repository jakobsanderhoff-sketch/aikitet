import Link from "next/link";
import { Grid3x3, Sparkles, Shield } from "lucide-react";
import { SplineSection } from "@/components/SplineSection";
import { MapSection } from "@/components/MapSection";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WaitlistCount } from "@/components/WaitlistCount";
import { Footer } from "@/components/Footer";
import { DashboardPreview } from "@/components/DashboardPreview";

export default function Home() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden">
        {/* Grid background */}
        <div className="cad-grid absolute inset-0 opacity-40 pointer-events-none" />

        {/* Hero Section */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Powered by AI
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
              Your AI Architect.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Local Laws Compliant.
              </span>
              <br />
              Instant Blueprints.
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Professional floor plans in seconds. AutoCAD-style precision meets
              AI intelligence. Starting with Danish building regulations,
              expanding worldwide.
            </p>

            {/* Waitlist Form */}
            <WaitlistForm className="mb-4" />

            {/* Social proof */}
            <div className="mt-4">
              <WaitlistCount />
            </div>

          </div>
        </div>

        {/* Spline Section */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <SplineSection />
        </div>

        {/* Map Section */}
        <MapSection />

        {/* Feature Grid */}
        <div className="mx-auto mt-32 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<Grid3x3 className="h-8 w-8 text-primary" />}
            title="AutoCAD Precision"
            description="Professional-grade floor plans with pixel-perfect accuracy and technical precision."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-primary" />}
            title="Building Code Compliance"
            description="Automatically ensures adherence to Hvidovre municipality building regulations."
          />
          <FeatureCard
            icon={<Sparkles className="h-8 w-8 text-primary" />}
            title="AI-Powered Design"
            description="Gemini AI understands your requirements and generates optimized layouts instantly."
          />
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-32 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">
              See it in action
            </h2>
            <p className="text-sm text-muted-foreground">
              Chat with AI, approve the blueprint, furnish all rooms — click to explore
            </p>
          </div>
          <div className="cad-border cad-hover rounded-xl bg-card p-2 shadow-2xl shadow-primary/10">
            <div className="h-[600px] rounded-lg bg-zinc-950 overflow-hidden">
              <DashboardPreview />
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6">
            Ready to build?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join the waitlist for early access. We are onboarding architects
            weekly.
          </p>
          <WaitlistForm />
          <p className="mt-6 text-sm text-muted-foreground">
            Or reach out directly:{" "}
            <a
              href="mailto:Jakobsanderhoff@gmail.com"
              className="text-foreground hover:underline"
            >
              Jakobsanderhoff@gmail.com
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="cad-border cad-hover rounded-lg bg-card p-6 shadow-lg">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
