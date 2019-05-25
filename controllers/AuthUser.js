import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import AuthenticationHelper from '../helpers/AuthenticationHelper';
import ProjectionHelper from '../helpers/ProjectionHelper';
import Mailer from '../helpers/Mailer';
import SmsService from '../helpers/SmsService';
import Users from '../models/users';
import userProjection from '../models/projections/user';
import userSimpleProjection from '../models/projections/userSimple';
import ActivationLinks from '../models/activationLinks';
import UserTokens from '../models/userTokens';
import Projects from '../models/projects';

/**
 * routers.post('/users/register', userRegister);
 */
export const userRegister = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['username', 'password', 'fullName'], ['userType', 'address', 'lat', 'lon', 'phone']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  if (req.project.projectOptions.registrationType === 'email') {
    if (!AuthenticationHelper.isEmail(req.body.username)) return res.status(400).json({success: false, error: {message: 'Username must be email.'}});
  } else if (req.project.projectOptions.registrationType === 'phone') {
    if (!AuthenticationHelper.isPhoneNumber(req.body.username)) return res.status(400).json({success: false, error: {message: 'Username must be phone.'}});
  }

  const hashedPassword = bcrypt.hashSync(req.body.password, 12);
  const userType = AuthenticationHelper.validateUserType(req.body.userType);
  try {
    let manualActive = true;
    if (userType === 'supplier') manualActive = !req.project.projectOptions.supplierManualActivation;
    const user = await Users.create({
      projectId: req.headers.projectid,
      username: req.body.username,
      password: hashedPassword,
      fullName: req.body.fullName,
      permissions: ['VIEW_PROJECT_OPTIONS'],
      userType: userType,
      active: false,
      address: req.body.address,
      lat: req.body.lat,
      lon: req.body.lon,
      phone: req.body.phone,
      otherProperties: req.body.otherProperties,
      manualActive
    });

    if (req.project.projectOptions.registrationType === 'email') {
      const activation = crypto.randomBytes(20).toString('hex');
      await ActivationLinks.create({
        userId: user.id,
        hex: activation,
      });
      Mailer.sendMail(req.project, req.body.username, 'activation', 'activation', {activation});
    } else if (req.project.projectOptions.registrationType === 'phone') {
      const activation = Math.floor(Math.random()*90000) + 10000;
      await ActivationLinks.create({
        userId: user.id,
        hex: activation,
      });
      await SmsService.PhoneVerification(req.body.username, activation);
    }
    return res.json({success: true, data: user.userType === 'supplier' ? ProjectionHelper.use(userProjection, user) : ProjectionHelper.use(userSimpleProjection, user)});
  } catch (err) {
    return res.status(400).json({success: false, error: err.message});
  }
};

/**
 * routers.patch('/users/becomeSupplier', becomeSupplier);
 */
export const becomeSupplier = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, [], ['address', 'lat', 'lon', 'phone', 'password']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'EDIT_SELF']);
    try {

      if (!req.project.projectOptions.consumerCanBecomeSupplier) {
        return res.status(403).json({success: false, error: {message: 'Consumer cannot become supplier.'}});
      }
      const user = await Users.findOne({id: tokenResponse.decoded.userId});
      if(user.userType === 'consumer') user.userType = 'supplier';
      const edittedUser = await user.save();
      return res.json({success: true, data: edittedUser.userType === 'supplier' ? ProjectionHelper.use(userProjection, edittedUser) : ProjectionHelper.use(userSimpleProjection, edittedUser)});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.put('/users/edit', editUser);
 */
export const editUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, [], ['address', 'lat', 'lon', 'phone', 'password']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'EDIT_SELF']);
    try {
      const user = await Users.findOne({id: tokenResponse.decoded.userId});
      if (req.body.address) user.address = req.body.address;
      if (req.body.lat) user.lat = req.body.lat;
      if (req.body.lon) user.lon = req.body.lon;
      if (req.body.phone) user.phone = req.body.phone;
      if (req.body.password) {
        const hashedPassword = bcrypt.hashSync(req.body.password, 12);
        user.password = hashedPassword;
      }
      await user.save();
      return res.json({success: true, data: user.userType == 'supplier' ? ProjectionHelper.use(userProjection, user) : ProjectionHelper.use(userSimpleProjection, user)});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.get('/users/activate', activateUser);
 */
export const activateUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['activation'], ['responseType']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    const activationUser = await ActivationLinks.findOne({hex: req.query.activation});
    if (!activationUser) {
      if (req.query.responseType && req.query.responseType === 'JSON') {
        return res.status(404).json({success: false, error: {message: 'Activation hash incorrect'}});
      }
      return res.status(404).render('activate', {title: 'Activation', success: false, message: 'Activation hash incorrect'});
    }
    const user = await Users.findOne({id: activationUser.userId});
    if (!user) {
      if (req.query.responseType && req.query.responseType === 'JSON') {
        return res.status(404).json({success: false, error: {message: 'User not found'}});
      }
      return res.status(404).render('activate', {title: 'Activation', success: false, message: 'User not found'});
    }
    user.active = true;
    await user.save();
    await activationUser.remove();
    const project = await Projects.findOne({id: user.projectId});
    Mailer.sendMail(project, user.username, `Welcome to ${project.name}`, 'successfulSignup', {fullName: user.fullName, email: user.username, title: user.project});
    if (req.query.responseType && req.query.responseType === 'JSON') {
      return res.json({success: true, message: 'User activated successfully'});
    }
    return res.render('activate', {title: 'Activation', success: true, message: 'User activated successfully'});
  } catch (err) {
    return res.status(400).render('activate', {title: 'Activation', success: false, message: err.message});
  }
};

