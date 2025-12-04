import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { getAllUsers ,promoteUserToAdmin ,deleteUser} from "../controllers/admin.controller.js";

const router = express.Router();

// Admin routes
router.route("/all-users").get(verifyJWT, authorizeRoles("admin"), getAllUsers);
router.route("/promote/:id").patch(verifyJWT, authorizeRoles("admin"), promoteUserToAdmin)
router.route("/delete/:id").delete(verifyJWT, authorizeRoles("admin"), deleteUser);

export default router;
