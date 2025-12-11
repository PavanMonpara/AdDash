import * as Yup from 'yup';

export const UserSchema = Yup.object({
    username: Yup.string()
        .trim()
        .min(3, "alias must be at least 3 characters")
        .required("alias is required"),

    email: Yup.string()
        .email("Invalid email format")
        .required("Email is required"),

    cCode: Yup.string()
        .matches(/^\+\d{1,4}$/, "Enter a valid country code (e.g. +1, +91)")
        .required("Country code is required"),

    phoneNumber: Yup.string()
        .matches(/^\d{10}$/, "Phone number must be exactly 10 digits")
        .required("Phone number is required"),

    role: Yup.string()
        .oneOf(
            ["superAdmin", "support", "finance", "compliance", "user", "listener"],
            "Invalid role"
        )
        .required("Role is required"),

    status: Yup.string()
        .oneOf(["active", "inactive", "blocked", "pending"], "Invalid status")
        .required("Status is required"),
});

export const ListnerSchema = Yup.object({
    userId: Yup.string().required().label("User"),
    expertise: Yup.array().of(Yup.string().trim().required()).min(1).label("Expertise"),
    experience: Yup.number().min(1).required().label("Experience"),
    rating: Yup.number().min(1).max(5).required().label("Rating"),
    status: Yup.string().oneOf(["approved", "pending", "suspended"], "Invalid status").required().label("Status"),
    earnings: Yup.number().min(1).required().label("Earnings"),
    commission: Yup.number().min(1).required().label("Commission"),
});

export const SessionSchema = Yup.object({
    sessionId: Yup.string().required().label("Session"),
    user: Yup.string().required().label("User"),
    listener: Yup.string().required().label("Listener"),
    type: Yup.string().oneOf(["video", "chat", "audio"], "Invalid type").required().label("Type"),
    startTime: Yup.string().required().label("Start time"),
    durationInMinutes: Yup.string().min(1).required().label("Duration minutes"),
    status: Yup.string().oneOf(["completed", "pending", "ongoing", "cancelled"], "Invalid status").required().label("Status"),
    paymentStatus: Yup.string().oneOf(["completed", "pending", "refunded"], "Invalid payment status").required().label("Payment status"),
    amount: Yup.number().min(0).required().label("Amount"),
});

export const RoleSchema = Yup.object({
    roleName: Yup.string().required().label("Role name"),
    description: Yup.string().required().label("Description"),
});

