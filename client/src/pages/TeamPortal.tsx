import TechnicalLabel from "@/components/ui/technical-label";
import Barcode from "@/components/ui/barcode";

export default function TeamPortal() {
  return (
    <div className="min-h-screen bg-background">
      {/* Placeholder for Team Portal */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="text-center mb-8">
          <TechnicalLabel text="TEAM PORTAL MODULE" />
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-black mb-4">
            TEAM PORTAL
          </h1>
          <Barcode className="w-48 h-10 mx-auto" />
        </div>
        
        <div className="bg-white border-3 border-black p-8">
          <p className="text-xl font-bold text-center">
            Team Portal is being built...
          </p>
          <p className="text-center mt-4 text-muted-foreground">
            This will include Dashboard, Inbox, Data, and Team Keys sections
          </p>
        </div>
      </div>
    </div>
  );
}