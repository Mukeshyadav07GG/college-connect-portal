const router = require("express").Router();
const { runQuery } = require("../controllers/queryController");
const { callRpc } = require("../controllers/rpcController");
const { requireAuth } = require("../middleware/auth");

// Generic, policy-scoped data endpoint used by the frontend data client.
router.post("/query", requireAuth, runQuery);

// Stored-procedure equivalents.
router.post("/rpc/:name", requireAuth, callRpc);

module.exports = router;
