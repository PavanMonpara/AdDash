import { Router } from "express";
import { appLogin } from "../../controllers/login.control.js";

const appRoute = Router();

appRoute.route("/login").post(appLogin);

export default appRoute;