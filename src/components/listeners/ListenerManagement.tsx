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
import { Search, MoreVertical, CheckCircle, XCircle, Ban, DollarSign, Star, Loader2, Edit, Eye, Trash2 } from 'lucide-react';
import { mockListeners } from '../../lib/mockData';
import { formatCurrency, formatDate, formatRelativeTime, getStatusColor } from '../../lib/utils';
import { toast } from 'sonner';
import type { Listener } from '../../lib/types';
import { CreateListenerApi, DeleteListnerApi, GetAllListenerApi, GetAllUserApi, UpdateListenerApi, ViewListenerApi } from '../../api';
import { useMutation, useQuery } from '@tanstack/react-query';
import ReactPaginate from 'react-paginate';
import { useFormik } from 'formik';
import { CreateListnerDataType } from '../../types';
import { ListnerSchema } from '../../validation';
import Select, { components } from "react-select";
import { useGlobalLoader } from '../../store';

export function ListenerManagement() {
  const [listeners, setListeners] = useState(mockListeners);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListener, setSelectedListener] = useState<Listener | null>(null);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [newCommission, setNewCommission] = useState('');
  const [page, setPage] = useState<number>(1);
  const [listenerData, setListenerData] = useState([]);
  const [showCreateListnerDialog, setShowCreateListnerDialog] = useState<boolean>(false);
  const [showUpdateListnerDialog, setShowUpdateListnerDialog] = useState<boolean>(false);
  const setIsGlobalLoading = useGlobalLoader((state) => state.setIsLoading);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [userpage, setUserPage] = useState(1);

  const expertiseOptions = [
    { value: "motivation", label: "Motivation" },
    { value: "relationship", label: "Relationship" },
    { value: "stress", label: "Stress" },
    { value: "anxiety", label: "Anxiety" },
    { value: "career", label: "Career" },
    { value: "emotionalSupport", label: "Emotional Support" }
  ];

  const { data: ListenerApiData, refetch, isFetching } = useQuery({
    queryKey: ['get-listener-api', page],
    queryFn: GetAllListenerApi,
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, [])

  useEffect(() => {
    refetch();
  }, [page])

  useEffect(() => {
    if (ListenerApiData) {
      if (ListenerApiData?.data?.pagination < page) {
        setPage(1);
      }
    }
    setListenerData(ListenerApiData?.data?.listeners)
  }, [ListenerApiData])

  const filteredListeners = (listenerData ?? []).filter(listener => {
    const query = searchQuery.toLowerCase();

    return (
      listener.userId?.username?.toLowerCase().includes(query) ||
      listener.userId?.email?.toLowerCase().includes(query) ||
      listener.userId?.phoneNumber?.toLowerCase().includes(query) ||
      listener.expertise?.some(tag =>
        tag.toLowerCase().includes(query)
      )
    );
  });

  const handleApprove = (listenerId: string) => {
    setListeners(listeners.map(l =>
      l._id === listenerId ? { ...l, verificationStatus: 'approved' } : l
    ));
    toast.success('Listener Approved', {
      description: 'Listener verification has been approved'
    });
  };

  const handleReject = (listenerId: string) => {
    setListeners(listeners.map(l =>
      l._id === listenerId ? { ...l, verificationStatus: 'rejected' } : l
    ));
    toast.success('Listener Rejected', {
      description: 'Listener verification has been rejected'
    });
  };

  const handleSuspend = (listenerId: string) => {
    const listener = listeners.find(l => l._id === listenerId);
    setListeners(listeners.map(l =>
      l._id === listenerId
        ? { ...l, verificationStatus: l.verificationStatus === 'suspended' ? 'approved' : 'suspended' }
        : l
    ));
    toast.success(
      listener?.verificationStatus === 'suspended' ? 'Listener Reactivated' : 'Listener Suspended',
      {
        description: listener?.verificationStatus === 'suspended'
          ? 'Listener has been reactivated'
          : 'Listener has been suspended'
      }
    );
  };

  const handleCommissionUpdate = () => {
    if (!selectedListener || !newCommission) return;

    setListeners(listeners.map(l =>
      l._id === selectedListener._id ? { ...l, commission: parseFloat(newCommission) } : l
    ));

    toast.success('Commission Updated', {
      description: `Commission rate set to ${newCommission}% for ${selectedListener.name}`
    });

    setShowCommissionDialog(false);
    setNewCommission('');
  };


  const { data: userData, isLoading } = useQuery({
    queryKey: ["get-user-api", userpage],
    queryFn: GetAllUserApi,
    enabled: true
  });

  useEffect(() => {
    if (userData?.data?.data?.length) {
      setAllUsers((prev) => {
        const newUsers = userData.data.data.filter(
          (u: any) => !prev.some((p) => p._id === u._id)
        );
        return [...prev, ...newUsers];
      });
    }
  }, [userData]);


  const userOptions = allUsers.map((user: any) => ({
    value: user._id,
    label: user.alias || user.username,
  }));

  const finalOptions = [
    ...userOptions,
    { value: "__load_more__", label: "Load More..." },
  ];


  const CustomOption = (props: any) => {
    if (props.data.value === "__load_more__") {
      return (
        <div
          style={{
            padding: "8px",
            textAlign: "center",
            cursor: "pointer",
            background: "#f3f4f6",
          }}
          onClick={() => props.selectProps.onLoadMore()}
        >
          Load More
        </div>
      );
    }

    return <components.Option {...props} />;
  };

  const { mutate: UpdateListner } = useMutation({
    mutationFn: (data: { id: string; body: CreateListnerDataType }) => UpdateListenerApi(data.id, data.body),
    onSuccess: (res: any) => {
      toast.success(res.data.message || "Listner update successfuly");
      refetch();
      setShowUpdateListnerDialog(false);
      resetUpdateForm()
    },
    onError: (err: any) => {
      toast.error(err.response.data.message || "Failed to listner update");
      setShowUpdateListnerDialog(false)
      resetUpdateForm()
    },
  });

  const { mutate } = useMutation({
    mutationFn: CreateListenerApi,
    onSuccess: (res: any) => {
      toast.success(res.data.message || "Listner create successfully");
      refetch();
      setShowCreateListnerDialog(false);
      resetCreateForm()
    },
    onError: (err: any) => {
      toast.error(err.response.data.message || "Failed to listner create");
      setShowCreateListnerDialog(false)
      resetCreateForm()
    },
  });

  const { mutate: deleteListner, isPending: deletingListner } = useMutation({
    mutationFn: DeleteListnerApi,
    onSuccess: (res) => {
      toast.success(res?.data?.message || "Listner deleted successfully");
      refetch();
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete listner");
      setShowDeleteDialog(false);
    }
  });

  const { data: viewListnerData, refetch: refetchViewListnerData, isFetching: viewLoading } = useQuery({
    queryKey: ["get-listner-by-id", selectedListener?._id],
    queryFn: () => ViewListenerApi(selectedListener?._id),
    enabled: false,
  });

  const ViewListnerDetails = viewListnerData?.data;

  console.log(ViewListnerDetails)

  useEffect(() => {
    setIsGlobalLoading(viewLoading);
  }, [viewLoading]);

  const CreateFormik = useFormik<CreateListnerDataType>({
    initialValues: {
      userId: "",
      expertise: [] as string[],
      experience: "",
      rating: null,
      status: "pending",
      earnings: null,
      commission: "",
    },
    validationSchema: ListnerSchema,
    onSubmit: (values: CreateListnerDataType) => {
      mutate({
        ...values,
        experience: `${values.experience} years`,
        commission: `${values.commission}%`,
      });
    }
  });

  const {
    handleSubmit: handleCreateSubmit,
    handleChange: handleCreateChange,
    values: createValues,
    setFieldValue: setCreateFieldValue,
    errors: createErrors,
    setFieldTouched: setCreateFieldTouched,
    touched: createTouched,
    resetForm: resetCreateForm,
    isSubmitting: isCreateSubmitting
  } = CreateFormik;


  const updateFormik = useFormik<CreateListnerDataType>({
    enableReinitialize: true,
    initialValues: {
      userId: ViewListnerDetails?.userId?._id,
      expertise: ViewListnerDetails?.expertise || [],
      experience: ViewListnerDetails?.experience?.replace(" years", "") || "",
      rating: Number(ViewListnerDetails?.rating || null),
      status: ViewListnerDetails?.status || "pending",
      earnings: Number(ViewListnerDetails?.earnings || null),
      commission: ViewListnerDetails?.commission?.replace("%", "") || "",
    },
    validationSchema: ListnerSchema,
    onSubmit: (values: CreateListnerDataType) => {
      UpdateListner({
        id: selectedListener?._id,
        body: {
          ...values,
          experience: `${values.experience} years`,
          commission: `${values.commission}%`,
        },
      });
    }
  });

  const {
    handleSubmit: handleUpdateSubmit,
    handleChange: handleUpdateChange,
    values: updateValues,
    setFieldValue: setUpdateFieldValue,
    errors: updateErrors,
    setFieldTouched: setUpdateFieldTouched,
    touched: updateTouched,
    resetForm: resetUpdateForm,
    isSubmitting: isUpdateSubmitting
  } = updateFormik;

  const selectedUserOption =
    userOptions.find(opt => opt.value === updateValues.userId) ||
    (updateValues.userId
      ? { value: updateValues.userId, label: ViewListnerDetails?.userId?.username || "User" }
      : null);


  return (
    <div className="space-y-6">
      <div className='flex justify-between items-center'>
        <div>
          <h1>Listener Management</h1>
          <p className="text-gray-500 mt-1">Manage listener verifications, profiles, and payouts</p>
        </div>
        <div>
          <Button className={"cursor-pointer"} onClick={() => setShowCreateListnerDialog(true)}>
            Create Listener
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Listeners ({filteredListeners.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search listeners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr no</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Expertise</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Commission</TableHead>
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
              ) : filteredListeners?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} style={{ paddingTop: "20px", paddingBottom: "20px", fontSize: "16px" }} className="text-center text-gray-500 font-semibold">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                filteredListeners.map((listener, i) => (
                  <TableRow key={listener?._id}>
                    <TableCell className="font-mono text-xs">{i + 1 + (page - 1) * 5}</TableCell>
                    <TableCell>
                      <div>
                        <div>{listener?.userId?.username || "-"}</div>
                        <div className="text-xs text-gray-500">{listener?.userId?.email || "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {listener?.expertise?.slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {listener?.expertise?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{listener?.expertiseTags?.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{listener?.experience}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span>{listener?.rating || "0"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(listener?.status)}>
                        {listener?.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(listener?.earnings)}</TableCell>
                    <TableCell>{listener?.commission || "-"}</TableCell>
                    <TableCell>{listener?.sessions || "-"}</TableCell>
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
                          {listener.verificationStatus === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleApprove(listener.id)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReject(listener.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => handleSuspend(listener.id)}>
                            <Ban className="mr-2 h-4 w-4" />
                            {listener.verificationStatus === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedListener(listener);
                            setNewCommission(listener.commission.toString());
                            setShowCommissionDialog(true);
                          }}>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Manage Commission
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedListener(listener);
                              setShowViewDialog(true);
                              setIsGlobalLoading(true)
                              setTimeout(() => {
                                refetchViewListnerData();
                              }, 0);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setIsGlobalLoading(true)
                              setSelectedListener(listener);
                              setShowUpdateListnerDialog(true)
                              setTimeout(() => {
                                refetchViewListnerData();
                              }, 0);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Update Listner
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedListener(listener);
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
          {ListenerApiData?.data?.totalPages > 1 ? (
            <div className="flex justify-center mt-3 mb-3">
              <ReactPaginate
                previousLabel={<i className="fa fa-angle-left"></i>}
                nextLabel={<i className="fa fa-angle-right"></i>}
                breakLabel={"..."}
                pageCount={ListenerApiData?.data?.totalPages}
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
          ) : null}
        </div>
      </Card>

      {/* Commission Dialog */}
      <Dialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Commission Rate</DialogTitle>
            <DialogDescription>
              Set commission rate for {selectedListener?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Commission Rate</Label>
              <p className="text-sm mt-1">{selectedListener?.commission}%</p>
            </div>
            <div>
              <Label>New Commission Rate (%)</Label>
              <Input
                type="number"
                placeholder="Enter percentage"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                step="0.5"
                min="0"
                max="100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommissionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCommissionUpdate}>
              Update Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===========Create-Listner========= */}
      <Dialog open={showCreateListnerDialog} onOpenChange={setShowCreateListnerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Listner</DialogTitle>
            <DialogDescription>
              Create a new listner
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* User */}
              <div>
                <Label>User</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomOption }}
                    options={finalOptions}
                    value={userOptions.find(opt => opt.value === createValues.userId) || null}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setCreateFieldValue("userId", selected.value);
                      }
                    }}
                    {...({ onLoadMore: () => setUserPage(prev => prev + 1) } as any)}
                    placeholder="Select a user"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                      }),
                    }}
                  />
                </div>
                {createErrors.userId && createTouched.userId && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.userId}</p>
                )}
              </div>

              {/* Expertise */}
              <div>
                <Label>Expertise</Label>
                <div className='mt-1'>
                  <Select
                    isMulti
                    options={expertiseOptions}
                    placeholder="Select a expertise"
                    value={expertiseOptions.filter(o =>
                      createValues.expertise.includes(o.value)
                    )}
                    onChange={(sel) =>
                      setCreateFieldValue("expertise", (sel || []).map(s => s.value))
                    }
                    onBlur={() => setCreateFieldTouched("expertise", true)}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                        borderColor: createErrors.expertise && createTouched.expertise ? "red" : "#D1D5DB",
                      }),
                    }}
                  />
                  {createErrors.expertise && createTouched.expertise && (
                    <p className="text-red-600 text-sm mt-1">{createErrors.expertise}</p>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div>
                <Label>Experience</Label>
                <input
                  type="number"
                  name="experience"
                  value={createValues.experience}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("experience", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a experience"
                  style={{
                    borderColor: createErrors.experience && createTouched.experience ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.experience && createTouched.experience && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.experience}</p>
                )}
              </div>

              {/* Rating */}
              <div>
                <Label>Rating</Label>
                <input
                  type="number"
                  name="rating"
                  value={createValues.rating}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("rating", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a rating"
                  style={{
                    borderColor: createErrors.rating && createTouched.rating ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.rating && createTouched.rating && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.rating}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  value={createValues.status}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.status && createTouched.status ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
                {createErrors.status && createTouched.status && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.status}</p>
                )}
              </div>

              {/* Earnings */}
              <div>
                <Label>Earnings</Label>
                <input
                  type="number"
                  name="earnings"
                  value={createValues.earnings}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("earnings", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a earnings"
                  style={{
                    borderColor: createErrors.earnings && createTouched.earnings ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.earnings && createTouched.earnings && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.earnings}</p>
                )}
              </div>

              {/* Commission */}
              <div>
                <Label>Commission</Label>
                <input
                  type="number"
                  name="commission"
                  value={createValues.commission}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("commission", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a commission"
                  style={{
                    borderColor: createErrors.commission && createTouched.commission ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.commission && createTouched.commission && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.commission}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateListnerDialog(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreateSubmitting}>
                {isCreateSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submit...
                  </div>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===========Update-Listner========= */}
      <Dialog open={showUpdateListnerDialog} onOpenChange={setShowUpdateListnerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Listner</DialogTitle>
            <DialogDescription>
              Update the listener information and save the latest details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* User */}
              <div>
                <Label>User</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomOption }}
                    options={finalOptions}
                    value={selectedUserOption}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setUpdateFieldValue("userId", selected.value);
                      }
                    }}
                    {...({ onLoadMore: () => setUserPage(prev => prev + 1) } as any)}
                    placeholder="Select a user"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                      }),
                    }}
                  />
                  {updateErrors.userId && updateTouched.userId && (
                    <p className="text-red-600 text-sm mt-1">{updateErrors.userId}</p>
                  )}
                </div>
              </div>

              {/* Expertise */}
              <div>
                <Label>Expertise</Label>
                <div className='mt-1'>
                  <Select
                    isMulti
                    options={expertiseOptions}
                    value={expertiseOptions.filter(o =>
                      updateValues.expertise.includes(o.value)
                    )}
                    onChange={(sel) =>
                      setUpdateFieldValue("expertise", (sel || []).map(s => s.value))
                    }
                    onBlur={() => setUpdateFieldTouched("expertise", true)}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                        borderColor: updateErrors.expertise && updateTouched.expertise ? "red" : "#D1D5DB",
                      }),
                    }}
                  />
                  {updateErrors.expertise && updateTouched.expertise && (
                    <p className="text-red-600 text-sm mt-1">{updateErrors.expertise}</p>
                  )}
                </div>
              </div>

              {/* Experience */}
              <div>
                <Label>Experience</Label>
                <input
                  type="number"
                  name="experience"
                  value={updateValues.experience}
                  onChange={handleUpdateChange}
                  onBlur={() => setUpdateFieldTouched("experience", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a experience"
                  style={{
                    borderColor: updateErrors.experience && updateTouched.experience ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.experience && updateTouched.experience && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.experience}</p>
                )}
              </div>

              {/* Rating */}
              <div>
                <Label>Rating</Label>
                <input
                  type="number"
                  name="rating"
                  value={updateValues.rating}
                  onChange={handleUpdateChange}
                  onBlur={() => setUpdateFieldTouched("rating", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a rating"
                  style={{
                    borderColor: updateErrors.rating && createTouched.rating ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.rating && updateTouched.rating && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.rating}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  value={updateValues.status}
                  onChange={handleUpdateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.status && updateTouched.status ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
                {updateErrors.status && updateTouched.status && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.status}</p>
                )}
              </div>

              {/* Earnings */}
              <div>
                <Label>Earnings</Label>
                <input
                  type="number"
                  name="earnings"
                  value={updateValues.earnings}
                  onChange={handleUpdateChange}
                  onBlur={() => setUpdateFieldTouched("earnings", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a earnings"
                  style={{
                    borderColor: updateErrors.earnings && updateTouched.earnings ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.earnings && updateTouched.earnings && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.earnings}</p>
                )}
              </div>

              {/* Commission */}
              <div>
                <Label>Commission</Label>
                <input
                  type="number"
                  name="commission"
                  value={updateValues.commission}
                  onChange={handleUpdateChange}
                  onBlur={() => setUpdateFieldTouched("commission", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a commission"
                  style={{
                    borderColor: updateErrors.commission && updateTouched.commission ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.commission && updateTouched.commission && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.commission}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUpdateListnerDialog(false);
                  resetUpdateForm();
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isUpdateSubmitting}>
                {isUpdateSubmitting ? (
                  <div className="flex items-center gap-2">
                    Save...
                  </div>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Listner Details</DialogTitle>
            <DialogDescription>
              Here you can review all information related to this listener.
            </DialogDescription>
          </DialogHeader>

          {viewListnerData && (
            <div className="space-y-6">

              {/* BASIC INFO */}
              <div className="grid grid-cols-2 gap-4">

                {/* USER */}
                <div>
                  <Label>User</Label>
                  <p className="text-sm mt-1 font-medium">
                    {ViewListnerDetails?.userId?._id || "-"}
                  </p>
                </div>

                {/* ROLE */}
                <div>
                  <Label>User Role</Label>
                  <p className="text-sm mt-1">
                    {ViewListnerDetails?.userId?.role || "-"}
                  </p>
                </div>

                {/* STATUS */}
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(ViewListnerDetails?.status)}>
                      {ViewListnerDetails?.status || "-"}
                    </Badge>
                  </div>
                </div>

                {/* RATING */}
                <div>
                  <Label>Rating</Label>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <p className="text-sm">{ViewListnerDetails?.rating ?? "-"}</p>
                  </div>
                </div>

                {/* EXPERIENCE */}
                <div>
                  <Label>Experience</Label>
                  <p className="text-sm mt-1">
                    {ViewListnerDetails?.experience || "-"}
                  </p>
                </div>

                {/* EXPERTISE */}
                <div>
                  <Label>Expertise</Label>
                  <p className="text-sm mt-1 capitalize">
                    {ViewListnerDetails?.expertise?.join(", ") || "-"}
                  </p>
                </div>

                {/* EARNINGS */}
                <div>
                  <Label>Earnings</Label>
                  <p className="text-sm mt-1">
                    ${ViewListnerDetails?.earnings ?? 0}
                  </p>
                </div>

                {/* COMMISSION */}
                <div>
                  <Label>Commission</Label>
                  <p className="text-sm mt-1">
                    {ViewListnerDetails?.commission || "-"}
                  </p>
                </div>

                {/* TOTAL SESSIONS */}
                <div>
                  <Label>Total Sessions</Label>
                  <p className="text-sm mt-1">{ViewListnerDetails?.sessions ?? 0}</p>
                </div>

                {/* CREATED AT */}
                <div>
                  <Label>Created At</Label>
                  <p className="text-sm mt-1">
                    {formatDate(ViewListnerDetails?.createdAt) || "-"}
                  </p>
                </div>

                {/* UPDATED AT */}
                <div>
                  <Label>Updated At</Label>
                  <p className="text-sm mt-1">
                    {formatRelativeTime(ViewListnerDetails?.updatedAt) || "-"}
                  </p>
                </div>

              </div>

              {/* SEPARATOR IF YOU WANT */}
              {/* <Separator className="my-2" /> */}

            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedListener?._id}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-red-600">
              ⚠️ This will permanently remove this data.
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
              disabled={deletingListner}
              onClick={() => {
                deleteListner(selectedListener?._id);
              }}
              className="cursor-pointer"
            >
              {deletingListner ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
