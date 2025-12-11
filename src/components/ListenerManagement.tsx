import React, { useEffect, useState } from 'react';
import { mockListeners, Listener } from '../lib/mockData';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, CheckCircle, XCircle, Ban, DollarSign, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const ListenerManagement: React.FC = () => {
  const [listeners, setListeners] = useState<Listener[]>(mockListeners);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedListener, setSelectedListener] = useState<Listener | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const itemsPerPage = 10;

  const filteredListeners = listeners.filter((listener) => {
    const matchesSearch = listener.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listener.expertiseTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || listener.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredListeners.length / itemsPerPage);
  const paginatedListeners = filteredListeners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleApprove = (listener: Listener) => {
    setListeners((prev) =>
      prev.map((l) => (l.id === listener.id ? { ...l, verificationStatus: 'approved' } : l))
    );
    toast.success('Listener approved successfully');
  };

  const handleReject = (listener: Listener) => {
    setListeners((prev) =>
      prev.map((l) => (l.id === listener.id ? { ...l, verificationStatus: 'rejected' } : l))
    );
    toast.success('Listener rejected');
  };

  const handleSuspend = (listener: Listener) => {
    const newStatus = listener.status === 'suspended' ? 'active' : 'suspended';
    setListeners((prev) =>
      prev.map((l) => (l.id === listener.id ? { ...l, status: newStatus } : l))
    );
    toast.success(`Listener ${newStatus === 'suspended' ? 'suspended' : 'reactivated'} successfully`);
  };

  const handlePayout = () => {
    if (!selectedListener || !payoutAmount) return;

    const amount = parseFloat(payoutAmount);
    if (amount > selectedListener.earnings) {
      toast.error('Payout amount exceeds earnings');
      return;
    }

    setListeners((prev) =>
      prev.map((l) =>
        l.id === selectedListener.id
          ? { ...l, earnings: l.earnings - amount }
          : l
      )
    );
    toast.success(`Payout of ₹${amount} processed successfully`);
    setPayoutOpen(false);
    setPayoutAmount('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Listener Management</h1>
        <p className="text-gray-600">Manage listeners, verify accounts, and process payouts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name or expertise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Listener ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedListeners.map((listener) => (
                <TableRow key={listener.id}>
                  <TableCell className="text-gray-600">{listener.id}</TableCell>
                  <TableCell>{listener.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {listener.expertiseTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{listener.experience}y</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <span className="text-gray-900">{listener.rating.toFixed(1)}</span>
                      <span className="text-yellow-500 ml-1">★</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        listener.verificationStatus === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : listener.verificationStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }
                    >
                      {listener.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        listener.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {listener.status}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{listener.earnings.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {listener.verificationStatus === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(listener)}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(listener)}
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSuspend(listener)}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedListener(listener);
                          setPayoutOpen(true);
                        }}
                        disabled={listener.earnings === 0}
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredListeners.length)} of {filteredListeners.length} listeners
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Modal */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
          </DialogHeader>
          {selectedListener && (
            <div className="space-y-4">
              <div>
                <Label>Listener: {selectedListener.name}</Label>
                <p className="text-sm text-gray-600 mt-1">Total Earnings: ₹{selectedListener.earnings.toLocaleString()}</p>
              </div>
              <div>
                <Label>Payout Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter payout amount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  max={selectedListener.earnings}
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select defaultValue="bank_transfer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayout}>Process Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
