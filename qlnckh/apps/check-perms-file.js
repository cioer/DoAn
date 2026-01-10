const { DEMO_ROLE_PERMISSIONS } = require('./apps/src/seeds/demo-seed-data.constants');
const adminPerms = DEMO_ROLE_PERMISSIONS.filter(p => p.role === 'ADMIN');
console.log('ADMIN permissions in file:', adminPerms.length);
adminPerms.forEach(p => console.log(' -', p.permission));
