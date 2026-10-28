import type { NextConfig } from "next";
// Updated to reload Prisma client runtime
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.0.101'],
  turbopack: {}
};

export default withPWA(nextConfig);
