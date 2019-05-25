import moment from 'moment';
import AuthenticationHelper from '../helpers/AuthenticationHelper';
import AvailabilityHelper from '../helpers/AvailabilityHelper';
import PriceHelper from '../helpers/PriceHelper';
import UsersModel from '../models/users';
import userProjectionSimple from '../models/projections/userSimple';
import ListingsModel from '../models/listings';
import listingProjection from '../models/projections/listing';
import ProjectionHelper from '../helpers/ProjectionHelper';
import ListingTagsProjection from '../models/projections/listingTags';

/**
 * path _ routers.get('/search/user', searchUser);;
 */
export const searchUser = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['query'], ['limit', 'offset', 'date']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    let limit = 10;
    let offset = 0;
    if (req.query.limit) limit = parseInt(req.query.limit);
    if (req.query.offset) offset = parseInt(req.query.offset);
    const query = req.query.query;
    const users = await UsersModel.find({
      projectId: req.headers.projectid,
      active: true,
      fullName: { $regex : new RegExp(query, 'i') },
      userType: 'supplier',
    }, userProjectionSimple).limit(limit).skip(offset);

    res.json({success: true, data: [users]});
  } catch (err) {
    res.status(400).json({success: false, error: {message: err.message}});
  }
};

/**
 * path _ routers.get('/search/listing', searchListing);
 */
export const searchListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['query'], ['limit', 'offset', 'date']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  const {options, listingName} = JSON.parse(req.query.query);

  try {
    let searchObject = {
      projectId: req.project.id,
      active: true,
    };

    if (listingName) {
      searchObject.name = { $regex : new RegExp(`^${listingName}`, 'i') };
    }
    if (options && options.length) {
      const rules = [];
      for (let option of options) {
        rules.push({ $elemMatch: { 'id': option } });
      }
      searchObject.tags = { '$all': rules };
    }

    const listings = await ListingsModel.find(searchObject, ListingTagsProjection);
    const dataListing = [];

    for (let listing of listings) {
      const listingMod = listing.toObject();
      const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);

      listingMod.userProperties = userProperties.toObject();
      listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
      listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));
      dataListing.push(listingMod);
    }

    res.json({success: true, data: dataListing});
  } catch (err) {
    res.status(400).json({success: false, error: {message: err.message}});
  }
};

/**
 * path _ routers.get('/search/listing/suggestions', searchListingSuggestions);
 */
export const searchListingSuggestions = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['query'], ['limit', 'offset', 'date']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  const {query} = req.query;

  try {
    let searchObject = {
      projectId: req.project.id,
      active: true,
    };

    if (query) {
      searchObject.name = { $regex : new RegExp(`^${query}`, 'i') };
    }

    const listings = await ListingsModel.find(searchObject, ListingTagsProjection);
    const dataListing = [];

    for (let listing of listings) {
      const listingMod = listing.toObject();
      const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);

      listingMod.userProperties = userProperties.toObject();
      listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
      listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));
      
      dataListing.push(listingMod);
    }

    res.json({success: true, data: dataListing});
  } catch (err) {
    res.status(400).json({success: false, error: {message: err.message}});
  }
};

