import mongoose, { Schema } from "mongoose";

const permissionsSchema = {
  dashboard: { view: { type: Boolean, default: false } },
  userManagement: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false } },
  listenerManagement: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false } },
  sessionManagement: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, endSession: { type: Boolean, default: false } },
  compliance: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, viewMessages: { type: Boolean, default: false }, flagContent: { type: Boolean, default: false } },
  walletPayments: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, processRefund: { type: Boolean, default: false }, approveWithdrawal: { type: Boolean, default: false }, manualAdjustment: { type: Boolean, default: false } },
  supportTicketing: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, assignTickets: { type: Boolean, default: false }, closeTickets: { type: Boolean, default: false } },
  notifications: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, sendPush: { type: Boolean, default: false }, sendEmail: { type: Boolean, default: false } },
  reports: { view: { type: Boolean, default: false }, export: { type: Boolean, default: false }, accessFinancial: { type: Boolean, default: false } },
  settings: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false }, modifyRazorpay: { type: Boolean, default: false }, modifyCommission: { type:Boolean, default: false } },
  adminManagement: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false } },
  rolesPermissions: { view: { type: Boolean, default: false }, create: { type: Boolean, default: false }, edit: { type: Boolean, default: false }, delete: { type: Boolean, default: false }, export: { type: Boolean, default: false } },
  systemHealth: { view: { type: Boolean, default: false } }
};

const roleSchema = new Schema(
  {
    roleName: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      enum: ['System', 'Custom'],
      default: 'Custom'
    },
    permissions: permissionsSchema
  }
);

const Role = mongoose.model('Role', roleSchema);

export default Role;