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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Search, Video, MessageSquare, Phone, Square, RotateCcw, Download, Loader2, MoreVertical, CheckCircle, XCircle, Ban, Eye, Edit, Trash2, Section } from 'lucide-react';
import { mockSessions } from '../../lib/mockData';
import { formatCurrency, formatDate, formatDateTime, formatDateTimeLocal, getStatusColor } from '../../lib/utils';
import { toast } from 'sonner';
import type { Session } from '../../lib/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreateSessionsApi, DeleteSessionsApi, GetAllListenerApi, GetAllSessionsApi, GetAllUserApi, UpdateSessionApi, ViewSessionsApi } from '../../api';
import ReactPaginate from 'react-paginate';
import { useFormik } from 'formik';
import { CreateSessionDataType } from '../../types';
import { SessionSchema } from '../../validation';
import { Label } from '../ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useGlobalLoader } from '../../store';
import Select, { components } from "react-select";

export function SessionManagement() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const setIsGlobalLoading = useGlobalLoader((state) => state.setIsLoading);
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false)
  const [sessions, setSessions] = useState(mockSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [sessionData, setSessionData] = useState([]);
  const [page, setPage] = useState<number>(1);
  const [paginationData, setPaginationData] = useState<{
    totalSessions: number;
    totalPages: number;
    currentPage: number;
  }>({
    totalSessions: 0,
    totalPages: 0,
    currentPage: 1,
  });
  const completedCount = (sessionData ?? []).filter(s => s.status === "completed").length;
  const cancelledCount = (sessionData ?? []).filter(s => s.status === "cancelled").length;
  const ongoingCount = (sessionData ?? []).filter(s => s.status === "ongoing").length;
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allListner, setAllListner] = useState<any[]>([]);
  const [userpage, setUserPage] = useState(1);
  const [listnerPage, setListnerPage] = useState(1);
  const [showUpdateSessionDialog, setShowUpdateSessionDialog] = useState<boolean>(false);

  const { data: SessionApiData, refetch } = useQuery({
    queryKey: ['get-session-api', page],
    queryFn: GetAllSessionsApi,
    enabled: false,
  });

  useEffect(() => {
    refetch();
  }, [])

  useEffect(() => {
    refetch();
  }, [page])

  useEffect(() => {
    if (SessionApiData) {
      if (SessionApiData?.data?.pagination < page) {
        setPage(1);
      }
    }
    setSessionData(SessionApiData?.data?.data)
    setPaginationData(SessionApiData?.data?.pagination)
  }, [SessionApiData])

  const filteredSessions = (sessionData ?? []).filter(session =>
    session?.user?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session?.listener?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session?.sessionId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForceEnd = (sessionId: string) => {
    setSessions(sessions.map(s =>
      s._id === sessionId ? { ...s, status: 'completed', endTime: new Date().toISOString() } : s
    ));
    toast.success('Session Ended', {
      description: 'Session has been force ended'
    });
  };

  const handleRefund = () => {
    if (!selectedSession) return;

    setSessions(sessions.map(s =>
      s._id === selectedSession._id ? { ...s, paymentStatus: 'refunded' } : s
    ));

    toast.success('Refund Issued', {
      description: `Refund of ${formatCurrency(selectedSession.amount)} has been processed`
    });

    setShowRefundDialog(false);
  };

  const handleDownloadReport = (session: Session) => {
    toast.success('Report Generated', {
      description: `Session report for ${session._id} is being downloaded`
    });
    // In production, this would generate and download a PDF report
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Phone className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return null;
    }
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
    label: user?.alias || user?.username,
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

  const { data: ListenerApiData, isFetching } = useQuery({
    queryKey: ['get-listener-api', listnerPage],
    queryFn: GetAllListenerApi,
    enabled: true,
  });

  useEffect(() => {
    if (ListenerApiData?.data?.listeners.length) {
      setAllListner((prev) => {
        const newListner = ListenerApiData.data.listeners.filter(
          (u: any) => !prev.some((p) => p._id === u._id)
        );
        return [...prev, ...newListner];
      });
    }
  }, [ListenerApiData]);

  const listnerOptions = allListner.map((items: any) => ({
    value: items._id,
    label: items?.userId?.username,
  }));

  const finalListnerOptions = [
    ...listnerOptions,
    { value: "__load_more__", label: "Load More..." },
  ];

  const CustomListnerOption = (props: any) => {
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

  const { data: viewSessionData, refetch: refetchViewSessionData, isFetching: viewLoading } = useQuery({
    queryKey: ["get-listner-by-id", selectedSession?._id],
    queryFn: () => ViewSessionsApi(selectedSession?._id),
    enabled: false,
  });

  useEffect(() => {
    setIsGlobalLoading(viewLoading);
  }, [viewLoading]);

  const ViewSessionDetails = viewSessionData?.data?.data;

  const { mutate: deleteSession, isPending: deletingSession } = useMutation({
    mutationFn: DeleteSessionsApi,
    onSuccess: (res) => {
      toast.success(res?.data?.message || "Session deleted successfully");
      refetch();
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to delete session");
      setShowDeleteDialog(false);
    }
  });

  const { mutate } = useMutation({
    mutationFn: CreateSessionsApi,
    onSuccess: (res: any) => {
      toast.success(res.data.message || "Sessions created successfully");
      refetch();
      setShowCreateDialog(false);
      resetCreateForm()
    },
    onError: (err: any) => {
      toast.error(err.response.data.message || "Failed to sessions created");
      setShowCreateDialog(false)
      resetCreateForm()
    },
  });

  const CreateFormik = useFormik<CreateSessionDataType>({
    initialValues: {
      sessionId: "",
      user: "",
      listener: "",
      type: "video",
      startTime: "",
      durationInMinutes: null,
      status: "pending",
      paymentStatus: "pending",
      amount: 0,
    },
    validationSchema: SessionSchema,
    onSubmit: (values: CreateSessionDataType) => {
      mutate(values);
    }
  });

  const { handleSubmit: handleCreateSubmit, handleChange: handleCreateChange, values: createValues, setFieldValue: setCreateFieldValue, errors: createErrors, setFieldTouched: setCreateFieldTouched, touched: createTouched, resetForm: resetCreateForm, isSubmitting: isCreateSubmitting
  } = CreateFormik;

  const { mutate: UpdateSession } = useMutation({
    mutationFn: (data: { id: string; body: CreateSessionDataType }) => UpdateSessionApi(data.id, data.body),
    onSuccess: (res: any) => {
      toast.success(res.data.message);
      refetch();
      setShowUpdateSessionDialog(false);
      resetUpdateForm()
    },
    onError: (err: any) => {
      toast.error(err.response.data.message);
      setShowUpdateSessionDialog(false)
      resetUpdateForm()
    },
  });

  const updateFormik = useFormik<CreateSessionDataType>({
    enableReinitialize: true,
    initialValues: {
      sessionId: ViewSessionDetails?.sessionId || "",
      user: ViewSessionDetails?.user || "",
      listener: ViewSessionDetails?.listener || "",
      type: ViewSessionDetails?.type || "video",
      startTime: formatDateTimeLocal(ViewSessionDetails?.startTime) || "",
      durationInMinutes: ViewSessionDetails?.duration.replace(" min", "") || "",
      status: ViewSessionDetails?.status || "pending",
      paymentStatus: ViewSessionDetails?.payment || "pending",
      amount: Number(ViewSessionDetails?.payment) || 0,
    },
    validationSchema: SessionSchema,
    onSubmit: (values: CreateSessionDataType) => {
      UpdateSession({
        id: selectedSession?._id,
        body: values,
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

  return (
    <div className="space-y-6">
      <div className='flex justify-between items-center'>
        <div>
          <h1>Session Management</h1>
          <p className="text-gray-500 mt-1">Monitor and manage all user-listener sessions</p>
        </div>
        <div>
          <Button className={"cursor-pointer"} onClick={() => setShowCreateDialog(true)}>
            Create Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Sessions</p>
                <h3 className="mt-2">{paginationData?.totalSessions ?? 0}</h3>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ongoing</p>
                <h3 className="mt-2">{ongoingCount > 0 ? ongoingCount : "0"}</h3>
              </div>
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <h3 className="mt-2">{completedCount > 0 ? completedCount : "0"}</h3>
              </div>
              <Badge className="bg-green-100 text-green-800">Done</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Cancelled</p>
                <h3 className="mt-2">{cancelledCount > 0 ? cancelledCount : "0"}</h3>
              </div>
              <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Sessions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sessions..."
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
                <TableHead>Session ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Listener</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session._id}>
                  <TableCell className="font-mono text-xs">{session?.sessionId || "-"}</TableCell>
                  <TableCell>{session?.user || "-"}</TableCell>
                  <TableCell>{session?.listener || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getSessionIcon(session?.type)}
                      <span className="capitalize">{session?.type || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDateTime(session?.startTime || "-")}</TableCell>
                  <TableCell>{session?.duration || "-"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(session?.status)}>
                      {session?.status || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(session?.payment)}>
                      {session?.payment || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(session?.amount || "-")}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {session.status === 'ongoing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleForceEnd(session.id)}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          End
                        </Button>
                      )}
                      {session?.payment === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSession(session);
                            setShowRefundDialog(true);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Refund
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport(session)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Report
                      </Button>
                    </div>
                  </TableCell>
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
                            setSelectedSession(session);
                            setShowViewDialog(true);
                            setIsGlobalLoading(true)
                            setTimeout(() => {
                              refetchViewSessionData();
                            }, 0);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setIsGlobalLoading(true)
                            setSelectedSession(session);
                            setShowUpdateSessionDialog(true)
                            setTimeout(() => {
                              refetchViewSessionData();
                            }, 0);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Update Session
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedSession(session);
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="my-2">
          {paginationData?.totalPages > 1 ? (
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
          ) : null}
        </div>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this session?
            </DialogDescription>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Session ID:</span>
                  <span className="text-sm font-mono">{selectedSession._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">User:</span>
                  <span className="text-sm">{selectedSession.userAlias}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Listener:</span>
                  <span className="text-sm">{selectedSession.listenerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount:</span>
                  <span className="text-sm">{formatCurrency(selectedSession.amount)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This action will refund {formatCurrency(selectedSession.amount)} to the user's wallet
                and deduct the amount from the listener's pending earnings.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} variant="destructive">
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl">

          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Review complete information about this session.
            </DialogDescription>
          </DialogHeader>

          {ViewSessionDetails && (
            <div className="space-y-6">

              <div className="grid grid-cols-2 gap-4">

                {/* Session ID */}
                <div>
                  <Label>Session ID</Label>
                  <p className="text-sm mt-1 font-medium">{ViewSessionDetails?.sessionId || "-"}</p>
                </div>

                {/* User */}
                <div>
                  <Label>User</Label>
                  <p className="text-sm mt-1">{ViewSessionDetails?.user || "N/A"}</p>
                </div>

                {/* Listener */}
                <div>
                  <Label>Listener</Label>
                  <p className="text-sm mt-1">{ViewSessionDetails?.listener || "N/A"}</p>
                </div>

                {/* Type */}
                <div>
                  <Label>Session Type</Label>
                  <p className="text-sm mt-1 capitalize">
                    {ViewSessionDetails?.type || "-"}
                  </p>
                </div>

                {/* Start Time */}
                <div>
                  <Label>Start Time</Label>
                  <p className="text-sm mt-1">
                    {formatDateTime(ViewSessionDetails?.startTime || "-")}
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <Label>Duration</Label>
                  <p className="text-sm mt-1">
                    {ViewSessionDetails?.duration || "-"}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(ViewSessionDetails?.status)} >
                    {ViewSessionDetails?.status}
                  </Badge>
                </div>

                {/* Payment */}
                <div>
                  <Label>Payment Status</Label>
                  <Badge className={getStatusColor(ViewSessionDetails?.payment)}>
                    {ViewSessionDetails?.payment}
                  </Badge>
                </div>

                {/* Amount */}
                <div>
                  <Label>Amount</Label>
                  <p className="text-sm mt-1">${ViewSessionDetails?.amount || 0}</p>
                </div>

              </div>

            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* ===========Create-Listner========= */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>
              Create A New Session
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* SectionId */}
              <div>
                <Label>Session Id</Label>
                <input
                  type="string"
                  name="sessionId"
                  value={createValues.sessionId}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("sessionId", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a session id"
                  style={{
                    borderColor: createErrors.sessionId && createTouched.sessionId ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.sessionId && createTouched.sessionId && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.sessionId}</p>
                )}
              </div>

              {/* User */}
              <div>
                <Label>User</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomOption }}
                    options={finalOptions}
                    value={userOptions.find(opt => opt.value === createValues.user) || null}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setCreateFieldValue("user", selected.value);
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
                {createErrors.user && createTouched.user && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.user}</p>
                )}
              </div>

              {/* Listener */}
              <div>
                <Label>Listener</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomListnerOption }}
                    options={finalListnerOptions}
                    value={listnerOptions.find(opt => opt.value === createValues.listener) || null}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setCreateFieldValue("listener", selected.value);
                      }
                    }}
                    {...({ onLoadMore: () => setListnerPage(prev => prev + 1) } as any)}
                    placeholder="Select a listner"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                      }),
                    }}
                  />
                </div>
                {createErrors.listener && createTouched.listener && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.listener}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <Label>Type</Label>
                <select
                  name="type"
                  value={createValues.type}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.type && createTouched.type ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="video">Video</option>
                  <option value="chat">Chat</option>
                  <option value="audio">Audio</option>
                </select>
                {createErrors.type && createTouched.type && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.type}</p>
                )}
              </div>

              {/* Start-time */}
              <div>
                <Label>Start Time</Label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={createValues.startTime}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("startTime", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.startTime && createTouched.startTime ? 'red' : '#D1D5DB',
                  }}
                />

                {createErrors.startTime && createTouched.startTime && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.startTime}</p>
                )}
              </div>

              {/* Duration In Minutes */}
              <div>
                <Label>Duration Minutes</Label>
                <input
                  type="number"
                  name="durationInMinutes"
                  value={createValues.durationInMinutes}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("durationInMinutes", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.durationInMinutes && createTouched.durationInMinutes ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.durationInMinutes && createTouched.durationInMinutes && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.durationInMinutes}</p>
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
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {createErrors.status && createTouched.status && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.status}</p>
                )}
              </div>

              {/* Payment Status */}
              <div>
                <Label>Payment Status</Label>
                <select
                  name="paymentStatus"
                  value={createValues.paymentStatus}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.paymentStatus && createTouched.paymentStatus ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
                {createErrors.paymentStatus && createTouched.paymentStatus && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.paymentStatus}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <Label>Amount</Label>
                <input
                  type="number"
                  name="amount"
                  value={createValues.amount}
                  onChange={handleCreateChange}
                  onBlur={() => setCreateFieldTouched("amount", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: createErrors.amount && createTouched.amount ? 'red' : '#D1D5DB',
                  }}
                />
                {createErrors.amount && createTouched.amount && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.amount}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Session?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this data
              <span className="font-semibold">{selectedSession?._id}</span>?
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
              disabled={deletingSession}
              onClick={() => {
                deleteSession(selectedSession?._id);
              }}
              className="cursor-pointer"
            >
              {deletingSession ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===========Update-Listner========= */}
      <Dialog open={showUpdateSessionDialog} onOpenChange={setShowUpdateSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Session</DialogTitle>
            <DialogDescription>
              Update a session
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* SectionId */}
              <div>
                <Label>Session Id</Label>
                <input
                  type="string"
                  name="sessionId"
                  value={updateValues.sessionId}
                  onChange={handleUpdateChange}
                  onBlur={() => setUpdateFieldTouched("sessionId", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  placeholder="Enter a session id"
                  style={{
                    borderColor: updateErrors.sessionId && updateTouched.sessionId ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.sessionId && updateTouched.sessionId && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.sessionId}</p>
                )}
              </div>

              {/* User */}
              <div>
                <Label>User</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomOption }}
                    options={finalOptions}
                    value={userOptions.find(opt => opt.value === updateValues.user) || null}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setUpdateFieldValue("user", selected.value);
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
                {updateErrors.user && updateTouched.user && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.user}</p>
                )}
              </div>

              {/* Listener */}
              <div>
                <Label>Listener</Label>
                <div className='mt-1'>
                  <Select
                    components={{ Option: CustomListnerOption }}
                    options={finalListnerOptions}
                    value={listnerOptions.find(opt => opt.value === updateValues.listener) || null}
                    onChange={(selected: any) => {
                      if (selected.value !== "__load_more__") {
                        setUpdateFieldValue("listener", selected.value);
                      }
                    }}
                    {...({ onLoadMore: () => setListnerPage(prev => prev + 1) } as any)}
                    placeholder="Select a listner"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderRadius: "8px",
                      }),
                    }}
                  />
                </div>
                {updateErrors.listener && updateTouched.listener && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.listener}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <Label>Type</Label>
                <select
                  name="type"
                  value={updateValues.type}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.type && updateTouched.type ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="video">Video</option>
                  <option value="chat">Chat</option>
                  <option value="audio">Audio</option>
                </select>
                {updateErrors.type && updateTouched.type && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.type}</p>
                )}
              </div>

              {/* Start-time */}
              <div>
                <Label>Start Time</Label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={updateValues.startTime}
                  onChange={handleCreateChange}
                  onBlur={() => setUpdateFieldTouched("startTime", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.startTime && updateTouched.startTime ? 'red' : '#D1D5DB',
                  }}
                />

                {updateErrors.startTime && updateTouched.startTime && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.startTime}</p>
                )}
              </div>

              {/* Duration In Minutes */}
              <div>
                <Label>Duration Minutes</Label>
                <input
                  type="number"
                  name="durationInMinutes"
                  value={updateValues.durationInMinutes}
                  onChange={handleCreateChange}
                  onBlur={() => setUpdateFieldTouched("durationInMinutes", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.durationInMinutes && updateTouched.durationInMinutes ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.durationInMinutes && updateTouched.durationInMinutes && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.durationInMinutes}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label>Status</Label>
                <select
                  name="status"
                  value={updateValues.status}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.status && updateTouched.status ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {updateErrors.status && updateTouched.status && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.status}</p>
                )}
              </div>

              {/* Payment Status */}
              <div>
                <Label>Payment Status</Label>
                <select
                  name="paymentStatus"
                  value={updateValues.paymentStatus}
                  onChange={handleCreateChange}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.paymentStatus && updateTouched.paymentStatus ? 'red' : '#D1D5DB',
                  }}
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
                {updateErrors.paymentStatus && updateTouched.paymentStatus && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.paymentStatus}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <Label>Amount</Label>
                <input
                  type="number"
                  name="amount"
                  value={updateValues.amount}
                  onChange={handleCreateChange}
                  onBlur={() => setUpdateFieldTouched("amount", true)}
                  className="mt-1 w-full border rounded-md p-2"
                  style={{
                    borderColor: updateErrors.amount && updateTouched.amount ? 'red' : '#D1D5DB',
                  }}
                />
                {updateErrors.amount && updateTouched.amount && (
                  <p className="text-red-600 text-sm mt-1">{updateErrors.amount}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUpdateSessionDialog(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreateSubmitting}>
                {isCreateSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  );
}
