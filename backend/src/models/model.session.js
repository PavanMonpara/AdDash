import mongoose, { Schema } from "mongoose";

const sessionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    listener: {
        type: Schema.Types.ObjectId,
        ref: "Listener",
        required: true
    },
    type: {
        type: String,
        enum: ["video", "chat", "audio"],
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    durationInMinutes: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["completed", "ongoing", "cancelled", "pending", "deleted"],
        default: "pending"
    },
    paymentStatus: {
        type: String,
        enum: ["completed", "pending", "refunded"],
        default: "pending"
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    isDeleted: { 
        type: Boolean, 
        default: false 
    },
    deletedAt: { 
        type: Date, 
        default: null 
    },
    deletedBy: {
        userType: {
            type: String,
            enum: ["user", "listener", "admin", null],
            default: null
        },
        userId: {
            type: Schema.Types.ObjectId,
            refPath: 'deletedBy.userType',
            default: null
        },
        reason: {
            type: String,
            default: null
        }
    }
});

const Session = mongoose.model("Session", sessionSchema);

export { Session };