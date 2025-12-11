import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { UserPlus, Shield, Edit, Trash2 } from 'lucide-react';
import { mockAdmins, mockAuditLogs } from '../../lib/mockData';
import { formatDateTime } from '../../lib/utils';
import { toast } from 'sonner';
import type { Admin, Role } from '../../lib/types';

export function AdminManagement() {
  const [admins, setAdmins] = useState(mockAdmins);
  const [auditLogs, setAuditLogs] = useState(mockAuditLogs);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: '', name: '', role: 'Support' as Role });

  const handleCreateAdmin = () => {
    const admin: Admin = {
      id: `admin-${Date.now()}`,
      ...newAdmin,
      createdAt: new Date().toISOString(),
      twoFactorEnabled: false,
      permissions: newAdmin.role === 'SuperAdmin' ? ['*'] : ['users', 'tickets']
    };

    setAdmins([...admins, admin]);
    toast.success('Admin Created', {
      description: `Admin account created for ${admin.name}`
    });

    setShowCreateDialog(false);
    setNewAdmin({ email: '', name: '', role: 'Support' });
  };

  const handleDeleteAdmin = (adminId: string) => {
    setAdmins(admins.filter(a => a.id !== adminId));
    toast.success('Admin Deleted', {
      description: 'Admin account has been removed'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Admin Management</h1>
          <p className="text-gray-500 mt-1">Manage admin accounts and audit logs</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge>
                      <Shield className="h-3 w-3 mr-1" />
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={admin.twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {admin.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(admin.createdAt)}</TableCell>
                  <TableCell>{admin.lastLogin ? formatDateTime(admin.lastLogin) : 'Never'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteAdmin(admin.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">{log.adminName}</span>
                      <Badge variant="outline" className="text-xs">{log.module}</Badge>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">{log.details}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                      <span>IP: {log.ip}</span>
                      <span>{formatDateTime(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
            <DialogDescription>Add a new admin to the platform</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="Admin name"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as Role })}
              >
                <option value="SuperAdmin">SuperAdmin</option>
                <option value="Support">Support</option>
                <option value="Finance">Finance</option>
                <option value="Compliance">Compliance</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} disabled={!newAdmin.email || !newAdmin.name}>
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
