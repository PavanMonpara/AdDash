// middlewares/upload.js

import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ESM ke liye __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function — dono ke liye same logic
const createStorage = (folderName) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, `../public/uploads/${folderName}`);
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const prefix = folderName === "profiles" ? "profile" : "complaint";
      cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
};

// Common file filter (sirf images)
const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);

  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP images are allowed!"), false);
  }
};

// 1. Profile Picture Upload (Listener/Admin)
const profileUpload = multer({
  storage: createStorage("profiles"),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFilter,
});

// 2. Complaint Image Upload (User)
const complaintUpload = multer({
  storage: createStorage("complaints"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB (screenshot bada ho sakta hai)
  fileFilter: imageFilter,
});

// Export both
export const uploadProfilePic = profileUpload.single("profilePic");       // field: profilePic
export const uploadComplaintImage = complaintUpload.single("image");     // field: image