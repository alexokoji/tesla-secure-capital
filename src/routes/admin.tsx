import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Plus, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Tesla Secure Capital" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  if (!isAdmin) return <div className="container mx-auto p-10 text-center text-muted-foreground">Checking access...</div>;

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <RoiControls />
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="tx">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="notif">Notifications</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="tx"><TxTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalCodesTab /></TabsContent>
        <TabsContent value="wallets"><WalletsTab /></TabsContent>
        <TabsContent value="kyc"><KycTab /></TabsContent>
        <TabsContent value="notif"><NotifTab /></TabsContent>
        <TabsContent value="tickets"><TicketsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function RoiControls() {
  const [busy, setBusy] = useState(false);

  const run = async (force: boolean) => {
    setBusy(true);
    // admin_run_roi isn't in the generated types yet; cast to call it.
    const { error } = await (supabase.rpc as any)("admin_run_roi", { p_force: force });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(force ? "Forced +1 day ROI credited to active investments." : "ROI accrual run — any due payouts credited.");
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => run(false)} disabled={busy}>
        <RefreshCw className="h-4 w-4 mr-2" /> Run ROI now
      </Button>
      <Button size="sm" onClick={() => run(true)} disabled={busy}>
        Force +1 day (test)
      </Button>
    </div>
  );
}

