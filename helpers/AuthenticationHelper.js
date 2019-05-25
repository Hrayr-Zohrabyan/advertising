import jwt from 'jsonwebtoken';
import config from '../config';
import exceptions from '../constants/urlTokenExceptions';
import Roles from '../models/userRoles';
import AdminRoles from '../models/adminRoles';
import Users from '../models/users';
import Projects from '../models/projects';

export default class AuthenticationHelper {
  static createToken(userId, projectId, userType) {
    const token = jwt.sign({userId, projectId, userType}, config.secret, {
      expiresIn: 30*86400,
    });

    return token;
  }

  static decodeToken(token) {
    if(!token) return null;
    token = token.split('Bearer ')[1];
    return jwt.verify(token, config.secret, (err, decoded) => {
      if (err) {
        return { authSuccess: false, message: 'Failed to authenticate token.', err };
      } else {
        return { authSuccess: true, decoded }
      }
    });
  }

  static tokenExceptionUrl(method, path) {
    if (path.indexOf('?') > -1) {
      path = path.split('?')[0];
    }
    for (let exception of exceptions[method]) {
      if (exception.indexOf('*') > -1 && path.indexOf(exception.split('*')[0]) === 0) {
        return true;
      }
      if (exception === path) {
        return true;
      }
    }
    return false;
  }

  static async checkPermission(project, token, permissionsArray) {
    const response = AuthenticationHelper.decodeToken(token);

    const userType = response.decoded.userType;
    try {
      const role = await Roles.findOne({projectId: project.id, role: userType});
      if (!role) {
        return Promise.reject();
      }
      for (let permission of permissionsArray) {
        if (role.permissions.indexOf(permission) > -1) {
          return Promise.resolve();
        }
      }
      return Promise.reject();
    } catch (err) {
      return Promise.reject();
    }
  }

  static async checkAdminPermission(token, permissionsArray) {
    const response = AuthenticationHelper.decodeToken(token);

    const userType = response.decoded.userType;
    try {
      const role = await AdminRoles.findOne({role: userType});

      if (!role) {
        return Promise.reject();
      }
      for (let permission of permissionsArray) {
        if (role.permissions.indexOf(permission) > -1) {
          return Promise.resolve();
        }
      }
      return Promise.reject();
    } catch (err) {
      return Promise.reject();
    }
  }

  static checkOwnership(token, userId) {
    const response = AuthenticationHelper.decodeToken(token);
    if (response.decoded.userId === userId) {
      return true;
    }
    return false;
  }

  static validateUserType(userType) {
    const validTypes = ['supplier', 'consumer'];
    if (validTypes.indexOf(userType) > -1) {
      return userType;
    }
    return false;
  }

  static requireParams(body, params, optionalParams = []) {
    let message = [];
    let result = true;

    for(let param of params) {
      if(!Object.prototype.hasOwnProperty.call(body, param)) {
        message.push(param + ' parameter is required');
        result = false;
      }
    }
    for (let param of optionalParams) {
      if(!Object.prototype.hasOwnProperty.call(body, param)) {
        message.push(param + ' parameter is optional');
      }
    }
    return {result, message};
  }

  static async projectValidation(method, path, token, projectId) {
    if (path.indexOf('?') > -1) {
      path = path.split('?')[0];
    }
    if (exceptions.NOPROJECT.All.indexOf(path) > -1) {
      return Promise.resolve(true);
    }
    if (exceptions.NOPROJECT[method]) {
      for (let exception of exceptions.NOPROJECT[method]) {
        if (exception.indexOf('*') > -1 && path.indexOf(exception.split('*')[0]) === 0) {
          return Promise.resolve(true);
        }
        if (exception === path) {
          return Promise.resolve(true);
        }
      }
    }
    if (!projectId) {
      return Promise.reject();
    }
    try {
      const project = await Projects.findOne({id: projectId});
      if (!project) {
        return Promise.reject();
      }
      if (!token) {
        return Promise.resolve(project);
      }
      if (token) {
        const tokenResponse = AuthenticationHelper.decodeToken(token);
        try {
          const user = await Users.findOne({id: tokenResponse.decoded.userId});
          if (!user) {
            return Promise.reject();
          }
          if (user.projectId !== projectId) {
            return Promise.reject();
          }
          return Promise.resolve(project);
        } catch (err) {
          return Promise.reject();
        }
      }
    } catch (err) {
      return Promise.reject();
    }
  }

  static isEmail(str) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(str).toLowerCase());
  }

  static isPhoneNumber(str) {
    var re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    return re.test(String(str).toLowerCase());
  }
 }
