const formValidator = {
    async validate(page) {
        // Check for success/failure indicators
        const errors = await page.$$eval('.error, .validation-error', nodes => nodes.map(n => n.textContent.trim()));
        const success = await page.$$eval('.success, .validation-success', nodes => nodes.length > 0);
        // Additional checks: required fields, completion status, etc.
        return {
            success,
            errors,
        };
    },
    // Common validation helpers
    email: (email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
    phone: (phone) => /^\+?\d{10,15}$/.test(phone.replace(/\D/g, '')),
    password: (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw),
    date: (date) => /^\d{4}-\d{2}-\d{2}$/.test(date),
};

module.exports = formValidator;
