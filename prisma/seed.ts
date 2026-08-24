import { PrismaClient, Priority, Role, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const p = new PrismaClient();
const orgIds = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
];
const projectIds = [
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004'
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const [acme, globex] = await Promise.all([
    p.organization.upsert({ where: { id: orgIds[0] }, update: { name: 'Acme Inc' }, create: { id: orgIds[0], name: 'Acme Inc' } }),
    p.organization.upsert({ where: { id: orgIds[1] }, update: { name: 'Globex Corp' }, create: { id: orgIds[1], name: 'Globex Corp' } })
  ]);

  const users = [];
  for (let i = 1; i <= 5; i++) {
    users.push(await p.user.upsert({
      where: { email: `user${i}@taskflow.dev` },
      update: { name: `User ${i}`, passwordHash },
      create: { email: `user${i}@taskflow.dev`, name: `User ${i}`, passwordHash }
    }));
  }

  for (let i = 0; i < users.length; i++) {
    const organizationId = i < 3 ? acme.id : globex.id;
    await p.orgMember.upsert({
      where: { userId_organizationId: { userId: users[i].id, organizationId } },
      update: { role: i === 0 || i === 3 ? Role.org_admin : Role.member },
      create: { userId: users[i].id, organizationId, role: i === 0 || i === 3 ? Role.org_admin : Role.member }
    });
  }

  const projects = [];
  for (let i = 0; i < 4; i++) {
    projects.push(await p.project.upsert({
      where: { id: projectIds[i] },
      update: { name: `Project ${i + 1}`, description: `Seed project ${i + 1}`, organizationId: orgIds[i % 2] },
      create: { id: projectIds[i], organizationId: orgIds[i % 2], name: `Project ${i + 1}`, description: `Seed project ${i + 1}` }
    }));
  }

  const statuses: Status[] = [Status.todo, Status.in_progress, Status.review, Status.done];
  const priorities: Priority[] = [Priority.low, Priority.medium, Priority.high, Priority.urgent];

  for (let i = 1; i <= 12; i++) {
    const taskId = `20000000-0000-0000-0000-${String(i).padStart(12, '0')}`;
    const project = projects[(i - 1) % projects.length];
    const eligibleUsers = users.filter(u => [acme.id, globex.id].includes(project.organizationId));
    const assignedUser = eligibleUsers[(i - 1) % eligibleUsers.length];

    const task = await p.task.upsert({
      where: { id: taskId },
      update: {
        projectId: project.id,
        title: `Seed task ${i}`,
        description: `Task description ${i}`,
        status: statuses[(i - 1) % statuses.length],
        priority: priorities[(i - 1) % priorities.length],
        dueDate: new Date(Date.now() + i * 86400000),
        deletedAt: null
      },
      create: {
        id: taskId,
        projectId: project.id,
        title: `Seed task ${i}`,
        description: `Task description ${i}`,
        status: statuses[(i - 1) % statuses.length],
        priority: priorities[(i - 1) % priorities.length],
        dueDate: new Date(Date.now() + i * 86400000)
      }
    });

    await p.taskAssignment.upsert({
      where: { taskId_userId: { taskId: task.id, userId: assignedUser.id } },
      update: {},
      create: { taskId: task.id, userId: assignedUser.id }
    });

    await p.comment.deleteMany({ where: { taskId: task.id } });
    await p.comment.create({ data: { taskId: task.id, userId: assignedUser.id, body: `Sample comment for task ${i}` } });
  }

  console.log('Seed complete');
}

main().finally(() => p.$disconnect());
