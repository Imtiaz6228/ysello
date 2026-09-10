import { Router } from "express";
import { requireAuth, requireVerifiedUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { imageUpload } from "../middleware/upload.js";
import { updateProfileSchema } from "../schemas/profile.schemas.js";
import { getCurrentUser } from "../services/auth.service.js";
import { updateProfile, updateProfileImage } from "../services/user.service.js";

export const profileRouter = Router();

profileRouter.use(requireAuth, requireVerifiedUser);

profileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.auth!.id);

    res.json({ user });
  }),
);

profileRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const user = await updateProfile(req.auth!.id, input);

    res.json({
      message: "Profile updated successfully.",
      user,
    });
  }),
);

profileRouter.post(
  "/avatar",
  imageUpload.single("profilePicture"),
  asyncHandler(async (req, res) => {
    const user = await updateProfileImage(req.auth!.id, req.file);

    res.json({
      message: "Profile picture updated successfully.",
      user,
    });
  }),
);
