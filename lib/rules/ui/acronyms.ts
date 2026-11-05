// Acronyms that keep their casing: all caps, or as listed for one written in
// mixed case, such as "OAuth"
export const DEFAULT_ACRONYMS: string[] = [
    // Network protocols
    "API",
    "HTTP",
    "HTTPS",
    "URL",
    "DNS",
    "TCP",
    "IP",
    "SSH",
    "TLS",
    "SSL",
    "FTP",
    "SFTP",
    "SMTP",
    // File formats
    "JSON",
    "XML",
    "HTML",
    "CSS",
    "PDF",
    "CSV",
    "YAML",
    "SQL",
    "PNG",
    "JPG",
    "JPEG",
    "GIF",
    "SVG",
    // Security
    "2FA",
    "MFA",
    "OAuth",
    "JWT",
    "LDAP",
    "SAML",
    // Development
    "SDK",
    "IDE",
    "CLI",
    "GUI",
    "CRUD",
    "SOAP",
    // Hardware
    "CPU",
    "GPU",
    "RAM",
    "SSD",
    "USB",
    // UI
    "UI",
    "OK",
    // Services
    "RSS",
    "S3",
    // Identifiers
    "ID",
    // Other
    "UUID",
    "GUID",
    "SHA",
    "MD5",
    "ASCII",
    "UTF-8",
    "UTF-16",
    "DOM",
    "CDN",
    "FAQ",
    "AI",
    "ML",
    "LLM"
];

// Acronyms that are also ordinary words, such as "REST" and "rest". They are
// kept as written when all caps, and otherwise treated as the ordinary word,
// so neither "Use the REST API" nor "Take a rest" is reported.
export const DEFAULT_CASE_AGNOSTIC_ACRONYMS: string[] = [
    "REST",
];
