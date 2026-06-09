import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Shield, Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { OkxWalletCard } from "@/components/dashboard/okx-wallet-card";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — CashBullX" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [twoFA, setTwoFA] = useState(profile?.two_factor_enabled ?? false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim().slice(0, 80),
      username: username.trim().slice(0, 32) || null,
      bio: bio.trim().slice(0, 280) || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Profile saved"); refreshProfile(); }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploading(false);
    toast.success("Avatar updated");
    refreshProfile();
  };

  const toggle2FA = async (v: boolean) => {
    if (!user) return;
    setTwoFA(v);
    await supabase.from("profiles").update({ two_factor_enabled: v }).eq("id", user.id);
    toast.success(v ? "2FA enabled (UI demo)" : "2FA disabled");
    refreshProfile();
  };

  return (
    <div className="space-y-6 animate-float-up max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">Your profile</h1>
        <p className="text-muted-foreground mt-1">Manage your identity and security.</p>
      </header>

      <Card className="glass-strong border-border p-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">{(fullName || "U").slice(0,1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Camera className="h-6 w-6 text-white" />
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{profile?.full_name ?? "User"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">Lv {profile?.level ?? 1}</Badge>
              <Badge variant="outline">{profile?.xp ?? 0} XP</Badge>
              <Badge variant="outline" className="capitalize">{profile?.status ?? "active"}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="glass-strong border-border p-6 space-y-4">
        <h2 className="font-semibold">Edit profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} /></div>
          <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} placeholder="cooluser" /></div>
        </div>
        <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} placeholder="Tell us a bit about you (280 chars max)" /></div>
        <Button onClick={save} disabled={saving} className="btn-primary-gradient">Save changes</Button>
      </Card>

      <Card className="glass-strong border-border p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" />Security</h2>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Email verification</p><p className="text-xs text-muted-foreground">{user?.email_confirmed_at ? "Verified" : "Pending"}</p></div></div>
          <Badge variant={user?.email_confirmed_at ? "default" : "secondary"}>{user?.email_confirmed_at ? "Verified" : "Unverified"}</Badge>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm font-medium">Two-factor authentication</p><p className="text-xs text-muted-foreground">Extra security at sign-in</p></div></div>
          <Switch checked={twoFA} onCheckedChange={toggle2FA} />
        </div>
        <div className="p-3 rounded-xl bg-white/5">
          <p className="text-sm font-medium mb-1">Active session</p>
          <p className="text-xs text-muted-foreground">Started {user ? new Date(user.last_sign_in_at ?? user.created_at).toLocaleString() : "—"}</p>
        </div>
      </Card>
    </div>
  );
}