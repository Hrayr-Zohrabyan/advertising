import AuthenticationHelper from '../helpers/AuthenticationHelper';
import Roles from '../models/userRoles';
import userProjection from '../models/projections/user';

/**
 * routers.get('/roles', UserRole.viewRoles);
 */
export const viewRoles = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
  await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'VIEW_ROLES']);
    try {
      const roles = await Roles.find({projectId: req.headers.projectid}, userProjection);

      return res.json({success: true, data: roles});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});

  }
};

/**
 * routers.put('/roles', UserRole.setRoles);
 */
export const setRoles = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['role', 'permissions'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'SET_ROLES']);
    try {
      const role = await Roles.findOne({role: req.body.role, projectId: req.headers.projectid});
      if (role) {
        role.permissions = req.body.permissions;
        await role.save();
        return res.json({success: true, message: 'Role permissions updated'});
      } else {
        await Roles.create({
          projectid: req.headers.projectid,
          role: req.body.role,
          permissions: req.body.permissions
        });
        return res.json({success: true, message: 'Usertype with permissions created'});
      }
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};