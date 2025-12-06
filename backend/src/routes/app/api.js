import { Router } from "express";
import { appLogin, sendOtp } from "../../controllers/login.control.js";

const appRoute = Router();

appRoute.route("/login").post(appLogin);
appRoute.route("/verify-otp").post(sendOtp);

export default appRoute;