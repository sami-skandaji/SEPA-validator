export function absolutize(url) {
    if (!url) return "";
    try {
        new URL(url);
        return url;
    } catch {
        const base = process.env.REACT_APP_BASE_URL || "http://localhost:8000";
        return `${base.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
    }
}