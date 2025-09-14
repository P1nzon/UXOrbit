const urlValidator = {
    toAbsolute: (url, base) => {
        try {
            return new URL(url, base).toString();
        } catch {
            return url;
        }
    },
    isValid: (url) => {
        try {
            const u = new URL(url);
            return /^https?:/.test(u.protocol);
        } catch {
            return false;
        }
    },
    isInternal: (url, base) => {
        try {
            const u = new URL(url, base);
            return u.hostname === new URL(base).hostname;
        } catch {
            return false;
        }
    },
    isDownload: (url) => /\.(pdf|zip|docx?|xlsx?|csv|jpg|png|gif)$/i.test(url),
    extractComponents: (url) => {
        try {
            const u = new URL(url);
            return {
                protocol: u.protocol,
                hostname: u.hostname,
                pathname: u.pathname,
                search: u.search,
                hash: u.hash
            };
        } catch {
            return {};
        }
    }
};

module.exports = urlValidator;