/**
 * routers.post('/users/manualActivate', manualActivate);
 */
export const manualActivate = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['userId', 'active'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'MANUAL_ACTIVATE']);
    try {
      const user = await Users.findOne({id: req.body.userId});
      if (!user) {
        return res.status(404).json({success: false, error: {message: 'User not found'}});
      }
      user.manualActive = req.body.active;
      await user.save();
      if (req.project.projectOptions.registrationType === 'email') {
        Mailer.sendMail(req.project, user.username, `You are now active user at ${user.project}`, 'successfulActivated', {fullName: user.fullName, email: user.username, title: user.project});
      } else if (req.project.projectOptions.registrationType === 'phone') {
        // SMS Service
      }
      res.json({success: true, message: `User manually activate set to ${user.manualActive}`});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.post('/users/login', loginUser);
 */
export const loginUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['username', 'password'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    const user = await Users.findOne({
      projectId: req.headers.projectid,
      username: req.body.username,
      active: true,
      manualActive: true,
    });
    if(user) {
      const match = bcrypt.compareSync(req.body.password, user.password);
      if(match) {
        const token = AuthenticationHelper.createToken(user.id, user.projectId, user.userType);
        return res.json({
          success: true,
          data: {userData : user.userType === 'supplier' ? ProjectionHelper.use(userProjection, user) : ProjectionHelper.use(userSimpleProjection, user), token}
        });
      } else {
        return res.status(403).json({success: false, error: {message: 'Incorrect username or password'}})
      }
    } else {
      return res.status(403).json({success: false, error: {message: 'Incorrect username or password'}})
    }
  } catch (err) {
    return res.status(400).json({success: false, error: err.message})
  }
};

/**
 * routers.patch('/users/availability', availabilityUser);
 */
export const availabilityUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, [], ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'SET_AVAILABILITY']);
    if (!r) {
      return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
    }
    try {
      const user = await Users.findOne({
        projectId: req.headers.projectid,
        id: tokenResponse.decoded.userId,
      });
      if(!user) {
        return res.status(404).json({success: false, error: {message: 'User not found'}});
      }
      if (req.body.monday) user.availability.monday = req.body.monday;
      if (req.body.tuesday) user.availability.tuesday = req.body.tuesday;
      if (req.body.wednesday) user.availability.wednesday = req.body.wednesday;
      if (req.body.thursday) user.availability.thursday = req.body.thursday;
      if (req.body.friday) user.availability.friday = req.body.friday;
      if (req.body.saturday) user.availability.saturday = req.body.saturday;
      if (req.body.sunday) user.availability.sunday = req.body.sunday;
      await user.save();
      return res.json({success: true, data: user.availability});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message})
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.patch('/users/availability/exclusion', availabilityExclusionUser);
 */
export const availabilityExclusionUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['exclusions'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'SET_AVAILABILITY']);
    try {
      const user = await Users.findOne({
        projectId: req.headers.projectid,
        id: tokenResponse.decoded.userId,
      });
      if(!user) {
        return res.status(404).json({success: false, error: {message: 'User not found'}});
      }
      for (let exclusion of req.body.exclusions) {
        if (user.availability.exclusions.indexOf(exclusion) == -1) {
          user.availability.exclusions.push(exclusion);
        }
      }
      await user.save();
      return res.json({success: true, data: user.availability})
    } catch (err) {
      return res.status(400).json({success: false, error: err.message})
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.delete('/users/availability', deleteAvailabilityExclusionUser);
 */
export const deleteAvailabilityExclusionUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['exclusions'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'SET_AVAILABILITY']);
    try {
      const user = await Users.findOne({
        projectId: req.headers.projectid,
        id: tokenResponse.decoded.userId,
      });
      if(!user) {
        return res.status(404).json({success: false, error: {message: 'User not found'}});
      }
      for (let exclusion of req.body.exclusions) {
        const index = user.availability.exclusions.indexOf(exclusion);
        if (index !== -1) {
          user.availability.exclusions.splice(index, 1);
        }
      }
      await user.save();
      return res.json({success: true, data: user.availability});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message})
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.delete('/users', deleteUser);
 */
export const deleteUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, [], ['id']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'DELETE_USER']);

    return res.json({success: false, error: {message: 'Not implemented'}});

  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.post('/users/token', userToken);
 */
export const userToken = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['token'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    const user = await UserTokens.findOne({userId: tokenResponse.decoded.userId});
    if (!user) {
      await UserTokens.create({
        projectId: req.project.id,
        userId: tokenResponse.decoded.userId,
        token: req.body.token,
      });
    } else {
      user.token = req.body.token;
      await user.save();
    }
    return res.json({success: true, data: {message: 'Token successfully registered.'}});
  } catch (e) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};