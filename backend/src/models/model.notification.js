import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  type: {
    type: String,
    required: true,
    enum: ['system', 'message', 'call', 'session', 'support', 'admin']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
}, { timestamps: true });

// Index for faster querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification };
