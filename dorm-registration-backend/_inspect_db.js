const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  const profiles = await prisma.studentProfile.count();
  const dorms = await prisma.dorm.count();
  const rooms = await prisma.room.count();
  const bookings = await prisma.booking.count();
  const payments = await prisma.payment.count();
  const maintenance = await prisma.maintenanceRequest.count();
  const power = await prisma.powerUsage.count();
  const reviews = await prisma.review.count();

  console.log(JSON.stringify({
    User: users,
    StudentProfile: profiles,
    Dorm: dorms,
    Room: rooms,
    Booking: bookings,
    Payment: payments,
    MaintenanceRequest: maintenance,
    PowerUsage: power,
    Review: reviews
  }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
