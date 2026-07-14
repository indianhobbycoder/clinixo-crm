"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { lookupAccountByPhone, sendPhoneToSalesAsLead, createTicket } from "./actions";
import type { Account, LeadPriority, TicketCategory, TicketChannel } from "@/lib/supabase/database.types";

const CHANNELS: TicketChannel[] = ["phone", "whatsapp", "email"];
const CATEGORIES: TicketCategory[] = ["billing", "product_bug", "training", "hardware", "other"];
const PRIORITIES: LeadPriority[] = ["urgent", "high", "normal", "low"];

export function NewComplaintDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [clinicName, setClinicName] = useState("");
  const [channel, setChannel] = useState<TicketChannel>("phone");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [priority, setPriority] = useState<LeadPriority>("normal");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setPhone("");
    setAccount(undefined);
    setClinicName("");
    setDescription("");
  }

  function handleLookup() {
    startTransition(async () => {
      const result = await lookupAccountByPhone(phone);
      setAccount(result ?? null);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<Button />}>New Complaint</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Complaint</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label>Phone number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
            </div>
            <Button variant="secondary" onClick={handleLookup} disabled={!phone || isPending}>
              Look up
            </Button>
          </div>

          {account === null ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Not a current customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This number doesn&apos;t match any account. Keep it out of the service queue and send it to Sales instead.
                </p>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Clinic name (optional)" />
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await sendPhoneToSalesAsLead(phone, clinicName);
                        toast.success("Sent to Sales as a new lead");
                        setOpen(false);
                        reset();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed");
                      }
                    })
                  }
                >
                  Send to Sales as lead
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {account ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{account.clinic_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">MRR ₹{Number(account.mrr).toLocaleString("en-IN")}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Channel</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v as TicketChannel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the issue?" />
                </div>

                <Button
                  disabled={!description.trim() || isPending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        const ticket = await createTicket(account.id, channel, category, description, priority);
                        setOpen(false);
                        router.push(`/service/tickets/${ticket.id}`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Failed to create ticket");
                      }
                    })
                  }
                >
                  Create ticket
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
