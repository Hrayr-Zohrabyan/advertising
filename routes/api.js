import express from 'express';

import {
	adminLogin,
	adminRegister,
	activate,
} from '../controllers/Admin/AuthAdmin';
import { firstRunInstallation } from '../controllers/Admin/Install';
import { adminIndex } from '../controllers/Admin/AdminIndex';
import {
	viewProjects,
	viewProjectOptions,
	addProject,
	editProject,
	editProjectOptions,
} from '../controllers/Admin/Project';
import { editRoles } from '../controllers/Admin/AdminRole';
import {
	userChat,
	singleChat,
} from '../controllers/Chat';
import {
	searchListing,
	searchListingSuggestions,
	searchUser,
	searchTag,
} from '../controllers/Search';
import {
	userRegister,
	becomeSupplier,
	editUser,
	activateUser,
	manualActivate,
	loginUser,
	availabilityUser,
	availabilityExclusionUser,
	deleteAvailabilityExclusionUser,
	deleteUser,
	userToken,
} from '../controllers/AuthUser';
import {
	viewRoles,
	setRoles,
} from '../controllers/UserRole';
import {
	addCategory,
	mainCategory,
	editCategory,
	viewCategories,
	deleteCategory,
	editCategoryOptions,
	categoriesSuggestions,
} from '../controllers/Category';
import {
	ownListing,
	singleListing,
	addListing,
	editListing,
	deleteListing,
} from '../controllers/Listing';
import {
	viewOrder,
	addOrder,
	depositOrder,
	changeOrderStatus,
	setOrderRatingAndReview,
} from '../controllers/Order';
import { userIndex } from '../controllers/UserIndex';
import {
	getMedia,
	uploadMedia,
} from '../controllers/Media/MediaIndex';

const routers = new express.Router();

routers.post('/admin/auth/login', adminLogin);
routers.post('/admin/auth/register', adminRegister);
routers.get('/admin/auth/activate', activate);
routers.get('/admin/projects/options', viewProjectOptions);
routers.get('/admin/projects', viewProjects);
routers.put('/admin/projects', editProject);
routers.put('/admin/projects/options', editProjectOptions);
routers.post('/admin/projects', addProject);
routers.post('/admin/install', firstRunInstallation);
routers.put('/admin/roles', editRoles);
routers.get('/admin', adminIndex);
routers.get('/chats', userChat);
routers.get('/chats/:partner', singleChat);
routers.get('/search/listing', searchListing);
routers.get('/search/listing/suggestions', searchListingSuggestions);
routers.get('/search/user', searchUser);
routers.get('/search/tag/:tagId', searchTag);
routers.post('/users/register', userRegister);
routers.patch('/users/becomeSupplier', becomeSupplier);
routers.put('/users/edit', editUser);
routers.get('/users/activate', activateUser);
routers.post('/users/manualActivate', manualActivate);
routers.post('/users/login', loginUser);
routers.patch('/users/availability', availabilityUser);
routers.patch('/users/availability/exclusion', availabilityExclusionUser);
routers.delete('/users/availability', deleteAvailabilityExclusionUser);
routers.delete('/users', deleteUser);
routers.post('/users/token', userToken);
routers.get('/roles', viewRoles);
routers.put('/roles', setRoles);
routers.post('/categories', addCategory);
routers.get('/categories/main', mainCategory);
routers.put('/categories', editCategory);
routers.get('/categories', viewCategories);
routers.delete('/categories', deleteCategory);
routers.put('/categories/options', editCategoryOptions);
routers.get('/categories/suggestions', categoriesSuggestions);
routers.get('/listings', ownListing);
routers.get('/listings/:listingId', singleListing);
routers.post('/listings', addListing);
routers.put('/listings', editListing);
routers.delete('/listings', deleteListing);
routers.get('/orders', viewOrder);
routers.post('/orders', addOrder);
routers.post('/orders/deposit', depositOrder);
routers.patch('/orders/status', changeOrderStatus);
routers.patch('/orders/review', setOrderRatingAndReview);
routers.get('/', userIndex);
routers.get('/media/:objectId', getMedia);
routers.post('/media', uploadMedia);

module.exports = {
  routers,
};