"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StructuralPivot() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    // Simulate revalidation processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSubmitted(true);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
      
      {/* HEADER BAR */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-mono text-xl font-bold tracking-widest">FP</span>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            Structural Pivot Request
          </span>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" className="font-sans text-sm rounded-none hover:bg-muted transition-none">
            Cancel
          </Button>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-3xl mx-auto">
          
          <h1 className="font-mono text-2xl tracking-widest uppercase mb-12 text-muted-foreground">
            Request Structural Review
          </h1>

          {!isSubmitted && !isProcessing && (
            <form onSubmit={handleSubmit} className="space-y-12">
              <p className="font-sans text-lg text-foreground/80 leading-relaxed bg-card p-6 border border-border">
                Submit this form only if a fundamental structural shift in your reality has occurred. Motivational changes, boredom, or new ideas will be rejected by the revalidation engine.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    What structurally changed?
                  </label>
                  <Input 
                    required
                    className="w-full bg-transparent border-0 border-b border-border rounded-none px-0 pb-2 font-sans text-lg focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="e.g. Lost primary income source / Relocated to new city"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    When did this change occur?
                  </label>
                  <Input 
                    required
                    className="w-full bg-transparent border-0 border-b border-border rounded-none px-0 pb-2 font-sans text-lg focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    Evidence of Change
                  </label>
                  <Input 
                    required
                    className="w-full bg-transparent border-0 border-b border-border rounded-none px-0 pb-2 font-sans text-lg focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="Provide verifiable evidence context"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-3">
                    Which Constraint Matrix variables are affected?
                  </label>
                  <Input 
                    required
                    className="w-full bg-transparent border-0 border-b border-border rounded-none px-0 pb-2 font-sans text-lg focus-visible:ring-0 focus-visible:border-primary"
                    placeholder="e.g. Capital Runway, Geography, Time Capacity"
                  />
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full rounded-none font-sans text-lg h-14 bg-foreground text-background hover:bg-foreground/90 transition-none"
              >
                Submit for Revalidation
              </Button>
            </form>
          )}

          {isProcessing && (
            <div className="py-24 flex justify-center">
              <p className="font-mono text-sm text-muted-foreground animate-pulse">
                Running constraint revalidation and survivability audit...
              </p>
            </div>
          )}

          {isSubmitted && (
            <div className="border border-border p-8 bg-card">
              <h2 className="font-mono text-sm uppercase tracking-widest text-status-positive mb-6">
                Audit Complete
              </h2>
              
              <div className="space-y-6">
                <p className="font-sans text-lg leading-relaxed">
                  The reported change shifts your runway from 87 to 74 days. This remains in the <span className="font-mono font-bold text-status-warning">YELLOW</span> band.
                </p>
                <p className="font-sans text-lg leading-relaxed">
                  Your active trajectory (Localized No-Code Integration System) is within tolerance of this change.
                </p>
                <p className="font-mono text-lg font-bold text-foreground uppercase mt-8">
                  No revision required.
                </p>
              </div>

              <div className="mt-12">
                <Link href="/dashboard">
                  <Button className="w-full rounded-none font-sans text-lg h-14 bg-primary text-primary-foreground hover:bg-primary/90 transition-none">
                    Return to Execution
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}
