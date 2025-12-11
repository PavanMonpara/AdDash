import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Search, MoreVertical, Eye, Ban, Trash2, DollarSign, Download, Filter, Edit } from 'lucide-react';
import { mockUsers } from '../../lib/mockData';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor, exportToCSV } from '../../lib/utils';
import { toast } from 'sonner';
import type { User } from '../../lib/types';
import { DeleteUserApi, GetAllUserApi, UpdateUserApi, ViewUserApi } from '../../api';
import { useMutation, useQuery } from '@tanstack/react-query';
import ReactPaginate from "react-paginate";
import { Formik, useFormik } from "formik";
import { UserUpdateFormData } from '../../types';
import { useGlobalLoader } from '../../store';
import { UserSchema } from '../../validation';


export function UserManagement() {
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletAction, setWalletAction] = useState<'credit' | 'debit'>('credit');
  const [page, setPage] = useState<number>(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showUpdateUserDialog, setShowUpdateUserDialog] = useState(false);
  const setIsGlobalLoading = useGlobalLoader((state) => state.setIsLoading);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: userData, refetch, isLoading, isFetching } = useQuery({
    queryKey: ['get-user-api', page],
    queryFn: GetAllUserApi,
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, [])

  useEffect(() => {
    refetch();
  }, [page])

  useEffect(() => {
    if (userData) {
      if (userData?.data?.pagination < page) {
        setPage(1);
      }
    }
  }, [userData])

  const UserData = userData?.data?.data;
  const paginationData = userData?.data?.pagination;

  const handleBlockUser = (userId: string) => {
    setUsers(users.map(u =>
      u._id === userId ? { ...u, status: u.status === 'blocked' ? 'active' : 'blocked' } : u
    ));
    const user = users.find(u => u._id === userId);
    toast.success(user?.status === 'blocked' ? 'User Unblocked' : 'User Blocked', {
      description: `User ${user?.alias} has been ${user?.status === 'blocked' ? 'unblocked' : 'blocked'}`
    });
  };

  const handleWalletAdjust = () => {
    if (!selectedUser || !walletAmount) return;

    const amount = parseFloat(walletAmount);
    const newBalance = walletAction === 'credit'
      ? selectedUser.wallet + amount
      : selectedUser.wallet - amount;

    setUsers(users.map(u =>
      u._id === selectedUser._id ? { ...u, wallet: newBalance } : u
    ));

    toast.success('Wallet Adjusted', {
      description: `${walletAction === 'credit' ? 'Added' : 'Deducted'} ${formatCurrency(amount)} ${walletAction === 'credit' ? 'to' : 'from'} ${selectedUser.alias}'s wallet`
    });

    setShowWalletDialog(false);
    setWalletAmount('');
  };

  const handleExportCSV = () => {
    const exportData = filteredUsers?.map(user => ({
      'User ID': user?._id,
      'Alias': user?.alias,
      'Email': user?.contact?.email,
      'Phone': user?.contact?.phone,
      'Status': user?.status,
      'Wallet Balance': user?.wallet,

      'Registration Date': user?.registered
        ? formatDate(user.registered)
        : "-",

      'Last Active': user?.lastActive
        ? formatDate(user.lastActive)
        : "-",

      'Total Sessions': user?.sessions,
      'Total Spent': user?.totalSpent ? user.totalSpent : "-",
    }));

    exportToCSV(exportData, 'users');
  };

  const { data: viewUserData, refetch: refetchViewUserData, isFetching: viewLoading } = useQuery({
    queryKey: ["get-user-by-id", selectedUser?._id],
    queryFn: () => ViewUserApi(selectedUser?._id),
    enabled: false,
  });
  const viewUserDetails = viewUserData?.data?.data;

  useEffect(() => {
    setIsGlobalLoading(viewLoading);
  }, [viewLoading]);

  const { mutate: deleteUser, isPending: deletingUser } = useMutation({
    mutationFn: DeleteUserApi,
    onSuccess: (res) => {
      toast.success("User deleted successfully");
      refetch();
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete user");
      setShowDeleteDialog(false);
    }
  });

  const { mutate } = useMutation({
    mutationFn: (data: { id: string; body: UserUpdateFormData }) => UpdateUserApi(data.id, data.body),
    onSuccess: (res: any) => {
      toast.success(res.data.message);
      refetch();
      setShowUpdateUserDialog(false);
      resetForm()
    },
    onError: (err: any) => {
      toast.error(err.response.data.message);
      setShowUpdateUserDialog(false)
      resetForm()
    },
  });

  const filteredUsers = UserData?.filter(user => {
    const matchesSearch =
      user.alias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.contact?.phone?.includes(searchQuery);

    const matchesStatus = filterStatus ? user.status === filterStatus : true;
    const matchesRole = filterRole ? user.role === filterRole : true;

    return matchesSearch && matchesStatus && matchesRole;
  }) || [];

  const formik = useFormik<UserUpdateFormData>({
    enableReinitialize: true,
    initialValues: {
      username: viewUserDetails?.alias || "",
      email: viewUserDetails?.contact?.email || "",
      phoneNumber: viewUserDetails?.contact?.phone?.split(" ")[1] || "",
      cCode: viewUserDetails?.contact?.phone?.split(" ")[0] || "",
      role: viewUserDetails?.role || "",
      status: viewUserDetails?.status || "",
    },
    validationSchema: UserSchema,
    onSubmit: (values: UserUpdateFormData) => {
      mutate({ id: selectedUser._id, body: values });
    },
  });

  const { handleSubmit, handleChange, values, setFieldValue, errors, setFieldTouched, touched, resetForm } = formik;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>User Management</h1>
          <p className="text-gray-500 mt-1">Manage and monitor all registered users</p>
        </div>
        <div className='flex align-items-center gap-3'>
          <Button className="cursor-pointer" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users ({filteredUsers?.length})</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <DropdownMenuTrigger>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" /> Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterStatus(null)}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('active')}>Active</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>Inactive</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('blocked')}>Blocked</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('pending')}>Pending</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Role</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setFilterRole(null)}>All</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('superAdmin')}>Super Admin</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('support')}>Support</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('finance')}>Finance</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('compliance')}>Compliance</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('user')}>User</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterRole('listener')}>Listener</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Alias</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isFetching ? (
                <TableRow>
                  <TableCell colSpan={9} style={{ paddingTop: "20px", paddingBottom: "20px" }} className="text-center">
                    <i className="fa fa-spinner fa-spin fa-3x" style={{ color: "rgba(21,93,252,1)" }}></i>
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} style={{ paddingTop: "20px", paddingBottom: "20px", fontSize: "16px" }} className="text-center text-gray-500 font-semibold">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user: any, i: number) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-mono text-xs">{user?.userId}</TableCell>
                    <TableCell>{user?.alias || "-"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{user?.contact?.email || "-"}</div>
                        <div className="text-gray-500">{user?.contact?.phone || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user?.status)}>
                        {user?.status || "-"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(user?.wallet)}</TableCell>
                    <TableCell>{formatDate(user?.registered)}</TableCell>
                    <TableCell>
                      {user?.lastActive ? formatRelativeTime(user.lastActive) : "-"}
                    </TableCell>
                    <TableCell>{user?.sessions || "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowViewDialog(true);
                              setIsGlobalLoading(true)
                              setTimeout(() => {
                                refetchViewUserData();
                              }, 0);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setIsGlobalLoading(true)
                              setSelectedUser(user),
                                setShowUpdateUserDialog(true),
                                setTimeout(() => {
                                  refetchViewUserData();
                                }, 0);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Update User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBlockUser(user?._id)}>
                            <Ban className="mr-2 h-4 w-4" />
                            {user?.status === 'blocked' ? 'Unblock' : 'Block'} User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setShowWalletDialog(true);
                          }}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Adjust Wallet
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Soft Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="my-2">
          {paginationData?.totalPages > 1 && (
            <div className="flex justify-center mt-3 mb-3">
              <ReactPaginate
                previousLabel={<i className="fa fa-angle-left"></i>}
                nextLabel={<i className="fa fa-angle-right"></i>}
                breakLabel={"..."}
                pageCount={paginationData?.totalPages}
                marginPagesDisplayed={1}
                pageRangeDisplayed={2}
                forcePage={page - 1}
                onPageChange={(p) => setPage(p.selected + 1)}
                containerClassName="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full shadow"
                pageClassName="rounded-full"
                pageLinkClassName="px-3 py-1 cursor-pointer rounded-full text-sm font-medium text-black bg-transparent hover:bg-white transition"
                previousClassName="rounded-full"
                previousLinkClassName="cursor-pointer px-3 py-1 text-black hover:bg-white rounded-full transition"
                nextClassName="rounded-full"
                nextLinkClassName="cursor-pointer px-3 py-1 text-black hover:bg-white rounded-full transition"
                breakClassName="rounded-full"
                breakLinkClassName="px-3 py-1 text-black"
                activeClassName="bg-white   shadow-lg"
                activeLinkClassName="text-blue-600 font-bold"
              />
            </div>
          )}
        </div>
      </Card>

      <Dialog open={showUpdateUserDialog} onOpenChange={setShowUpdateUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>
              Update details for {viewUserDetails?.alias || "-"}
            </DialogDescription>
          </DialogHeader>

          {viewUserDetails && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Alias */}
                <div>
                  <Label>Alias</Label>
                  <input
                    type="text"
                    name="username"
                    value={values.username}
                    onChange={handleChange}
                    placeholder='Enter a alias'
                    onBlur={() => setFieldTouched('username', true)}
                    className="mt-1 w-full border rounded-md p-2"
                    style={{
                      borderColor: errors.username && touched.username ? 'red' : '#D1D5DB', // red or gray
                    }}
                  />
                  {errors.username && touched?.username && (
                    <p className="text-red-600 text-sm mt-1">{errors.username}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    name="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={() => setFieldTouched('email', true)}
                    placeholder='Enter a email'
                    className={`mt-1 w-full border rounded-md p-2`}
                    style={{
                      borderColor: errors.email && touched.email ? 'red' : '#D1D5DB', // red or gray
                    }}
                  />
                  {errors.email && touched.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    {/* Country Code */}
                    <input
                      type="text"
                      name="cCode"
                      value={values.cCode}
                      onChange={handleChange}
                      onBlur={() => setFieldTouched('cCode', true)}
                      className="mt-1 border rounded-md p-2"
                      placeholder="+91"
                      style={{
                        borderColor: errors.cCode && touched.cCode ? 'red' : '#D1D5DB',
                        width: "50px"
                      }}
                    />
                    {/* Phone Number */}
                    <input
                      type="text"
                      name="phoneNumber"
                      value={values.phoneNumber}
                      onChange={handleChange}
                      onBlur={() => setFieldTouched('phoneNumber', true)}
                      className="mt-1 w-full border rounded-md p-2"
                      placeholder="Enter a phone number"
                      style={{
                        borderColor: errors.phoneNumber && touched.phoneNumber ? 'red' : '#D1D5DB',
                      }}
                    />
                  </div>
                  {errors.cCode && touched.cCode && (
                    <p className="text-red-600 text-sm mt-1">{errors.cCode}</p>
                  )}
                  {errors.phoneNumber && touched.phoneNumber && (
                    <p className="text-red-600 text-sm mt-1">{errors.phoneNumber}</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <Label>Role</Label>
                  <select
                    name="role"
                    value={values.role}
                    onChange={handleChange}
                    onBlur={() => setFieldTouched('role', true)}
                    className="mt-1 w-full border rounded-md p-2"
                  >
                    <option value="superAdmin">Super Admin</option>
                    <option value="support">Support</option>
                    <option value="finance">Finance</option>
                    <option value="compliance">Compliance</option>
                    <option value="user">User</option>
                    <option value="listener">Listener</option>
                  </select>
                  {errors.role && touched.role && (
                    <p className="text-red-600 text-sm mt-1">{errors.role}</p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <select
                    name="status"
                    value={values.status}
                    onChange={handleChange}
                    onBlur={() => setFieldTouched('status', true)}
                    className="mt-1 w-full border rounded-md p-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                    <option value="pending">Pending</option>
                  </select>
                  {errors.status && touched.status && (
                    <p className="text-red-600 text-sm mt-1">{errors.status}</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowUpdateUserDialog(false), resetForm() }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Detailed information about {viewUserDetails?.alias || "-"}
            </DialogDescription>
          </DialogHeader>

          {viewUserDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* USER ID */}
                <div>
                  <Label>User ID</Label>
                  <p className="text-sm font-mono mt-1">{viewUserDetails?.userId || "-"}</p>
                </div>

                {/* STATUS */}
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(viewUserDetails?.status)}>
                      {viewUserDetails?.status || "-"}
                    </Badge>
                  </div>
                </div>

                {/* USERNAME / ALIAS */}
                <div>
                  <Label>Alias</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.alias || "-"}</p>
                </div>

                {/* EMAIL */}
                <div>
                  <Label>Email</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.contact?.email || "-"}</p>
                </div>

                {/* PHONE */}
                <div>
                  <Label>Phone</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.contact?.phone || "-"}</p>
                </div>

                {/* ROLE */}
                <div>
                  <Label>Role</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.role || "-"}</p>
                </div>

                {/* WALLET */}
                <div>
                  <Label>Wallet Balance</Label>
                  <p className="text-sm mt-1">{formatCurrency(viewUserDetails?.wallet) || "-"}</p>
                </div>

                {/* REGISTRATION DATE */}
                <div>
                  <Label>Registration Date</Label>
                  <p className="text-sm mt-1">
                    {formatDate(viewUserDetails?.registered) || "-"}
                  </p>
                </div>

                {/* LAST ACTIVE */}
                <div>
                  <Label>Last Active</Label>
                  <p className="text-sm mt-1">
                    {viewUserDetails?.lastActive
                      ? formatRelativeTime(viewUserDetails.lastActive)
                      : "-"}
                  </p>
                </div>

                {/* Total Sessions */}
                <div>
                  <Label>Total Sessions</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.sessions || 0}</p>
                </div>

                {/* Tickets */}
                <div>
                  <Label>Total Tickets</Label>
                  <p className="text-sm mt-1">{viewUserDetails?.tickets || 0}</p>
                </div>

              </div>

              {/* SESSION DETAILS SECTION */}
              {viewUserDetails.sessionDetails?.length > 0 && (
                <div>
                  <Label className="font-semibold">Session Details</Label>
                  <div className="mt-2 space-y-2">
                    {viewUserDetails.sessionDetails.map((s) => (
                      <div
                        key={s._id}
                        className="border p-3 rounded-lg bg-gray-50 text-sm"
                      >
                        <p><strong>Type:</strong> {s.type}</p>
                        <p><strong>Status:</strong> {s.status}</p>
                        <p><strong>Listener:</strong> {s.listener}</p>
                        <p><strong>Start Time:</strong> {formatDate(s.startTime)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Adjustment Dialog */}
      <Dialog open={showWalletDialog} onOpenChange={setShowWalletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Wallet Balance</DialogTitle>
            <DialogDescription>
              Manually credit or debit wallet for {selectedUser?.alias}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Balance</Label>
              <p className="text-sm mt-1">{selectedUser && formatCurrency(selectedUser.wallet)}</p>
            </div>
            <div>
              <Label>Action</Label>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant={walletAction === 'credit' ? 'default' : 'outline'}
                  onClick={() => setWalletAction('credit')}
                  className="flex-1"
                >
                  Credit
                </Button>
                <Button
                  variant={walletAction === 'debit' ? 'default' : 'outline'}
                  onClick={() => setWalletAction('debit')}
                  className="flex-1"
                >
                  Debit
                </Button>
              </div>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                className='mt-2'
                type="number"
                placeholder="Enter amount"
                value={walletAmount}
                onChange={(e) => setWalletAmount(e.target.value)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWalletDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleWalletAdjust}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedUser?.alias}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-red-600">
              ⚠️ This will permanently remove this user.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletingUser}
              onClick={() => {
                deleteUser(selectedUser?._id);
              }}
              className="cursor-pointer"
            >
              {deletingUser ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
