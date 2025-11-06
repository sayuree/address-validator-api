import express from "express";
import { validateAddressController } from "../controllers/validateAddressController.js";
import { validateAddressPayload } from "../middleware/validateAddressPayload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/", validateAddressPayload, asyncHandler(validateAddressController));

export default router;
