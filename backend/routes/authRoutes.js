const router = require("express").Router();
const auth = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/login", auth.login);
router.post("/register", auth.register);
router.post("/logout", auth.logout);
router.get("/session", auth.session);
router.patch("/user", requireAuth, auth.updateUser);

module.exports = router;
