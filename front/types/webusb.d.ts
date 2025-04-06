interface Navigator {
  usb: {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: { filters: Array<{ vendorId: number }> }): Promise<USBDevice>;
  };
} 