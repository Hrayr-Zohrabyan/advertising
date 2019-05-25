const exceptions = {
  POST: ['/users/register', '/users/login', '/admin/install/setSuperUser', '/admin/install', '/admin/auth/login', '/admin/auth/register', '/orders/deposit'],
  GET: ['/categories/main', '/admin', '/users/activate', '/admin/auth/activate', '/media*', '/categories', '/listings', '/search*'],
  DELETE: [],
  PUT: [],
  PATCH: [],
  NOPROJECT: {
    GET: ['/media*'],
    All: ['/admin', '/admin/roles', '/admin/install', '/admin/auth/register', '/admin/auth/login', '/admin/projects', '/admin/projects/options', '/users/activate', '/admin/auth/activate'],
  }
};

module.exports = exceptions;