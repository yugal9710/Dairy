import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../server/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const platformPath = path.join(__dirname, '..', 'server', 'data', 'platform.json');

const platform = JSON.parse(fs.readFileSync(platformPath, 'utf8'));

const adminHash = hashPassword('Admin@123');
const staffHash = hashPassword('Staff@123');
const now = 1794566441924;

platform.users = [
  {
    id: 1,
    tenantId: 1,
    username: 'admin',
    email: 'admin@dairy.local',
    name: 'Platform Owner / Admin',
    passwordHash: adminHash,
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now
  },
  {
    id: 2,
    tenantId: 1,
    username: 'sfacl.admin',
    email: 'admin@sfacl.dairynepal.com',
    name: 'Sana Kisan Admin',
    passwordHash: adminHash,
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 1
  },
  {
    id: 3,
    tenantId: 1,
    username: 'sfacl.staff',
    email: 'staff@sfacl.dairynepal.com',
    name: 'Sana Kisan Staff',
    passwordHash: staffHash,
    roles: ['User'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 2
  },
  {
    id: 4,
    tenantId: 2,
    username: 'himali.admin',
    email: 'admin@himali.dairynepal.com',
    name: 'Himali Admin',
    passwordHash: adminHash,
    roles: ['Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 3
  },
  {
    id: 5,
    tenantId: 2,
    username: 'himali.staff',
    email: 'staff@himali.dairynepal.com',
    name: 'Himali Counter Staff',
    passwordHash: staffHash,
    roles: ['User'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 4
  },
  {
    id: 6,
    tenantId: 3,
    username: 'anna.admin',
    email: 'admin@annapurna.dairynepal.com',
    name: 'Annapurna Admin',
    passwordHash: adminHash,
    roles: ['Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 5
  },
  {
    id: 7,
    tenantId: 3,
    username: 'anna.staff',
    email: 'staff@annapurna.dairynepal.com',
    name: 'Annapurna Staff',
    passwordHash: staffHash,
    roles: ['User'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 6
  },
  {
    id: 8,
    tenantId: 4,
    username: 'amresh',
    email: 'amresh-dairy@dairynepal.com',
    name: 'Amresh Raut',
    passwordHash: adminHash,
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 7
  },
  {
    id: 9,
    tenantId: 5,
    username: 'amresh2',
    email: 'amresh-dairy-2@dairynepal.com',
    name: 'Cooperative Manager',
    passwordHash: adminHash,
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 8
  },
  {
    id: 10,
    tenantId: 6,
    username: 'kanchan_1567',
    email: 'test-coop-1567@dairynepal.com',
    name: 'Ram Bahadur Limbu',
    passwordHash: adminHash,
    roles: ['SuperAdmin', 'Admin'],
    isActive: true,
    isDeleted: false,
    creationDateTimeUtms: now + 9
  }
];

fs.writeFileSync(platformPath, JSON.stringify(platform, null, 2), 'utf8');
console.log('Successfully reset all user IDs and passwords in platform.json!');
console.log(`Total reset users: ${platform.users.length}`);
platform.users.forEach(u => {
  console.log(` - ID #${u.id}: @${u.username} (Tenant #${u.tenantId}, Roles: [${u.roles.join(', ')}])`);
});
