import express from "express";
import {
    TINK_CLIENT_ID,
    TINK_REDIRECT_URI,
    TINK_ENVIRONMENT
} from "../tinkClient.js";

const router = express.Router();

router.get("/connect", (req, res) => {
    const url =
        `https://link.tink.com/1.0/authorize/` +
        `?client_id=${TINK_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(TINK_REDIRECT_URI)}` +
        `&scope=accounts:read,transactions:read` +
        `&market=SK` +
        `&locale=sk_SK` +
        `&environment=${TINK_ENVIRONMENT}`;

    res.json({ url });
});

export default router;
