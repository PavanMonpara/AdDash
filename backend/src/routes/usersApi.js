import { Router } from "express";
import { deleteUser, getAllUsers, getUserById, updateUser } from "../controllers/users.control.js";

const user = Router();

user.get('/', getAllUsers);
user.get('/:id', getUserById);
user.put('/:id', updateUser);
user.delete('/:id', deleteUser);

export default user;