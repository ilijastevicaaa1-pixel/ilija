import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const TINK_BASE_URL = "https://api.tink.com";

export const tink = axios.create({
    baseURL: TINK_BASE_URL,
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
    },
});

export const TINK_CLIENT_ID = process.env.TINK_CLIENT_ID;
export const TINK_CLIENT_SECRET = process.env.TINK_CLIENT_SECRET;
export const TINK_REDIRECT_URI = process.env.TINK_REDIRECT_URI;
export const TINK_ENVIRONMENT = process.env.TINK_ENVIRONMENT;
