import { Router } from "express";
import { addMessageToTicket, createTicket, deleteTicket, getAllTickets, getTicketById, updateTicketStatus } from "../controllers/supportTicket.control.js";

const ticket = Router();

ticket.post("/", createTicket);
ticket.get("/", getAllTickets);
ticket.get("/:id", getTicketById);
ticket.post("/:id/messages", addMessageToTicket);
ticket.put("/:id", updateTicketStatus);
ticket.delete("/:id", deleteTicket);

export default ticket;