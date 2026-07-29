'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, Clock, Key, Lock, Save, Upload, Plus,
  Trash2, RefreshCw, Eye, EyeOff, Globe, Bell, Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { authService } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: { role: { name: string; slug: string } }[];
  createdAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanySettingsPage() {
  const { toast } = useToast();
  const user = authService.getUser();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Company Profile
  const [companyProfile, setCompanyProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    timezone: 'UTC',
    language: 'en',
  });

  // Business Hours
  const [businessHours, setBusinessHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  });

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notifications
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    campaignUpdates: true,
    callSummaries: true,
    weeklyReports: false,
  });

  // Team
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // API Keys (mock — real integration uses /api-keys endpoint)
  const [apiKeys] = useState([
    { id: 'key_1', name: 'Production Key', key: 'sk-prod-••••••••••••••••', created: '2025-01-01', lastUsed: '2025-07-28' },
  ]);

  // ─── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadCompanyProfile();
    loadTeam();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setLoading(true);
      const [companyRes, settingsRes] = await Promise.all([
        api.get(`/companies/${user?.companyId}`).catch(() => null),
        api.get('/settings/company').catch(() => null),
      ]);

      if (companyRes?.data?.data) {
        const c = companyRes.data.data;
        setCompanyProfile(prev => ({
          ...prev,
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
          website: c.website || '',
        }));
      }

      if (settingsRes?.data?.data) {
        const s = settingsRes.data.data;
        setCompanyProfile(prev => ({
          ...prev,
          timezone: s.timezone || 'UTC',
          language: s.language || 'en',
        }));
      }
    } catch {
      // Silently fail — form stays empty
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    try {
      setTeamLoading(true);
      const res = await api.get('/users', {
        params: { limit: 50, page: 1 },
      });
      setTeam(res.data?.data?.items || res.data?.data?.users || []);
    } catch {
      setTeam([]);
    } finally {
      setTeamLoading(false);
    }
  };

  // ─── Save handlers ──────────────────────────────────────────────────────────

  const saveCompanyProfile = async () => {
    try {
      setSaving(true);
      await api.patch(`/companies/${user?.companyId}`, {
        name: companyProfile.name,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.address,
        website: companyProfile.website,
      });

      await api.put('/settings/company', {
        timezone: companyProfile.timezone,
        language: companyProfile.language,
      });

      toast({ title: 'Saved', description: 'Company profile updated successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save company profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessHours = async () => {
    try {
      setSaving(true);
      await api.put('/settings/company', { businessHours });
      toast({ title: 'Saved', description: 'Business hours updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save business hours.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving(true);
      await api.put('/settings/notifications', notifications);
      toast({ title: 'Saved', description: 'Notification preferences updated.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save notifications.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({ title: 'Error', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      await api.post(`/users/${user?.id}/change-password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Success', description: 'Password changed successfully.' });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to change password.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const dayLabels: Record<string, string> = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
    thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
  };

  const getRoleLabel = (member: TeamMember) => {
    const role = member.roles?.[0]?.role;
    return role?.name || 'User';
  };

  const getRoleBadgeColor = (member: TeamMember) => {
    const slug = member.roles?.[0]?.role?.slug || '';
    if (slug.includes('admin')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    if (slug.includes('manager')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    if (status === 'INACTIVE') return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your company configuration and preferences</p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" /> Team
          </TabsTrigger>
          <TabsTrigger value="hours" className="gap-2">
            <Clock className="h-4 w-4" /> Hours
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* ── Company Profile ── */}
        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Company Profile
              </CardTitle>
              <CardDescription>Update your company information and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo upload section */}
              <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{companyProfile.name || 'Company Logo'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">PNG, JPG or WebP · Max 5MB</p>
                  <Button variant="outline" size="sm" className="mt-2 gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    value={companyProfile.name}
                    onChange={e => setCompanyProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Acme Corporation"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Business Email *</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyProfile.email}
                    onChange={e => setCompanyProfile(p => ({ ...p, email: e.target.value }))}
                    placeholder="company@example.com"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone Number</Label>
                  <Input
                    id="company-phone"
                    value={companyProfile.phone}
                    onChange={e => setCompanyProfile(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company-website"
                      value={companyProfile.website}
                      onChange={e => setCompanyProfile(p => ({ ...p, website: e.target.value }))}
                      placeholder="https://example.com"
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company-address">Address</Label>
                  <Input
                    id="company-address"
                    value={companyProfile.address}
                    onChange={e => setCompanyProfile(p => ({ ...p, address: e.target.value }))}
                    placeholder="123 Business Ave, City, Country"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={companyProfile.timezone}
                    onChange={e => setCompanyProfile(p => ({ ...p, timezone: e.target.value }))}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <select
                    id="language"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={companyProfile.language}
                    onChange={e => setCompanyProfile(p => ({ ...p, language: e.target.value }))}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                    <option value="hi">Hindi</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveCompanyProfile} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team Members ── */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Team Members
                </CardTitle>
                <CardDescription>Manage who has access to your company portal</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled>
                <Plus className="h-4 w-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              {teamLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : team.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No team members yet</p>
                  <p className="text-sm mt-1">Invite colleagues to collaborate</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.firstName} {member.lastName}
                          {member.id === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(member)}`}>
                          {getRoleLabel(member)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Business Hours ── */}
        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Business Hours
              </CardTitle>
              <CardDescription>Set when your AI agents are allowed to make calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(businessHours) as [string, { enabled: boolean; start: string; end: string }][]).map(
                ([day, config]) => (
                  <div key={day} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="w-28 flex items-center gap-3">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) =>
                          setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof typeof prev], enabled: checked },
                          }))
                        }
                      />
                      <Label
                        className={`text-sm font-medium cursor-pointer ${!config.enabled ? 'text-muted-foreground' : ''}`}
                        onClick={() =>
                          setBusinessHours(prev => ({
                            ...prev,
                            [day]: { ...prev[day as keyof typeof prev], enabled: !config.enabled },
                          }))
                        }
                      >
                        {dayLabels[day]}
                      </Label>
                    </div>

                    {config.enabled ? (
                      <div className="flex items-center gap-3 flex-1">
                        <Input
                          type="time"
                          value={config.start}
                          onChange={e =>
                            setBusinessHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], start: e.target.value },
                            }))
                          }
                          className="w-36"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                          type="time"
                          value={config.end}
                          onChange={e =>
                            setBusinessHours(prev => ({
                              ...prev,
                              [day]: { ...prev[day as keyof typeof prev], end: e.target.value },
                            }))
                          }
                          className="w-36"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground flex-1">Closed</p>
                    )}
                  </div>
                )
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={saveBusinessHours} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Hours'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'emailAlerts', label: 'Email Alerts', description: 'Receive important alerts via email' },
                { key: 'campaignUpdates', label: 'Campaign Updates', description: 'Get notified when campaigns start, pause or complete' },
                { key: 'callSummaries', label: 'Call Summaries', description: 'Daily summary of call activity and results' },
                { key: 'weeklyReports', label: 'Weekly Reports', description: 'Weekly performance report every Monday' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={v =>
                      setNotifications(prev => ({ ...prev, [item.key]: v }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={saveNotifications} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security / Password ── */}
        <TabsContent value="security" className="space-y-4">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  >
                    {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.newPassword && passwordForm.confirmPassword &&
                  passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={changePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword}
                  variant="destructive"
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  {saving ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Keys */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-indigo-600" />
                  API Keys
                </CardTitle>
                <CardDescription>Manage API keys for programmatic access to your account</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-2" disabled>
                <Plus className="h-4 w-4" />
                New Key
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="flex items-center gap-4 p-4 rounded-lg border">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{k.name}</p>
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{k.key}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last used: {k.lastUsed} · Created: {k.created}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="icon" variant="ghost" title="Regenerate key">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" title="Delete key">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
