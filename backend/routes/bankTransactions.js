import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/transactions", async (req, res) => {
    const { accessToken } = req.query;

    if (!accessToken)
        return res.status(400).json({ error: "Missing access token" });

    try {
        const response = await axios.get(
            "https://api.tink.com/data/v2/transactions",
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

export default router;
