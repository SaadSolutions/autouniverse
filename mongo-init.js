// Create a user for the auto-universe database
db = db.getSiblingDB('auto-universe');

db.createUser({
  user: 'autouser',
  pwd: 'autopass123',
  roles: [
    {
      role: 'readWrite',
      db: 'auto-universe'
    }
  ]
});
