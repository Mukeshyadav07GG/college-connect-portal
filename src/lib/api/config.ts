/** Base URL of the Express/MongoDB backend. */
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export const TOKEN_KEY = "erp.auth.token";
export const USER_KEY = "erp.auth.user";
