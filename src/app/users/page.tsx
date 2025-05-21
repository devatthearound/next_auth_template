import { prisma } from '@/lib/prisma';
import type { User } from '@/generated/prisma';

export default async function UsersPage() {
  const users = await prisma.user.findMany();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user: User) => (
          <li key={user.id}>
            {user.name} ({user.email})
          </li>
        ))}
      </ul>
    </div>
  );
}