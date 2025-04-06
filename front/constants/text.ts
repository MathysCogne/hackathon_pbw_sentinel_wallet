export const TEXT = {
  metadata: {
    title: "Sentinel Wallet",
    description: "Sentinel Wallet - Project for PBW Hackathon",
    lang: "en"
  },
  error: {
    general: "An error occurred. Please try again.",
    browser_not_supported: "Your browser does not support this feature. Please use a modern browser.",
    connection_error: "Connection error. Please try again.",
    disconnect_error: "Error disconnecting. Please try again.",
  },
  actions: {
    connect: "Connect",
    disconnect: "Disconnect",
    try_again: "Try Again",
    loading: "Loading...",
    backHome: "Back to Home"
  },
  xumm: {
    connect: "Connect with Xaman",
    connected: "Connected with Xumm",
    connecting: "Connecting to Xumm...",
    error: "Xumm connection error. Please try again.",
    sign_request: "Please sign the request with Xumm app.",
    scan_qr: "Scan QR code with Xumm app",
  },
  wallet: {
    address: "Wallet Address:",
    copy: "Copy Address",
    copied: "Address Copied!",
  },
} as const; 