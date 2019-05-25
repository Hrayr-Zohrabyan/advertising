import AuthenticationHelper from '../helpers/AuthenticationHelper';
import ProjectionHelper from '../helpers/ProjectionHelper';
import CategoryModel from '../models/categories';
import CategoryProjection from '../models/projections/category';
import CategoryOptionsProjection from '../models/projections/categoryOptions';
import moment from 'moment';

/**
 * routers.post('/categories', Category.addCategory);
 */
export const addCategory = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['name', 'photo'], ['active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'ADD_CATEGORY']);

    try {
      const mainCategory = await CategoryModel.findOne({main: true});
      const createObj = {
        projectId: req.headers.projectid,
        name: req.body.name,
        photo: req.body.photo,
        active: req.body.active,
        main: false,
      };

      if (!mainCategory) {
        createObj.main = true;
      } else {
        mainCategory.main = false;
        mainCategory.save();
        createObj.main = true;
      }
      const addedCategory = await CategoryModel.create(createObj);

      return res.json({success: true, message: 'Category added successfully.', data: ProjectionHelper.use(CategoryProjection, addedCategory)});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.put('/categories', Category.editCategory);
 */
export const editCategory = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['id'], ['photo', 'active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'EDIT_CATEGORY']);
    try {
      const selectedCategory = await CategoryModel.findOne({
        projectId: req.headers.projectid,
        id: req.body.id,
      }, CategoryProjection);
      if (!selectedCategory) {
        return res.status(404).json({success: false, error: {message: 'No category with given Id.'}});
      }
      if (req.body.photo) selectedCategory.photo = req.body.photo;
      if (req.body.name) selectedCategory.name = req.body.name;
      if (typeof req.body.active !== 'undefined') selectedCategory.active = req.body.active;

      if (typeof req.body.main !== 'undefined') {
        if (selectedCategory.main && !req.body.main) {
          selectedCategory.main = req.body.main;
        } else if (!selectedCategory.main && req.body.main) {
          const mainCategory = await CategoryModel.findOne({main: true});
          if (mainCategory) {
            mainCategory.main = false;
            mainCategory.save();
          }
          selectedCategory.main = req.body.main;
        }
      }

      await CategoryModel.update({projectId: req.headers.projectid, id: req.body.id}, selectedCategory);

      const selectedCategoryMod = selectedCategory.toObject();
      selectedCategoryMod.categoryOptions.every( tag => ProjectionHelper.use(CategoryOptionsProjection, tag));

      return res.json({success: true, message: 'Category edited successfully.', data: selectedCategoryMod});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.delete('/categories', Category.deleteCategory);
 */
export const deleteCategory = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['categoryId'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'DELETE_CATEGORY']);
    try {
      const selectedCategory = await CategoryModel.findOne({
        projectId: req.headers.projectid,
        id: req.body.categoryId,
      });
      if (!selectedCategory) {
        return res.status(404).json({success: false, error: {message: 'No category with given Id.'}});
      }
      selectedCategory.active = false;

      await selectedCategory.save();
      return res.json({success: true, message: 'Category deleted successfully.'});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.put('/categories/options', Category.editCategoryOptions);
 */
export const editCategoryOptions = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['id'], ['photo', 'active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'EDIT_CATEGORY']);
    try {
      const selectedCategory = await CategoryModel.findOne({
        projectId: req.headers.projectid,
        id: req.body.id,
      }, CategoryProjection);
      if (!selectedCategory) {
        return res.status(404).json({success: false, error: {message: 'No category with given Id.'}});
      }

      if (req.body.categoryOptions) {
        for (let option of req.body.categoryOptions) {
          if (option.id) {
            selectedCategory.categoryOptions.forEach((element, i) => {
              if(element.id === option.id) {
                for (let prop in option.properties){
                  selectedCategory.categoryOptions[i].properties[prop] = option.properties[prop];
                }
              }
            });
          } else {
            selectedCategory.categoryOptions.push(option);
          }
        }
      }
        
      await CategoryModel.update({projectId: req.headers.projectid, id: req.body.id}, selectedCategory);

      const selectedCategoryMod = selectedCategory.toObject();
      selectedCategoryMod.categoryOptions.every( tag => ProjectionHelper.use(CategoryOptionsProjection, tag));

      return res.json({success: true, message: 'Category edited successfully.', data: selectedCategoryMod});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.get('/categories/main', Category.mainCategory);
 */
export const mainCategory = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    const mainCategory = await CategoryModel.findOne({main: true}, CategoryProjection);
    
    const selectedCategoryMod = mainCategory.toObject();
    selectedCategoryMod.categoryOptions.every( tag => ProjectionHelper.use(CategoryOptionsProjection, tag));

    return res.json({success: true, data: selectedCategoryMod});
  } catch (err) {
    return res.status(400).json({success: false, error: err.message});
  }
};

/**
 * routers.get('/categories', Category.viewCategories);
 */
export const viewCategories = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], ['active']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    const categories = await CategoryModel.find({projectId: req.headers.projectid, active: true}, CategoryProjection);

    let dataCategories = [];
    for(let category of categories) {
      const categoryMod = category.toObject();
      categoryMod.categoryOptions.every( tag => ProjectionHelper.use(CategoryOptionsProjection, tag));
      dataCategories.push(categoryMod);
    }

    return res.json({success: true, data: dataCategories});
  } catch (err) {
    return res.status(400).json({success: false, error: err.message});
  }
};

/**
 * routers.get('/categories/suggestions', Category.categoriesSuggestions);
 */
export const categoriesSuggestions = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['query'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  return res.status(400).json({success: false, message: 'Not implemented'});
};