export const searchListing_Example = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, ['query'], ['limit', 'offset', 'date']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    let limit = 10;
    let offset = 0;
    if (req.query.limit) limit = parseInt(req.query.limit);
    if (req.query.offset) offset = parseInt(req.query.offset);
    const query = req.query.query;
    const categoryLevels = req.project.projectOptions.categoryLevels;

    const [listingTypes, users, listings] = await Promise.all([
      ListingTypes.find({project: req.headers.projectid, name: { $regex : new RegExp(query, 'i') }}, listingTypeProjection).limit(limit || 10).skip(offset || 0),
      UsersModel.find({project: req.headers.projectid, fullName: { $regex : new RegExp(query, 'i') }, userType: 'supplier'}, userProjectionSimple).limit(limit || 10).skip(offset || 0),
      ListingsModel.find({
        project: req.headers.projectid,
        $or: [
          {name: {$regex : new RegExp(query, 'i')}},
          {listingComponents: {$elemMatch: {name: query}}}
        ],
        active: true
      }, listingProjection).limit(limit || 10).skip(offset || 0)
    ]);
    let filteredUsers = [];
    let filteredListings = [];
    let filteredListingTypes = [];

    if (req.project.projectOptions.supplierHasAvailability) {
      if (req.query.date) {

      for (let user of users) {
        try {
          await AvailabilityHelper.check(req.project, user.id, req.query.date);
          filteredUsers.push(user);
        } catch (e) {
        }
      }
    } else {
      filteredUsers = users;
    }

  for (let listing of listings) {
    let listingMod = listing.toObject();
    try {
      if (req.query.date) {
        await AvailabilityHelper.check(req.project, listingMod.userId, req.query.date);
      }
      const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);
      listingMod.userProperties = userProperties.toObject();

      if(categoryLevels) {
        const listingTypeProperties = await ListingTypes.findOne({id: listingMod.listingType}, listingTypeProjection);
        listingMod.listingTypeProperties = listingTypeProperties.toObject();
      }

      listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
      filteredListings.push(listingMod);
    } catch (err) {
      console.error(err);
    }
  }

  for (let listingType of listingTypes) {
    const listingsByType = await ListingsModel.find({project: req.headers.projectid, listingType: listingType.id, active: true});
    for (let listing of listingsByType) {
      let listingAlreadyExistsInList = false;
      for (let currentListing of filteredListings) {
        if(listing.id == currentListing.id) {
          listingAlreadyExistsInList = true;
          break;
        }
      }
      if (!listingAlreadyExistsInList) {
        let listingMod = listing.toObject();
        if (req.query.date) {
          await AvailabilityHelper.check(req.project, listingMod.userId, req.query.date);
        }
        const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);
        listingMod.userProperties = userProperties.toObject();

        if(categoryLevels) {
          const listingTypeProperties = await ListingTypes.findOne({id: listingMod.listingType}, listingTypeProjection);
          listingMod.listingTypeProperties = listingTypeProperties.toObject();
        }

        listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
        filteredListings.push(listingMod);
      }
    }
  }

  for (let listingType of listingTypes) {
    const listingsByType = await ListingsModel.find({project: req.headers.projectid, listingType: listingType.id, active: true});
    let count = listingsByType.length;
    if (req.query.date) {
      count = 0;
      for (let listing of listingsByType) {
        try {
          await AvailabilityHelper.check(req.project, listing.userId, req.query.date);
          count++;

        } catch (err) {
          console.error(err);
        }
      }
    }
    if (count) {
      filteredListingTypes.push(listingType);
    }
  }
  } else {
    for (let listing of listings) {
      let listingMod = listing.toObject();
      try {
        const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);
        listingMod.userProperties = userProperties.toObject();

        if(categoryLevels) {
          const listingTypeProperties = await ListingTypes.findOne({id: listingMod.listingType}, listingTypeProjection);
          listingMod.listingTypeProperties = listingTypeProperties.toObject();
        }

        listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
      } catch (e) {
        console.error(e);
      }
      if (moment(listingMod.listingDate).isSame(moment(req.query.date), 'day') || AvailabilityHelper.reccurs(listingMod, req.query.date)) {
        filteredListings.push(listingMod);
      }
    }

    for (let listingType of listingTypes) {
      const listingsByType = await ListingsModel.find({project: req.headers.projectid, listingType: listingType.id, active: true});
      for (let listing of listingsByType) {
        let listingAlreadyExistsInList = false;
        for (let currentListing of filteredListings) {
          if(listing.id === currentListing.id) {
            listingAlreadyExistsInList = true;
            break;
          }
        }
        let listingMod = listing.toObject();
        if (!listingAlreadyExistsInList) {
          if (req.query.date) {
            await AvailabilityHelper.check(req.project, listingMod.userId, req.query.date);
          }
          const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);
          listingMod.userProperties = userProperties.toObject();

          if(categoryLevels) {
            const listingTypeProperties = await ListingTypes.findOne({id: listingMod.listingType}, listingTypeProjection);
            listingMod.listingTypeProperties = listingTypeProperties.toObject();
          }

          listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
          filteredListings.push(listingMod);
        }
      }
    }

    for (let listingType of listingTypes) {
      const listingsByType = await ListingsModel.find({project: req.headers.projectid, listingType: listingType.id, active: true});
      let count = listingsByType.length;
      if (req.query.date) {
        count = 0;
        for (let listing of listingsByType) {
          if (moment(listing.listingDate).isSame(moment(req.query.date), 'day') || AvailabilityHelper.reccurs(listing, req.query.date)) {
            count++;
          }
        }
      }
      if (count) {
        filteredListingTypes.push(listingType);
      }
    }

    for (let user of users) {
      const listingsByUser = await ListingsModel.find({project: req.headers.projectid, userId: user.id, active: true});
      let count = 0;
      for (let listing of listingsByUser) {
        if (moment(listing.listingDate).isSame(moment(req.query.date), 'day') || AvailabilityHelper.reccurs(listing, req.query.date)) {
          count++;
        }
      }
      if (count) {
        filteredUsers.push(user);
      }
    }
  }

  res.json({success: true, data: {
      listingTypes: filteredListingTypes,
      users: filteredUsers,
      listings: filteredListings,
    }});
  } catch (err) {
    res.status(400).json({success: false, error: {message: err.message}});
  }
};

/**
 * path _ routers.get('/search/tag/:tagId', searchTag);
 */
export const searchTag = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], ['limit', 'offset', 'date']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  let tokenResponse;
  if(req.headers.authorization) {
    tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  }

  try {
    let limit = 10;
    let offset = 0;
    if (req.query.limit) limit = parseInt(req.query.limit);
    if (req.query.offset) offset = parseInt(req.query.offset);
    let date = req.query.date || '';
    let searchObject = {
      projectId: req.project.id,
      active: true,
      tags: { $elemMatch: { id: req.params.tagId } },
      userId: { $ne: tokenResponse ? tokenResponse.decoded.userId : '' },
    };

    if (!req.project.projectOptions.pastListingDateAcceptable && date) {
      searchObject.listingDate = { $gte : moment(date).startOf('day').toDate() }
    }

    const listings = await ListingsModel.find(searchObject, listingProjection).limit(limit).skip(offset);
    const filteredListings = [];

    for (let listing of listings) {
      let listingMod = listing.toObject();
      if (req.query.date) {
        await AvailabilityHelper.check(req.project, listingMod.userId, req.query.date);
      }
      const userProperties = await UsersModel.findOne({id: listingMod.userId}, userProjectionSimple);
      listingMod.userProperties = userProperties.toObject();

      listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod).final;
      listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));

      filteredListings.push(listingMod);
    }

    res.json({ success: true, data: { listings: filteredListings } });
  } catch (err) {
    res.status(400).json({success: false, error: {message: err.message}});
  }
};