const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("Checking for live Telemetry data in the database...");
  
  // Count total records
  const count = await prisma.telemetry.count();
  console.log(`Total Telemetry records: ${count}`);

  if (count > 0) {
    // Fetch the latest record
    const latest = await prisma.telemetry.findFirst({
      orderBy: { timestamp: 'desc' }
    });
    console.log("Latest Telemetry Record:");
    console.log(latest);
  } else {
    console.log("No telemetry records found yet. Is the Go backend saving them?");
  }
}

main()
  .catch(e => console.error("Prisma error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
