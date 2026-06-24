import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ProgressReality() {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
      
      {/* HEADER BAR */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center space-x-4">
          <span className="font-mono text-xl font-bold tracking-widest">FP</span>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            Telemetry Dashboard
          </span>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" className="font-sans text-sm rounded-none hover:bg-muted transition-none">
            Return to Dashboard
          </Button>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-mono text-2xl tracking-widest uppercase mb-16 text-muted-foreground">
            Progress Reality
          </h1>

          <div className="grid grid-cols-2 gap-12 mb-16">
            
            <div className="border-l border-border pl-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Probability Estimate Delta</h2>
              <p className="font-mono text-xl text-status-positive">
                18.4% <span className="text-muted-foreground mx-2">→</span> 22.1%
              </p>
            </div>

            <div className="border-l border-border pl-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Execution Consistency</h2>
              <div className="flex items-center space-x-4">
                <p className="font-mono text-xl text-status-positive">
                  42 <span className="text-muted-foreground mx-2">→</span> 84
                </p>
                <div className="flex items-end h-6 space-x-1 opacity-80">
                  <div className="w-1.5 h-2 bg-muted-foreground" />
                  <div className="w-1.5 h-3 bg-muted-foreground" />
                  <div className="w-1.5 h-4 bg-muted-foreground" />
                  <div className="w-1.5 h-6 bg-status-positive" />
                </div>
              </div>
            </div>

            <div className="border-l border-border pl-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Cognitive Endurance (Unbroken Focus)</h2>
              <p className="font-mono text-xl text-foreground">
                45 mins <span className="text-muted-foreground mx-2">→</span> 90 mins
              </p>
            </div>

            <div className="border-l border-border pl-6">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Task Completion Ratio</h2>
              <p className="font-mono text-xl text-foreground">
                68.2%
              </p>
            </div>

          </div>

          <div className="border border-border p-8 bg-card max-w-2xl">
            <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Forensic Fact</h3>
            <p className="font-sans text-lg leading-relaxed">
              You missed the 14-day revenue milestone. Your execution consistency has increased from 42 to 84 over this period. These are not the same metric and should not be confused. The system is recalibrating the timeline based on your demonstrated consistency.
            </p>
          </div>
          
        </div>
      </main>

    </div>
  );
}
