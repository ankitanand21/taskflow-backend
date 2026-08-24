import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { auth, admin } from '../../middleware/auth';
import { AppError } from '../../utils/errors';

const r = Router();
r.use(auth, admin);

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(['org_admin', 'member']).default('member')
});
const roleSchema = z.object({ role: z.enum(['org_admin', 'member']) });

r.get('/', async (req, res, next) => {
  try {
    const members = await prisma.orgMember.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
      orderBy: { id: 'asc' }
    });
    res.json({ data: members.map(m => ({ id: m.id, user: m.user, role: m.role })) });
  } catch (e) { next(e); }
});

r.post('/', async (req, res, next) => {
  try {
    const b = createSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: b.email } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    const existing = await prisma.orgMember.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: req.auth!.organizationId } } });
    if (existing) throw new AppError(409, 'MEMBER_EXISTS', 'User is already a member');
    const member = await prisma.orgMember.create({
      data: { userId: user.id, organizationId: req.auth!.organizationId, role: b.role },
      include: { user: { select: { id: true, email: true, name: true } } }
    });
    res.status(201).json(member);
  } catch (e) { next(e); }
});

r.patch('/:userId', async (req, res, next) => {
  try {
    const b = roleSchema.parse(req.body);
    const userId = String(req.params.userId);
    const member = await prisma.orgMember.findUnique({ where: { userId_organizationId: { userId, organizationId: req.auth!.organizationId } } });
    if (!member) throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    res.json(await prisma.orgMember.update({
      where: { id: member.id }, data: { role: b.role },
      include: { user: { select: { id: true, email: true, name: true } } }
    }));
  } catch (e) { next(e); }
});

r.delete('/:userId', async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    if (userId === req.auth!.userId) throw new AppError(400, 'SELF_REMOVE_FORBIDDEN', 'An admin cannot remove themselves');
    const member = await prisma.orgMember.findUnique({ where: { userId_organizationId: { userId, organizationId: req.auth!.organizationId } } });
    if (!member) throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    await prisma.orgMember.delete({ where: { id: member.id } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default r;
