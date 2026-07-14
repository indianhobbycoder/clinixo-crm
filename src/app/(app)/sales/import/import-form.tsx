"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { importLeads, type RawLeadRow, type ImportResult } from "./actions";

const HEADER_MAP: Record<string, keyof RawLeadRow> = {
  clinic_name: "clinic_name",
  name: "clinic_name",
  clinic: "clinic_name",
  phone: "phone",
  phone_number: "phone",
  rating: "rating",
  review_count: "review_count",
  reviews: "review_count",
  address: "address",
  city: "city",
  state: "state",
  speciality: "speciality",
  specialty: "speciality",
  city_tier: "city_tier",
};

function normalizeRow(raw: Record<string, string>): RawLeadRow | null {
  const row: Partial<RawLeadRow> = {};
  for (const [key, value] of Object.entries(raw)) {
    const mapped = HEADER_MAP[key.trim().toLowerCase().replace(/\s+/g, "_")];
    if (!mapped || value === undefined || value === "") continue;
    if (mapped === "rating" || mapped === "review_count" || mapped === "city_tier") {
      (row as Record<string, unknown>)[mapped] = Number(value);
    } else {
      (row as Record<string, unknown>)[mapped] = value.trim();
    }
  }
  if (!row.clinic_name || !row.phone) return null;
  return row as RawLeadRow;
}

export function ImportForm() {
  const [rows, setRows] = useState<RawLeadRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map(normalizeRow);
        const valid = parsed.filter((r): r is RawLeadRow => r !== null);
        setSkipped(parsed.length - valid.length);
        setRows(valid);
      },
      error: (err) => toast.error(`Failed to parse CSV: ${err.message}`),
    });
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await importLeads(fileName, rows);
      setResult(res);
      toast.success(`Imported ${res.inserted} leads (${res.duplicates} duplicates skipped)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Expected columns: clinic_name, phone, rating, review_count, address, city, state, speciality. Extra columns are
            ignored. Duplicate detection runs on phone number.
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="text-sm"
          />
          {rows.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm">
                Parsed {rows.length} valid rows{skipped > 0 ? ` (${skipped} rows skipped — missing clinic_name or phone)` : ""}
                from {fileName}.
              </p>
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clinic</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 20).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.clinic_name}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell>{r.city ?? "-"}</TableCell>
                        <TableCell>{r.rating ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 20 ? <p className="text-xs text-muted-foreground">Showing first 20 of {rows.length} rows.</p> : null}
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${rows.length} leads`}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Total rows: {result.total}</p>
            <p>Inserted: {result.inserted}</p>
            <p>Duplicates skipped: {result.duplicates}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
