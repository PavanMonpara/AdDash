import type { ReactNode } from 'react';

export interface GlobalLoaderType {
    show: boolean;
    setShow: (v: boolean) => void;
}

export interface useGlobalLoaderType {
    isLoading: boolean;
    setIsLoading: (v: boolean) => void;
}

export interface UserUpdateFormData {
    email: string;
    username: string;
    role: "superAdmin" | "support" | "finance" | "compliance" | "user" | "listener";
    cCode: string;
    phoneNumber: string;
    status: "active" | "inactive" | "blocked" | "pending";
}

export interface CreateListnerDataType {
    userId: string;
    expertise: string[];
    experience: string;
    rating: number;
    status: "approved" | "pending" | "suspended";
    earnings: number;
    commission: string;
}

export interface CreateSessionDataType {
    sessionId: string,
    user: string,
    listener: string,
    type: "video" | "chat" | "audio" | "",
    startTime: string,
    durationInMinutes: number,
    status: "completed" | "ongoing" | "cancelled" | "pending";
    paymentStatus: "completed" | "pending" | "refunded";
    amount: number;
}

export interface PermissionItem {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    export?: boolean;
    endSession?: boolean;
    viewMessages?: boolean;
    flagContent?: boolean;
    processRefund?: boolean;
    approveWithdrawal?: boolean;
    manualAdjustment?: boolean;
    assignTickets?: boolean;
    closeTickets?: boolean;
    sendPush?: boolean;
    sendEmail?: boolean;
    accessFinancial?: boolean;
    modifyRazorpay?: boolean;
    modifyCommission?: boolean;
}

export interface PermissionsType {
    dashboard?: PermissionItem;
    userManagement?: PermissionItem;
    listenerManagement?: PermissionItem;
    sessionManagement?: PermissionItem;
    compliance?: PermissionItem;
    walletPayments?: PermissionItem;
    supportTicketing?: PermissionItem;
    notifications?: PermissionItem;
    reports?: PermissionItem;
    settings?: PermissionItem;
    adminManagement?: PermissionItem;
    rolesPermissions?: PermissionItem;
    systemHealth?: PermissionItem;
}

export interface RoleDataType {
    roleName: string;
    description?: string;
    type?: "System" | "Custom";
    permissions: PermissionsType;
}