function WithdrawalCodesTab() {
  const { data: reqs, refetch, isFetching } = useQuery({
    queryKey: ["admin-wd-codes"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("admin_list_withdrawal_requests");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const issue = async (userId: string, rowId: string) => {
    setBusyId(rowId);
    const { data, error } = await (supabase.rpc as any)("admin_issue_withdrawal_code", { p_user_id: userId });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(`Code ${data} generated and sent to the user.`);
    refetch();
  };

  return (
    <Card className="p-6 mt-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="font-semibold">Withdrawal Code Requests</h3>
          <p className="text-xs text-muted-foreground">
            Generate a verification code for users who requested one. It's delivered to their notifications and stays valid until they use it for a withdrawal.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      {!reqs?.length ? (
        <p className="text-sm text-muted-foreground">No withdrawal code requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b border-border">
              <tr><th className="py-2">User</th><th>Requested</th><th>Status</th><th>Code</th><th></th></tr>
            </thead>
            <tbody>
              {reqs.map((r: any) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="py-2">
                    <div className="font-medium">{r.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    <Badge variant={r.status === "requested" ? "secondary" : r.status === "issued" ? "default" : "outline"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="font-mono tracking-widest">{r.code ?? "—"}</td>
                  <td>
                    {r.status !== "used" && (
                      <Button size="sm" onClick={() => issue(r.user_id, r.id)} disabled={busyId === r.id}>
                        {busyId === r.id ? "Generating…" : r.status === "issued" ? "Regenerate" : "Generate Code"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function WalletsTab() {
  const { data, refetch } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "wallets").maybeSingle();
      return (data?.value as Record<string, string>) ?? {};
    },
  });
  const [rows, setRows] = useState<{ key: string; address: string }[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newAddr, setNewAddr] = useState("");
  useEffect(() => {
    if (data) setRows(Object.entries(data).map(([key, address]) => ({ key, address })));
  }, [data]);

  const save = async () => {
    const value: Record<string, string> = {};
    for (const r of rows) if (r.key.trim()) value[r.key.trim()] = r.address.trim();
    const { error } = await supabase.from("site_settings").upsert({ key: "wallets", value, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Wallet addresses saved — users can now pay directly.");
    refetch();
  };

  const add = () => {
    if (!newKey.trim() || !newAddr.trim()) return;
    setRows([...rows, { key: newKey.trim(), address: newAddr.trim() }]);
    setNewKey(""); setNewAddr("");
  };

  return (
    <Card className="p-6 mt-4 max-w-3xl space-y-4">
      <div>
        <h3 className="font-semibold">Payment Wallet Addresses</h3>
        <p className="text-xs text-muted-foreground">Users see these addresses when depositing or investing. Common keys: BTC, ETH, USDT_ERC20, USDT_TRC20.</p>
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[140px_1fr_auto] gap-2 items-center">
            <Input value={r.key} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="BTC" />
            <Input value={r.address} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} placeholder="Wallet address" />
            <Button size="icon" variant="outline" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3">
        <Label className="text-xs">Add another wallet</Label>
        <div className="grid grid-cols-[140px_1fr_auto] gap-2 mt-1">
          <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Key (e.g. SOL)" />
          <Input value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="Wallet address" />
          <Button onClick={add} variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
      </div>
      <Button onClick={save} className="w-full">Save Wallets</Button>
    </Card>
  );
}

function UsersTab() {
  const { data: users, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<any | null>(null);

  return (
    <Card className="p-6 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr><th className="py-2">User</th><th>Balance</th><th>Deposit</th><th>Profit</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border/40">
                <td className="py-2">
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td>${Number(u.balance).toLocaleString()}</td>
                <td>${Number(u.total_deposit).toLocaleString()}</td>
                <td>${Number(u.total_profit).toLocaleString()}</td>
                <td><Badge variant={u.status === "active" ? "default" : "destructive"}>{u.status}</Badge></td>
                <td><Button size="sm" variant="outline" onClick={() => setEditing(u)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onSaved={() => { refetch(); setEditing(null); }} />
    </Card>
  );
}

function EditUserDialog({ user, onClose, onSaved }: { user: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (user) setForm({ ...user }); }, [user]);
  if (!user) return null;

  const save = async () => {
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      phone: form.phone,
      country: form.country,
      status: form.status,
      balance: Number(form.balance),
      total_deposit: Number(form.total_deposit),
      total_withdrawal: Number(form.total_withdrawal),
      total_profit: Number(form.total_profit),
    }).eq("id", user.id);
    if (error) return toast.error(error.message);
    toast.success("User updated");
    onSaved();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit User — {user.email}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" value={form.full_name ?? ""} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label="Phone" value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="Country" value={form.country ?? ""} onChange={(v) => setForm({ ...form, country: v })} />
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Balance" type="number" value={form.balance} onChange={(v) => setForm({ ...form, balance: v })} />
          <Field label="Total Deposit" type="number" value={form.total_deposit} onChange={(v) => setForm({ ...form, total_deposit: v })} />
          <Field label="Total Withdrawal" type="number" value={form.total_withdrawal} onChange={(v) => setForm({ ...form, total_withdrawal: v })} />
          <Field label="Total Profit" type="number" value={form.total_profit} onChange={(v) => setForm({ ...form, total_profit: v })} />
        </div>
        <Button onClick={save} className="w-full mt-2">Save Changes</Button>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TxTab() {
  const { data: txs, refetch } = useQuery({
    queryKey: ["admin-tx"],
    queryFn: async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id, email, full_name"),
      ]);
      const map = new Map((p ?? []).map((x) => [x.id, x]));
      return (t ?? []).map((tx) => ({ ...tx, profile: map.get(tx.user_id) }));
    },
  });

  const updateStatus = async (tx: any, newStatus: "approved" | "rejected") => {
    const { error } = await supabase.from("transactions").update({ status: newStatus }).eq("id", tx.id);
    if (error) return toast.error(error.message);

    // Adjust balances if approved
    if (newStatus === "approved") {
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", tx.user_id).maybeSingle();
      if (profile) {
        const update: any = {};
        const amt = Number(tx.amount);
        if (tx.type === "deposit") {
          update.balance = Number(profile.balance) + amt;
          update.total_deposit = Number(profile.total_deposit) + amt;
        } else if (tx.type === "withdrawal") {
          update.balance = Number(profile.balance) - amt;
          update.total_withdrawal = Number(profile.total_withdrawal) + amt;
        } else if (tx.type === "investment") {
          update.balance = Number(profile.balance) - amt;
        } else if (tx.type === "profit") {
          update.balance = Number(profile.balance) + amt;
          update.total_profit = Number(profile.total_profit) + amt;
        }
        if (Object.keys(update).length) await supabase.from("profiles").update(update).eq("id", tx.user_id);
      }
    }
    toast.success(`Transaction ${newStatus}`);
    refetch();
  };

  return (
    <Card className="p-6 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr><th className="py-2">User</th><th>Type</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {txs?.map((t: any) => (
              <tr key={t.id} className="border-b border-border/40">
                <td className="py-2">
                  <div className="font-medium">{t.profile?.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{t.profile?.email}</div>
                </td>
                <td className="capitalize">{t.type}</td>
                <td className="font-semibold">${Number(t.amount).toLocaleString()}</td>
                <td>{t.method ?? "—"}</td>
                <td className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                <td><Badge variant={t.status === "approved" ? "default" : t.status === "rejected" ? "destructive" : "secondary"}>{t.status}</Badge></td>
                <td>
                  {t.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => updateStatus(t, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(t, "rejected")}>Reject</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
function KycTab() {
  const { data: subs, refetch } = useQuery({
    queryKey: ["admin-kyc"],
    queryFn: async () => {
      const [{ data: k }, { data: p }] = await Promise.all([
        supabase.from("kyc_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, email, full_name"),
      ]);
      const map = new Map((p ?? []).map((x) => [x.id, x]));
      return (k ?? []).map((s) => ({ ...s, profile: map.get(s.user_id) }));
    },
  });

  const decide = async (s: any, status: "approved" | "rejected") => {
    await supabase.from("kyc_submissions").update({ status, updated_at: new Date().toISOString() }).eq("id", s.id);
    await supabase.from("profiles").update({ kyc_status: status === "approved" ? "verified" : "rejected" }).eq("id", s.user_id);
    toast.success(`KYC ${status}`);
    refetch();
  };

  const view = async (path: string) => {
    const { data } = await supabase.storage.from("kyc-docs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card className="p-6 mt-4">
      {!subs?.length ? <p className="text-sm text-muted-foreground">No KYC submissions.</p> : (
        <div className="space-y-3">
          {subs.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center border-b border-border/40 pb-3">
              <div>
                <div className="font-medium">{s.profile?.full_name || s.full_name}</div>
                <div className="text-xs text-muted-foreground">{s.profile?.email} · {s.document_type} · {new Date(s.created_at).toLocaleString()}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}>{s.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => view(s.document_path)}>View</Button>
                {s.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => decide(s, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(s, "rejected")}>Reject</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotifTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("broadcast");
  const [userId, setUserId] = useState("");

  const { data: users } = useQuery({
    queryKey: ["notif-users"],
    queryFn: async () => (await supabase.from("profiles").select("id,email")).data ?? [],
  });

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and body required");
    const payload: any = { title, body };
    if (target === "broadcast") payload.broadcast = true;
    else { payload.user_id = userId; payload.broadcast = false; }
    const { error } = await supabase.from("notifications").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Notification sent");
    setTitle(""); setBody("");
  };

  return (
    <Card className="p-6 mt-4 space-y-4 max-w-2xl">
      <div>
        <Label>Send to</Label>
        <Select value={target} onValueChange={setTarget}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="broadcast">All users (broadcast)</SelectItem>
            <SelectItem value="specific">Specific user</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {target === "specific" && (
        <div>
          <Label>User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Pick a user" /></SelectTrigger>
            <SelectContent>{users?.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} /></div>
      <Button onClick={send}>Send notification</Button>
    </Card>
  );
}

function TicketsTab() {
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const { user } = useAuth();

  const { data: tickets, refetch } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("support_tickets").select("*").order("updated_at", { ascending: false }),
        supabase.from("profiles").select("id,email,full_name"),
      ]);
      const map = new Map((p ?? []).map((x) => [x.id, x]));
      return (t ?? []).map((tk) => ({ ...tk, profile: map.get(tk.user_id) }));
    },
  });

  const { data: msgs, refetch: refetchMsgs } = useQuery({
    queryKey: ["admin-ticket-msgs", active],
    enabled: !!active,
    queryFn: async () => (await supabase.from("ticket_messages").select("*").eq("ticket_id", active!).order("created_at")).data ?? [],
  });

  const send = async () => {
    if (!reply.trim() || !active) return;
    await supabase.from("ticket_messages").insert({ ticket_id: active, sender_id: user!.id, is_admin: true, body: reply });
    await supabase.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", active);
    setReply(""); refetchMsgs();
  };

  const close = async (id: string) => {
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", id);
    refetch();
  };

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 mt-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">All tickets</h3>
        {!tickets?.length ? <p className="text-sm text-muted-foreground">No tickets.</p> : (
          <ul className="space-y-1">
            {tickets.map((t: any) => (
              <li key={t.id}>
                <button onClick={() => setActive(t.id)} className={`w-full text-left p-2 rounded text-sm ${active === t.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                  <div className="font-medium truncate">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">{t.profile?.email} · <Badge variant={t.status === "open" ? "default" : "secondary"} className="text-[10px]">{t.status}</Badge></div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="p-6 min-h-[500px] flex flex-col">
        {!active ? <div className="m-auto text-muted-foreground text-sm">Select a ticket</div> : (
          <>
            <div className="flex justify-end mb-2"><Button size="sm" variant="outline" onClick={() => close(active)}>Close ticket</Button></div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {msgs?.map((m: any) => (
                <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.is_admin ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                    <div className="text-xs opacity-70 mb-1">{m.is_admin ? "Support" : "User"} · {new Date(m.created_at).toLocaleString()}</div>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply..." />
              <Button onClick={send}>Send</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
