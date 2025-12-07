import { Router} from "express";
import { createRole, deleteRole, duplicateRole, getAllRoles, getRoleById, updateRole } from "../controllers/roles.control.js";

const roles = Router();

roles.post('/', createRole);
roles.get('/', getAllRoles);
roles.get('/:id', getRoleById);
roles.put('/:id', updateRole);
roles.delete('/:id', deleteRole);
roles.post('/:id/duplicate', duplicateRole);

export default roles;