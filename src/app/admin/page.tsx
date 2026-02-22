'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, Video, Ticket, LogOut } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  accessType: string;
  type: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  bonusVideos: number;
  active: boolean;
  isOwnerCode: boolean;
  description: string | null;
  createdAt: string;
  _count?: { redemptions: number };
}

interface Stats {
  videosToday: number;
  usersToday: number;
  totalRedemptions: number;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New code form
  const [newCode, setNewCode] = useState({
    code: '',
    accessType: 'BONUS_VIDEOS',
    type: 'UNLIMITED',
    maxUses: '',
    expiresAt: '',
    bonusVideos: '10',
    description: '',
  });

  const fetchData = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/codes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes);
        setStats(data.stats);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (password) {
      setIsAuthenticated(true);
      fetchData(password);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setCodes([]);
    setStats(null);
  };

  const handleCreateCode = async () => {
    if (!newCode.code) return;

    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify(newCode),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Code created', description: `Code ${newCode.code} created successfully` });
        setDialogOpen(false);
        setNewCode({
          code: '',
          accessType: 'BONUS_VIDEOS',
          type: 'UNLIMITED',
          maxUses: '',
          expiresAt: '',
          bonusVideos: '10',
          description: '',
        });
        fetchData(password);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create code' });
    }
  };

  const handleDeleteCode = async (codeId: string, codeName: string) => {
    if (!confirm(`Delete code "${codeName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/codes?id=${codeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${password}` },
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Code deleted' });
        fetchData(password);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete code' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter admin password"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Video className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.videosToday}</div>
                    <div className="text-sm text-muted-foreground">Videos Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.usersToday}</div>
                    <div className="text-sm text-muted-foreground">Users Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Ticket className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.totalRedemptions}</div>
                    <div className="text-sm text-muted-foreground">Total Redemptions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Promo Codes Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Promo Codes</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  New Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Promo Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={newCode.code}
                      onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., SUMMER2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Type</Label>
                    <Select
                      value={newCode.accessType}
                      onValueChange={(v) => setNewCode({ ...newCode, accessType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BONUS_VIDEOS">Bonus Videos (+10)</SelectItem>
                        <SelectItem value="UNLIMITED">Unlimited Access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newCode.accessType === 'BONUS_VIDEOS' && (
                    <div className="space-y-2">
                      <Label>Bonus Videos</Label>
                      <Input
                        type="number"
                        value={newCode.bonusVideos}
                        onChange={(e) => setNewCode({ ...newCode, bonusVideos: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Input
                      value={newCode.description}
                      onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                      placeholder="Internal notes"
                    />
                  </div>
                  <Button onClick={handleCreateCode} className="w-full">
                    Create Code
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No promo codes yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-bold">{code.code}</TableCell>
                      <TableCell>
                        {code.accessType === 'UNLIMITED' ? (
                          <Badge>Unlimited</Badge>
                        ) : (
                          <Badge variant="secondary">+{code.bonusVideos} videos</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.currentUses}
                        {code.maxUses ? ` / ${code.maxUses}` : ''}
                      </TableCell>
                      <TableCell>
                        {code.isOwnerCode ? (
                          <Badge variant="destructive">Owner</Badge>
                        ) : code.active ? (
                          <Badge variant="default" className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(code.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {!code.isOwnerCode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCode(code.id, code.code)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
