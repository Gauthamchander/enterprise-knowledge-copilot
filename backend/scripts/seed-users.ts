import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Find the organisation (accord ai)
  const organisation = await prisma.organisation.findFirst({
    where: { name: 'accord ai' },
  });

  if (!organisation) {
    console.error('Organisation "accord ai" not found. Please create it first.');
    process.exit(1);
  }

  // Find all departments
  const departments = await prisma.department.findMany({
    where: { organisationId: organisation.id },
  });

  if (departments.length === 0) {
    console.error('No departments found. Please create departments first.');
    process.exit(1);
  }

  // Hash password (using a default password for all users)
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Create one user for each department
  const departmentUserMap = [
    { departmentName: 'Engineering', email: 'engineer@accordai.com' },
    { departmentName: 'HR', email: 'hr@accordai.com' },
    { departmentName: 'Sales', email: 'sales@accordai.com' },
    { departmentName: 'Finance', email: 'finance@accordai.com' },
    { departmentName: 'Product', email: 'product@accordai.com' },
  ];

  for (const mapping of departmentUserMap) {
    const department = departments.find((d) => d.name === mapping.departmentName);
    
    if (!department) {
      console.warn(`Department "${mapping.departmentName}" not found. Skipping...`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: mapping.email,
        passwordHash: passwordHash,
        organisationId: organisation.id,
        departmentId: department.id,
      },
    });

    console.log(`Created user: ${user.email} for ${department.name} department (${user.id})`);
  }

  console.log('\nAll users created successfully!');
  console.log('Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
