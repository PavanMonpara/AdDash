import Role from "../models/model.roles.js";

export const createRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;

    const existingRole = await Role.findOne({ roleName });
    if (existingRole) {
      return res.status(409).json({ message: "A role with this name already exists" });
    }

    const newRole = new Role({
      roleName,
      description,
      permissions,
      type: 'Custom'
    });

    const savedRole = await newRole.save();
    res.status(201).json({ message: "Role created successfully", role: savedRole });

  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", error: error.message });
    }
    res.status(500).json({ message: "Server error creating role" });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: 1 });
    res.status(200).json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching roles" });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.status(200).json(role);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ message: "Invalid role ID format" });
    }
    res.status(500).json({ message: "Server error fetching role" });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.type === 'System') {
      return res.status(403).json({ message: "System roles cannot be modified" });
    }

    if (roleName && roleName !== role.roleName) {
      const existingRole = await Role.findOne({ roleName, _id: { $ne: id } });
      if (existingRole) {
        return res.status(409).json({ message: "A role with this name already exists" });
      }
    }

    role.roleName = roleName || role.roleName;
    role.description = description || role.description;
    role.permissions = permissions || role.permissions;

    const updatedRole = await role.save();
    
    res.status(200).json({ message: "Role updated successfully", role: updatedRole });

  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: "Validation error", error: error.message });
    }
    res.status(500).json({ message: "Server error updating role" });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.type === 'System') {
      return res.status(403).json({ message: "Cannot delete a System role" });
    }

    await Role.findByIdAndDelete(id);

    res.status(200).json({ message: "Role deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting role" });
  }
};

export const duplicateRole = async (req, res) => {
  try {
    const { id } = req.params;

    const originalRole = await Role.findById(id).lean();
    if (!originalRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    const newRoleData = { ...originalRole };

    delete newRoleData._id;
    delete newRoleData.createdAt;
    delete newRoleData.updatedAt;

    newRoleData.roleName = `${originalRole.roleName} (Copy)`;
    newRoleData.type = 'Custom';

    const copyExists = await Role.findOne({ roleName: newRoleData.roleName });
    if (copyExists) {
        return res.status(409).json({ 
          message: "A role with this 'copy' name already exists. Please rename the existing copy first." 
        });
    }

    const newRole = new Role(newRoleData);
    await newRole.save();

    res.status(201).json({ message: "Role duplicated successfully", role: newRole });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error duplicating role" });
  }
};