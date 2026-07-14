import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Leads</h1>
        <p className="text-sm text-muted-foreground">Upload scraped clinic data as new leads</p>
      </div>
      <ImportForm />
    </div>
  );
}
