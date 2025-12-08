// src/middlewares/isSuperAdmin.js

export const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: No user data",
    });
  }

  // Support dono formats: role (string) aur roles (array)
  const role = req.user.role;
  const rolesArray = Array.isArray(req.user.roles) ? req.user.roles : [];

  console.log("isSuperAdmin Check →", { id: req.user.id, role, rolesArray });

  // Agar "superAdmin" hai kisi bhi format mein → allow
  if (role === "superAdmin" || rolesArray.includes("superAdmin")) {
    return next(); // PASS
  }

  // Nahi toh block
  return res.status(403).json({
    success: false,
    message: "Forbidden: SuperAdmin access required",
    error: "You do not have permission to perform this action",
  });
};