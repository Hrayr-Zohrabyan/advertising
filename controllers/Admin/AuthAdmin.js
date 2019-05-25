import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AuthenticationHelper from '../../helpers/AuthenticationHelper';
import ProjectionHelper from '../../helpers/ProjectionHelper';
import Mailer from '../../helpers/Mailer';
import AdminUsers from '../../models/adminUsers';
import adminUserProjection from '../../models/projections/adminUser';
import ActivationLinks from '../../models/activationLinks';

/**
 * routers.post('/admin/auth/login', adminLogin);
 */
export const adminLogin = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['username', 'password'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  if (!AuthenticationHelper.isEmail(req.body.username)) return res.status(400).json({success: false, error: {message: 'Username must be email.'}});

  try {
    const user = await AdminUsers.findOne({
      username: req.body.username,
      active: true,
    });
    if(user) {
      const match = bcrypt.compareSync(req.body.password, user.password);
      if(match) {
        const token = AuthenticationHelper.createToken(user.id, null, user.userType);
        return res.json({success: true, data: {token} })
      } else {
        return res.status(403).json({success: false, error: {message: 'Incorrect username or password'}});
      }
    } else {
      return res.status(403).json({success: false, error: {message: 'Incorrect username or password'}});
    }
  } catch (err) {
    return res.status(400).json({success: false, error: err.message})
  }
};

/**
 * routers.post('/admin/auth/register', adminRegister);
 */
export const adminRegister = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['username', 'password', 'fullName'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  if (!AuthenticationHelper.isEmail(req.body.username)) return res.status(400).json({success: false, error: {message: 'Username must be email.'}});

  try {
    const user = await AdminUsers.findOne({username: req.body.username});
    if(user) {
      return res.status(400).json({success: false, error: {message: 'Username already in use.'}});
    }
    const hashedPassword = bcrypt.hashSync(req.body.password, 12);
    const addedUser = await AdminUsers.create({
      username: req.body.username,
      password: hashedPassword,
      fullName: req.body.fullName,
      userType: 'user'
    });
    const activation = crypto.randomBytes(20).toString('hex');
    await ActivationLinks.create({
      userId: addedUser.id,
      hex: activation,
    });
    Mailer.sendAdminMail(req.body.username, 'Activation', 'adminActivation', {activation});
    return res.json({success: true, data: ProjectionHelper.use(adminUserProjection, addedUser)});
  } catch (err) {
    return res.status(400).json({success: false, error: err.message});
  }
};

/**
 * routers.get('/admin/auth/activate', activate);
 */
export const activate = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['activation'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    const activationUser = await ActivationLinks.findOne({hex: req.query.activation});
    if (!activationUser) {
      return res.status(404).render('activate', {title: 'Activation', success: false, message: 'Activation hash incorrect'});
    }
    const user = await AdminUsers.findOne({id: activationUser.userId});
    if (!user) {
      return res.status(404).render('activate', {title: 'Activation', success: false, message: 'User not found'});
    }
    user.active = true;
    await user.save();
    await activationUser.remove();
    Mailer.sendAdminMail(user.username, `Welcome to Sky.am`, 'successfulSignup', {fullName: user.fullName, email: user.username, title: 'Sky.am'});
    return res.render('activate', {title: 'Activation', success: true, message: 'User activated successfully'});
  } catch (err) {
    return res.status(400).render('activate', {title: 'Activation', success: false, message: err.message});
  }
};