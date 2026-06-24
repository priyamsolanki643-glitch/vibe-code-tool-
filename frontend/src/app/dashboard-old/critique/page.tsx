"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CritiqueState = "CRITIQUE" | "DIAGNOSTICS" | "DIAGNOSTICS_PROCESSING" | "DIAGNOSIS_RESULT";

export default function CritiqueTerminal() {
  const router = useRouter();
  const [viewState, setViewState] = useState<CritiqueState>("CRITIQUE");
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [unknownReason, setUnknownReason] = useState("");

  const handleAcknowledge = () => {
    // In a real app, this generates a RECOVERY SPRINT task and routes back to dashboard
    router.push("/dashboard");
  };

  const handleDeclareFailure = () => {
    setViewState("DIAGNOSTICS");
  };

  const submitDiagnostics = (reason: string) => {
    setFailureReason(reason);
    if (reason === "Unknown") return; // Wait for text input

    processDiagnosis();
  };

  const submitUnknownDiagnostics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unknownReason.trim()) return;
    processDiagnosis();
  };

  const processDiagnosis = () => {
    setViewState("DIAGNOSTICS_PROCESSING");
    setTimeout(() => {
      setViewState("DIAGNOSIS_RESULT");
    }, 2000);
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-700
      ${viewState === "CRITIQUE" ? "bg-[#10141a] border-4 border-critique-accent" : "bg-background border-0"}
    `}>
      
      {/* HEADER BAR - Mode Shift */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 bg-transparent">
        <div className="flex items-center space-x-4">
          <span className="font-mono text-xl font-bold tracking-widest">FP</span>
          <span className={`font-mono text-xs uppercase tracking-widest ${
            viewState === "CRITIQUE" ? "text-critique-accent" : "text-status-danger"
          }`}>
            {viewState === "CRITIQUE" ? "Accountability: Active" : "Failure Diagnostics: Active"}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-12 relative">
        
        {/* SCREEN 7: CRITIQUE TERMINAL */}
        {viewState === "CRITIQUE" && (
          <div className="max-w-4xl w-full">
            <p className="font-sans text-3xl font-medium leading-relaxed mb-16 text-foreground/90">
              You aborted the sprint 12 minutes in. The telemetry indicates no network loss or system failure. The constraint matrix confirms you have the capability. You chose not to execute.
            </p>

            <div className="flex flex-col space-y-6">
              <Button 
                onClick={handleAcknowledge}
                variant="outline"
                className="w-full justify-start h-20 px-8 text-xl font-sans rounded-none border-border hover:bg-border/50 transition-none"
              >
                Acknowledge and commit to recovery sprint.
              </Button>

              <Button 
                onClick={handleDeclareFailure}
                variant="outline"
                className="w-full justify-start h-20 px-8 text-xl font-sans rounded-none border-status-danger text-status-danger hover:bg-status-danger/10 hover:text-status-danger transition-none"
              >
                Declare failure mode.
              </Button>
            </div>
          </div>
        )}

        {/* SCREEN 8: FAILURE DIAGNOSTICS */}
        {(viewState === "DIAGNOSTICS" || viewState === "DIAGNOSTICS_PROCESSING" || viewState === "DIAGNOSIS_RESULT") && (
          <div className="absolute inset-0 bg-background/95 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl border border-border bg-card p-12">
              <h2 className="font-mono text-lg uppercase tracking-widest mb-12 text-muted-foreground">Failure Analysis</h2>

              {viewState === "DIAGNOSTICS" && (
                <>
                  <h3 className="font-sans text-2xl font-medium mb-8">What caused the failure?</h3>
                  <div className="space-y-3 mb-8">
                    {["Procrastination", "Cognitive Burnout", "External Obstacle", "Infrastructure Issue", "Unknown"].map((opt) => (
                      <Button
                        key={opt}
                        variant="outline"
                        onClick={() => submitDiagnostics(opt)}
                        className={`w-full justify-start h-14 px-6 font-sans text-lg rounded-none border-border hover:bg-border/50 transition-none ${
                          failureReason === opt ? "bg-muted" : ""
                        }`}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>

                  {failureReason === "Unknown" && (
                    <form onSubmit={submitUnknownDiagnostics}>
                      <Input
                        autoFocus
                        value={unknownReason}
                        onChange={(e) => setUnknownReason(e.target.value)}
                        placeholder="Describe what happened in one sentence."
                        className="w-full h-14 bg-transparent border-0 border-b border-border rounded-none px-0 text-xl font-sans focus-visible:ring-0 focus-visible:border-primary"
                      />
                    </form>
                  )}
                </>
              )}

              {viewState === "DIAGNOSTICS_PROCESSING" && (
                <div className="py-20 text-center">
                  <p className="font-mono text-sm text-muted-foreground animate-pulse">
                    Processing failure telemetry...
                  </p>
                </div>
              )}

              {viewState === "DIAGNOSIS_RESULT" && (
                <div className="py-8">
                  <h3 className="font-mono text-sm text-status-danger uppercase tracking-widest mb-6">Diagnosis: Behavioral Avoidance</h3>
                  <p className="font-sans text-xl leading-relaxed mb-12">
                    Action requirement exceeds current baseline cognitive endurance. Strategy requires temporary compression. 
                    Next operational objective has been bisected into two lower-friction micro-sprints.
                  </p>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-14 font-sans text-lg rounded-none bg-primary text-primary-foreground transition-none"
                  >
                    Accept System Adjustment
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
