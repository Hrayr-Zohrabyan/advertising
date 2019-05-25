import bcrypt from 'bcryptjs';
import AuthenticationHelper from '../../helpers/AuthenticationHelper';
import ProjectionHelper from '../../helpers/ProjectionHelper';
import AdminUsers from '../../models/adminUsers';
import adminUserProjection from '../../models/projections/adminUser';
import AdminRoles from '../../models/adminRoles';

/**
 * routers.post('/admin/install', firstRunInstallation);
 */
export const firstRunInstallation = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['username', 'password', 'fullName'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  if (!AuthenticationHelper.isEmail(req.body.username)) return res.status(400).json({success: false, error: {message: 'Username must be email.'}});

  try {
    const users = await AdminUsers.find({});
    if(users.length) {
      return res.status(400).json({success: false, error: {message: 'Owner cannot be set multiple times.'}});
    }
    const hashedPassword = bcrypt.hashSync(req.body.password, 12);
    const user = await AdminUsers.create({
      username: req.body.username,
      password: hashedPassword,
      fullName: req.body.fullName,
      userType: 'owner',
      active: true,
    });
    await AdminRoles.create({
      role: 'owner',
      permissions: ['CEO']
    },{
      role: 'user',
      permissions: ['ADD_PROJECT', 'VIEW_PROJECTS', 'EDIT_PROJECT']
    });
    return res.json({success: true, data: ProjectionHelper.use(adminUserProjection, user)});
  } catch (err) {
    return res.status(400).json({success: false, error: err.message});
  }
};