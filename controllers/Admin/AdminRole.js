import AuthenticationHelper from '../../helpers/AuthenticationHelper';
import AdminRolesModel from '../../models/adminRoles';

/**
 * routers.put('/admin/roles', AdminRole.editRoles);
 */
export const editRoles = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['role', 'permissions'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'SET_ADMIN_ROLES']);
    try {
      const role = await AdminRolesModel.findOne({role: req.body.role});
      if (role) {
        role.permissions = req.body.permissions;
        await role.save();
        return res.json({success: true, message: 'Role permissions updated'});
      } else {
        await AdminRolesModel.create({
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