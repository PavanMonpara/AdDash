import { Router } from "express";
import { appLogin, sendOtp, verifyOtp } from "../../controllers/login.control.js";

const appRoute = Router();

appRoute.route("/login").post(appLogin);
appRoute.route("/send-otp").post(sendOtp);
appRoute.route("/verify-otp").post(verifyOtp);

export default appRoute;