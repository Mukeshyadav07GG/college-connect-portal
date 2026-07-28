const router = require("express").Router();
const storage = require("../controllers/storageController");
const { requireAuth } = require("../middleware/auth");

router.post("/sign-upload", requireAuth, storage.createUploadUrl);
router.post("/sign-download", requireAuth, storage.createDownloadUrl);
router.delete("/objects", requireAuth, storage.removeFiles);
router.get("/public/:bucket/*", storage.redirectToObject);

module.exports = router;
