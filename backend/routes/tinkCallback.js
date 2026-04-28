import express from "express";
import { tink, TINK_CLIENT_ID, TINK_CLIENT_SECRET, TINK_REDIRECT_URI } from "../tinkClient.js";

const router = express.Router();

router.get("/callback", async (req, res) => {
    const { code } = req.query;

    if (!code) return res.status(400).json({ error: "Missing code" });

    try {
        const data = new URLSearchParams({
            code,
            client_id: TINK_CLIENT_ID,
            client_secret: TINK_CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: TINK_REDIRECT_URI,
        }).toString();

        const response = await tink.post("/api/v1/oauth/token", data);

        const accessToken = response.data.access_token;

        res.json({ accessToken });
    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({ error: "Token exchange failed" });
    }
});

export default router;
