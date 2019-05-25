import AuthenticationHelper from '../../helpers/AuthenticationHelper';
import ProjectionHelper from '../../helpers/ProjectionHelper';
import ProjectsModel from '../../models/projects';
import projectProjection from '../../models/projections/project';
import userProjection from '../../models/projections/user';
import AdminUser from '../../models/adminUsers';
import adminUserProjection from '../../models/projections/adminUser';
import UserRoleModel from '../../models/userRoles';
import Users from '../../models/users';

/**
 * routers.get('/admin/projects', viewProjects);
 */
export const viewProjects = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'VIEW_PROJECTS']);
    try {
      const searchObj = {
        userId: tokenResponse.decoded.userId,
      };
      const projects = await ProjectsModel.find(searchObj, projectProjection);

      return res.json({success: true, data: projects});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.get('/admin/projects/options', viewProjectOptions);
 */
export const viewProjectOptions = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'VIEW_PROJECT_OPTIONS']);
    try {
      const projectOptions = Object.keys(ProjectsModel.schema.paths).filter(el => {
        return el.indexOf('projectOptions') === 0;
      });
      const paths = projectOptions.map(el => {
        return el.split('projectOptions.')[1];
      });

      return res.json({success: true, data: paths});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.post('/admin/projects', addProject);
 */
export const addProject = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['name', 'active', 'email'], ['projectOptions', 'adminCredentials']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'ADD_PROJECT']);
    try {
      const newProject = await ProjectsModel.create({
        name: req.body.name,
        active: req.body.active,
        email: req.body.email,
        userId: tokenResponse.decoded.userId,
        projectOptions: req.body.projectOption || {}
      });
      if (!req.body.adminCredentials) {
        const findOneAdminUser = await AdminUser.findOne({id: tokenResponse.decoded.userId});
        let newUser = await Users.findOne({username: findOneAdminUser.username, projectId: newProject.id});

        if (!newUser) {
          newUser = await Users.create({
            projectId: newProject.id,
            username: findOneAdminUser.username,
            password: findOneAdminUser.password,
            fullName: findOneAdminUser.fullName,
            userType: 'admin',
            active: true,
          });
        }

        await UserRoleModel.create({
            projectId: newProject.id,
            role: 'admin',
            permissions: ['SUPER_USER']
          },
          {
            projectId: newProject.id,
            role: 'supplier',
            permissions: ['EDIT_SELF', 'GET_LISTING', 'ADD_LISTING', 'EDIT_LISTING', 'DELETE_LISTING', 'VIEW_ORDER', 'CHANGE_ORDER_STATUS', 'SET_ORDER_REVIEW', 'SET_AVAILABILITY', "GET_MEDIA", "POST_MEDIA"]
          },
          {
            projectId: newProject.id,
            role: 'consumer',
            permissions: ['EDIT_SELF', 'GET_LISTING', 'VIEW_ORDER', 'ADD_ORDER', 'CHANGE_ORDER_STATUS', 'SET_ORDER_REVIEW', "GET_MEDIA", "POST_MEDIA"]
          });
        return res.json({success: true, data: {project: ProjectionHelper.use(projectProjection, newProject), admin: ProjectionHelper.use(userProjection, newUser)}, message: 'Project added successfully'});
      } else {
        const hashedPassword = bcrypt.hashSync(req.body.adminCredentials.password, 12);
        const newUser = await Users.create({
          projectId: newProject.id,
          username: req.body.adminCredentials.username,
          password: hashedPassword,
          fullName: req.body.adminCredentials.fullName,
          userType: 'admin',
          active: true,
        });
        await UserRoleModel.create({
            projectId: newProject.id,
            role: 'admin',
            permissions: ['SUPER_USER']
          },
          {
            projectId: newProject.id,
            role: 'supplier',
            permissions: ['EDIT_SELF', 'GET_LISTING', 'ADD_LISTING', 'EDIT_LISTING', 'DELETE_LISTING', 'VIEW_ORDER', 'CHANGE_ORDER_STATUS', 'SET_ORDER_REVIEW', 'SET_AVAILABILITY', 'CHAT']
          },
          {
            projectId: newProject.id,
            role: 'consumer',
            permissions: ['EDIT_SELF', 'GET_LISTING', 'VIEW_ORDER', 'ADD_ORDER', 'CHANGE_ORDER_STATUS', 'SET_ORDER_REVIEW', 'SEARCH', 'CHAT']
          });
        return res.json({success: true, data: {project: ProjectionHelper.use(projectProjection, project), admin: ProjectionHelper.use(adminUserProjection, newUser)}, message: 'Project added successfully'});
      }
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.put('/admin/projects', editProject);
 */
export const editProject = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['projectId'], ['projectOptions', 'active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'EDIT_PROJECT']);
    try {
      const findOneProject = await ProjectsModel.findOne({
        id: req.body.projectId,
      });
      if (findOneProject.userId !== tokenResponse.decoded.userId) {
        return res.status(403).json({success: false, error: {message: 'No permission to modify other user project'}});
      }
      if (req.body.name) findOneProject.name = req.body.name;
      if (typeof req.body.active !== 'undefined') findOneProject.active = req.body.active;

      return res.json({success: true, data: ProjectionHelper.use(projectProjection, findOneProject), message: 'Project edited successfully'});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.put('/admin/projects/options', editProjectOptions);
 */
export const editProjectOptions = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['projectId'], ['projectOptions', 'active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkAdminPermission(req.headers.authorization, ['CEO', 'EDIT_PROJECT']);
    try {
      const findOneProject = await ProjectsModel.findOne({
        id: req.body.projectId,
      });
      if (findOneProject.userId !== tokenResponse.decoded.userId) {
        return res.status(403).json({success: false, error: {message: 'No permission to modify other user project'}});
      }

      for (let option in req.body.projectOptions) {
        if(typeof findOneProject.projectOptions[option] !== 'undefined') {
          findOneProject.projectOptions[option] = req.body.projectOptions[option];
        }
      }

      await findOneProject.save();
      return res.json({success: true, data: ProjectionHelper.use(projectProjection, findOneProject), message: 'Project edited successfully'});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};