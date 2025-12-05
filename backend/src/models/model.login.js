import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        email: {
            type: String,
            unique: true,
            sparse: true
        },

        password: {
            type: String,
        },

        role: {
            type: String,
            enum: ["superAdmin", "support", "finance", "compliance", "user", "listener"],
            default: "user"
        },

        token: { type: String },

        username: {
            type: String,
            unique: true
        },

        cCode: {
            type: String,
            required: true,
        },

        phoneNumber: {
            type: String,
            unique: true,
            required: true,
        },

        status: {
            type: String,
            enum: ["active", "inactive", "blocked", "pending"],
            default: "active"
        },

        registered: {
            type: Date,
            default: Date.now
        },

        lastActive: {
            type: Date
        },

        sessions: [{
            type: Schema.Types.ObjectId,
            ref: "Session"
        }],

        tickets: [{
            type: Schema.Types.ObjectId,
            ref: "SupportTicket"
        }],

        lang: {
            type: String,
        },

        gender: {
            type: String,
            enum: ["male", "female", "other"]
        },

        myReferralCode: {
            type: String,
            unique: true
        },

        referredBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        referredUsers: [{
            type: Schema.Types.ObjectId,
            ref: "User"
        }]

    }, {
    timestamps: true
});

const User = mongoose.model("User", userScheme);

export { User };
