import AuthenticationHelper from '../helpers/AuthenticationHelper';
import ProjectionHelper from '../helpers/ProjectionHelper';
import PriceHelper from '../helpers/PriceHelper';
import Users from '../models/users';
import ListingsModel from '../models/listings';
import ListingProjection from '../models/projections/listing';
import ListingTagsProjection from '../models/projections/listingTags';
import userProjectionSimple from '../models/projections/userSimple';

/**
 * routers.post('/listings', addListing);
 */
export const addListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['name', 'price'], ['listingDate', 'listingType', 'photo', 'category', 'isRecurring', 'recurringCycle', 'otherOptions']);
  if (!params.result) return res.status(400).json({ success: false, error: { message: params.message } });

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'ADD_LISTING']);
    try {
      const listing = await ListingsModel.create({
        projectId: req.headers.projectid,
        name: req.body.name,
        photo: req.body.photo,
        tags: req.body.tags,
        userId: tokenResponse.decoded.userId,
        price: req.body.price,
        listingDate: req.body.listingDate,
        isRecurring: req.body.isRecurring,
        recurringCycle: req.body.recurringCycle,
        otherOptions: req.body.otherOptions
      });

      const listingMod = listing.toObject();
      const userProperties = await Users.findOne({ id: listingMod.userId }, userProjectionSimple);
      listingMod.userProperties = userProperties.toObject();
      listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));

      return res.json({ success: true, message: 'Listing added successfully.', data: ProjectionHelper.use(ListingProjection, listingMod) });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: 'No permission to use this API call' } });
  }
};

/**
 * routers.put('/listings', editListing);
 */
export const editListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['id'], ['name', 'photo', 'price', 'listingDate', 'isRecurring', 'recurringCycle', 'active']);
  if (!params.result) return res.status(400).json({ success: false, error: { message: params.message } });

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'EDIT_LISTING']);
    try {
      const listing = await ListingsModel.findOne({
        projectId: req.headers.projectid,
        id: req.body.id,
      });
      if (!listing) {
        return res.status(404).json({ success: false, error: { message: 'No listing with given Id.' } });
      }
      if (!AuthenticationHelper.checkOwnership(req.headers.authorization, listing.userId)) {
        return res.status(403).json({ success: false, error: { message: 'No permission to modify other user listing' } });
      }

      if (req.body.name) listing.name = req.body.name;
      if (req.body.photo) listing.photo = req.body.photo;
      if (req.body.price) listing.price = req.body.price;
      if (req.body.listingDate) listing.listingDate = req.body.listingDate;
      if (typeof req.body.isRecurring !== 'undefined') listing.isRecurring = req.body.isRecurring;
      if (typeof req.body.active !== 'undefined') listing.active = req.body.active;
      if (req.body.recurringCycle) listing.recurringCycle = req.body.recurringCycle;
      if (req.body.tags) listing.tags = req.body.tags;

      const selectedListing = await listing.save();
      const selectedListingMod = selectedListing.toObject();
      const userProperties = await Users.findOne({ id: selectedListingMod.userId }, userProjectionSimple);
      selectedListingMod.userProperties = userProperties.toObject();
      selectedListingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));

      return res.json({ success: true, message: 'Listing edited successfully.', data: ProjectionHelper.use(ListingProjection, selectedListingMod) });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: 'No permission to use this API call' } });
  }
};

/**
 * routers.delete('/listings', deleteListing);
 */
export const deleteListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['id'], []);
  if (!params.result) return res.status(400).json({ success: false, error: { message: params.message } });

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'DELETE_LISTING']);
    try {
      const listing = await ListingsModel.findOne({ projectId: req.headers.projectid, id: req.body.id, active: true });
      if (!listing) {
        return res.status(404).json({ success: false, error: { message: 'Listing not found' } });
      }
      if (!AuthenticationHelper.checkOwnership(req.headers.authorization, listing.userId)) {
        return res.status(401).json({ success: false, error: { message: 'No permission to modify other user listing' } });
      }
      listing.active = false;

      await listing.save();
      return res.json({ success: true, message: 'Listing deleted successfully.'});
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: 'No permission to use this API call' } });
  }
};

/**
 * routers.get('/listings', ownListing);
 */
export const ownListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], ['supplierId']);
  if (!params.result) return res.status(400).json({ success: false, error: { message: params.message } });
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'GET_LISTING']);
    try {
      if (tokenResponse.decoded.userType === 'consumer') {
      if (!req.query.supplierId) {
        res.status(400).json({ success: false, error: { message: 'supplierId or listingId must be sent' } });
      }
      const listings = await ListingsModel.find({
        projectId: req.headers.projectid,
        userId: req.query.supplierId,
        active: true,
      }, ListingProjection);
      const listingMods = [];

      for (let listing of listings) {
        const listingMod = listing.toObject();
        listingMod.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listing);
        const userProperties = await Users.findOne({ id: listingMod.userId }, userProjectionSimple);
        listingMod.userProperties = userProperties.toObject();
        listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));
        listingMods.push(listingMod);
      }

      return res.json({ success: true, data: listingMods });
      } else {
        const listings = await ListingsModel.find({
          projectId: req.headers.projectid,
          userId: tokenResponse.decoded.userId,
          active: true
        }, ListingProjection);
        const listingMods = [];

        for (let listing of listings) {
          const listingMod = listing.toObject();
          const userProperties = await Users.findOne({ id: listingMod.userId }, userProjectionSimple);
          listingMod.userProperties = userProperties.toObject();
          listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));
          listingMods.push(listingMod);
        }

        return res.json({ success: true, data: listingMods });
      }
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: 'No permission to use this API call' } });
  }
};

/**
 * routers.get('/listings/:listingId', singleListing);
 */
export const singleListing = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({ success: false, error: { message: params.message } });
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);

  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'GET_LISTING']);
    try {
      if (tokenResponse.decoded.userType === 'consumer') {
        const listing = await ListingsModel.findOne({
          projectId: req.headers.projectid,
          id: req.params.listingId,
        }, ListingProjection);
        if (!listing) {
          return res.status(404).json({ success: false, error: { message: 'Listing not found.' } });
        }

        listing.price = PriceHelper.calculate(req.project.projectOptions.priceComponents, listing);
        const listingMod = listing.toObject();
        listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));

        return res.json({ success: true, data: listingMod });
      } else if (tokenResponse.decoded.userType === 'supplier') {
        const listing = await ListingsModel.findOne({
          projectId: req.headers.projectid,
          id: req.params.listingId,
          userId: tokenResponse.decoded.userId,
          active: true
        }, ListingProjection);
        if (!listing) {
          return res.status(404).json({ success: false, error: { message: 'Listing not found.' } });
        }
        const listingMod = listing.toObject();
        listingMod.tags.every( tag => ProjectionHelper.use(ListingTagsProjection, tag));

        return res.json({ success: true, data: listingMod });
      }
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: 'No permission to use this API call' } });
  }
};