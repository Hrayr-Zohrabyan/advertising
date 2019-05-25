import AuthenticationHelper from '../helpers/AuthenticationHelper';
import OrderStatusHelper from '../helpers/OrderStatusHelper';
import ProjectionHelper from '../helpers/ProjectionHelper';
import AvailabilityHelper from '../helpers/AvailabilityHelper';
import PriceHelper from '../helpers/PriceHelper';
import FirebaseHelper from '../helpers/FirebaseHelper';
import Mailer from '../helpers/Mailer';
import Orders from '../models/orders';
import orderProjection from '../models/projections/order';
import Users from '../models/users';
import UserTokens from '../models/userTokens';
import Listings from '../models/listings';
import listingProjection from '../models/projections/listing';

/**
 * routers.get('/orders', viewOrder);
 */
export const viewOrder = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'VIEW_ORDER']);
    const searchObj = {
      projectId: req.headers.projectid
    };
    if (tokenResponse.decoded.userType == 'consumer') {
      searchObj.consumerId = tokenResponse.decoded.userId;
    } else if (tokenResponse.decoded.userType == 'supplier') {
      searchObj.supplierId = tokenResponse.decoded.userId;
    }

    try {
      const orders = await Orders.find(searchObj, orderProjection);
      const data = [];
      for (let order of orders) {
        order = order.toObject();
        const listingDetails = [];
        for(let singleListingDetails of order.listingDetails) {
          listingDetails.push(ProjectionHelper.use(listingProjection, singleListingDetails));
        }
        data.push({
          ...order,
          listingDetails: listingDetails,
        });
      }
      return res.json({success: true, data});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.post('/orders', addOrder);
 */
export const addOrder = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['listings', 'orderDate', 'orderPersons'], ['price', 'otherOptions']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'ADD_ORDER']);
    try {
      if (!req.project.projectOptions.orderCanHaveMultipleListings && req.body.listings.length > 1) {
        return res.status(400).json({success: false, error: {message: 'Order cannot have multiple listings.'}});
      }

      const order = [];
      let orderPrice = 0;
      const orderPriceComponents = {
        raw: 0,
        commission: 0,
        fixed: 0,
        features: 0,
        final: 0,
      };
      const listingIds = [];
      let supplierId;
      for (let l of req.body.listings) {
        for (let listingId of listingIds) {
          if(l.listingId === listingId) {
            return res.status(400).json({success: false, error: {message: 'Same listing cannot be sent multiple times.'}});
          }
        }
        listingIds.push(l.listingId);
        const listing = await Listings.findOne({id: l.listingId, projectId: req.headers.projectid});
        if (!listing) {
          return res.status(404).json({success: false, error: {message: 'Incorrect listing Id'}});
        }
        const listingMod = listing.toObject();
        if(!supplierId) {
          supplierId = listingMod.userId;
        }

        if (listingMod.userId !== supplierId) {
          return res.status(400).json({success: false, error: {message: 'Different user listings not posibble.'}});
        }
        if (tokenResponse.decoded.userId == supplierId) {
          return res.status(400).json({success: false, error: {message: 'You cannot make order on own listing.'}});
        }
        if(req.project.projectOptions.listingHasQuantity && !l.quantity) {
          return res.status(400).json({success: false, error: {message: 'Listing must have quantity.'}});
        }

        listingMod.quantity = req.project.projectOptions.listingHasQuantity ? l.quantity : 1;

        if (req.body.price) {
          listingMod.price = PriceHelper.calculateFromFinal(req.project.projectOptions.priceComponents, listingMod, req.body.price - req.project.projectOptions.priceComponents.oneTime);
        }

        listingMod.priceComponents = PriceHelper.calculate(req.project.projectOptions.priceComponents, listingMod);
        orderPrice += ((listingMod.priceComponents.final * l.quantity) + req.project.projectOptions.priceComponents.oneTime).toFixed(2);
        orderPriceComponents.raw += listingMod.priceComponents.raw * l.quantity;
        orderPriceComponents.commission += listingMod.priceComponents.commission * l.quantity;
        orderPriceComponents.fixed += listingMod.priceComponents.fixed * l.quantity;
        orderPriceComponents.features += listingMod.priceComponents.features * l.quantity;
        orderPriceComponents.final += listingMod.priceComponents.final * l.quantity;
        order.push(listingMod);
      }

      try {
        if (req.project.projectOptions.supplierHasAvailability) {
          await AvailabilityHelper.check(req.project, supplierId, req.body.orderDate);
        } else {
          for (let listing of req.body.listings) {
            await AvailabilityHelper.reccurs(listing, req.body.orderDate);
          }
        }
      } catch (e) {
        return res.status(404).json({success: false, error: {message: e.message}});
      }

      const addedOrder = await Orders.create({
        projectId: req.headers.projectid,
        supplierId: supplierId,
        consumerId: tokenResponse.decoded.userId,
        listingDetails: order,
        orderDate: req.body.orderDate,
        orderPersons: req.body.orderPersons,
        price: orderPrice,
        priceComponents: orderPriceComponents,
        otherOptions: req.body.otherOptions,
      });
      const listingDetails = [];
      for(let singleListingDetails of addedOrder.listingDetails) {
        listingDetails.push(ProjectionHelper.use(listingProjection, singleListingDetails));
      }
      const consumer = await Users.findOne({id: addedOrder.consumerId});
      const supplier = await Users.findOne({id: addedOrder.supplierId});
      if (req.project.projectOptions.registrationType == 'email') {
        Mailer.sendMail(req.project, consumer.username, 'New order', 'newOrder', {orderId: addedOrder.id});
        Mailer.sendMail(req.project, supplier.username, 'New order', 'newOrder', {orderId: addedOrder.id});
      } else if (req.project.projectOptions.registrationType == 'phone') {
        // SMS Service
      }
      return res.json({success: true, message: 'Order added successfully.', data: {
          ...ProjectionHelper.use(orderProjection, addedOrder),
          listingDetails: listingDetails,
        }});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.post('/orders/deposit', depositOrder);
 */
export const depositOrder = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['amount', 'orderId'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  try {
    if (!req.project.projectOptions.orderActivationRequiresDeposit) {
      return res.status(400).json({success: false, error: {message: 'No deposit needed.'}});
    }

    // TODO: Implement IP Whitelist
    const order = await Orders.findOne({id: req.body.orderId, project: req.headers.projectid});
    if (!order) {
      return res.status(404).json({success: false, error: {message: 'Order not found.'}});
    }
    order.deposit += req.body.amount;
    if (order.deposit >= (req.project.projectOptions.orderActivationDepositPercentage * order.priceComponents.raw/100)) {
      order.status = 'active';
    }
    await order.save();
    return res.json({success: true});

  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.patch('/orders/status', changeOrderStatus);
 */
export const changeOrderStatus = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['status'], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'CHANGE_ORDER_STATUS']);
    try {
      const order = await Orders.findOne({id: req.body.orderId, projectId: req.headers.projectid});
      if (!order) {
        return res.status(404).json({success: false, error: {message: 'Order not found'}});
      }

      if (!OrderStatusHelper.statusChangeValid(req.headers.authorization, order.status, req.body.status)) {
        return res.status(400).json ({success: false, error: {message: 'Incorrect order flow.'}});
      }
      if (!AuthenticationHelper.checkOwnership(req.headers.authorization, order.supplierId) && !AuthenticationHelper.checkOwnership(req.headers.authorization, order.consumerId)) {
        return res.status(401).json({success: false, error: {message: 'No permission to modify other user order'}});
      }
      order.status = req.body.status;
      const user = await Users.findOne({id: tokenResponse.decoded.userId});
      if (order.status == 'accepted') {
        user.availability.orders.push(order.orderDate);
        await user.save();
      }
      if (order.status == 'cancelled' || order.status == 'completed') {
        user.availability.orders.splice(user.availability.orders.indexOf(order.orderDate), 1);
        await user.save();
      }
      if (req.project.projectOptions.orderActivationRequiresDeposit) {
        if(order.status == 'active') {
          return res.status(400).json({success: false, error: {message: 'Order can be activated only by paying deposit.'}})
        }
      }
      const editedOrder = await order.save();
      const listingDetails = [];
      for(let singleListingDetails of editedOrder.listingDetails) {
        listingDetails.push(ProjectionHelper.use(listingProjection, singleListingDetails));
      }
      const consumer = await Users.findOne({id: editedOrder.consumerId});
      if (req.project.projectOptions.registrationType == 'email') {
        Mailer.sendMail(req.project, consumer.username, 'Order status changed', 'orderStatusChange', {orderId: editedOrder.id, newStatus: editedOrder.status});
        Mailer.sendMail(req.project, user.username, 'Order status changed', 'orderStatusChange', {orderId: editedOrder.id, newStatus: editedOrder.status});
      } else if (req.project.projectOptions.registrationType == 'phone') {
        // SMS Service
      }
      const firebaseConsumer = await UserTokens.findOne({userId: consumer.id});

      if (firebaseConsumer) {
        const message = {
          token: firebaseConsumer.token,
          notification: {
            title: 'Order status changed',
            body: `Your order status changed to ${editedOrder.status}`
          },
        };

        const response = await FirebaseHelper.sendMessage(message, req.project.id);
      }

      return res.json({success: true, message: 'Order status changed successfully.', data: {
          ...ProjectionHelper.use(orderProjection, editedOrder),
          listingDetails: listingDetails,
        }});
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.patch('/orders/review', setOrderRatingAndReview);
 */
export const setOrderRatingAndReview = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.body, ['rating'], ['review']);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});

  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);
  try {
    await AuthenticationHelper.checkPermission(req.project, req.headers.authorization, ['SUPER_USER', 'SET_ORDER_REVIEW']);
    try {
      const order = await Orders.findOne({id: req.body.orderId, project: req.headers.projectid});
      if (!order) {
        return res.status(404).json({success: false, error: {message: 'Order not found'}});
      }
      if (!AuthenticationHelper.checkOwnership(req.headers.authorization, order.supplierId) && !AuthenticationHelper.checkOwnership(req.headers.authorization, order.consumerId)) {
        return res.status(401).json({success: false, error: {message: 'No permission to modify other user order'}});
      }
      if (order.status !== 'completed') {
        return res.status(400).json ({success: false, error: {message: 'Only completed order can be rated.'}});
      }
      if ((tokenResponse.decoded.userType == 'supplier' && order.ratingSupplier !== 0) || (tokenResponse.decoded.userType == 'consumer' && order.ratingConsumer !== 0)) {
        return res.status(400).json ({success: false, error: {message: 'Rated order cannot be rated again.'}});
      }

      if (tokenResponse.decoded.userType == 'consumer' && order.ratingConsumer == 0) {
        order.ratingConsumer = req.body.rating;
        if (req.body.review) {
          order.reviewConsumer = req.body.review;
        }
        const editedOrder = await order.save();
        const listingDetails = [];
        for(let singleListingDetails of editedOrder.listingDetails) {
          listingDetails.push(ProjectionHelper.use(listingProjection, singleListingDetails));
        }
        const user = await Users.findOne({id: tokenResponse.decoded.userId});
        user.ratingCount++;
        user.ratingSum += req.body.rating;
        user.reviewsCount += req.body.review ? 1 : 0;
        await user.save();
        const customer = await Users.findOne({id: editedOrder.consumerId});
        if (req.project.projectOptions.registrationType == 'email') {
          Mailer.sendMail(req.project, customer.username, 'Order reviewed', 'orderReviewed', {orderId: editedOrder.id, rating: editedOrder.ratingConsumer, review: editedOrder.reviewConsumer});
          Mailer.sendMail(req.project, user.username, 'Order reviewed', 'orderReviewed', {orderId: editedOrder.id, rating: editedOrder.ratingConsumer, review: editedOrder.reviewConsumer});
        } else if (req.project.projectOptions.registrationType == 'phone') {
          // SMS Service
        }

        return res.json({success: true, message: 'Order review set successfully.', data: {
            ...ProjectionHelper.use(orderProjection, editedOrder),
            listingDetails: listingDetails,
          }});
      }
      if (tokenResponse.decoded.userType == 'supplier' && order.ratingSupplier == 0) {
        order.ratingSupplier = req.body.rating;
        if (req.body.review) {
          order.reviewSupplier = req.body.review;
        }
        const editedOrder = await order.save();
        const listingDetails = [];
        for(let singleListingDetails of editedOrder.listingDetails) {
          listingDetails.push(ProjectionHelper.use(listingProjection, singleListingDetails));
        }
        const user = await Users.findOne({id: tokenResponse.decoded.userId});
        user.ratingCount++;
        user.ratingSum += req.body.rating;
        user.reviewsCount += req.body.review ? 1 : 0;
        await user.save();
        const customer = await Users.findOne({id: editedOrder.consumerId});
        if (req.project.projectOptions.registrationType == 'email') {
          Mailer.sendMail(req.project, customer.username, 'Order reviewed', 'orderReviewed', {orderId: editedOrder.id, rating: editedOrder.ratingSupplier, review: editedOrder.reviewSupplier});
          Mailer.sendMail(req.project, user.username, 'Order reviewed', 'orderReviewed', {orderId: editedOrder.id, rating: editedOrder.ratingSupplier, review: editedOrder.reviewSupplier});
        } else if (req.project.projectOptions.registrationType == 'phone') {
          // SMS Service
        }
        return res.json({success: true, message: 'Order review set successfully.', data: {
            ...ProjectionHelper.use(orderProjection, editedOrder),
            listingDetails: listingDetails,
          }});
      }
    } catch (err) {
      return res.status(400).json({success: false, error: err.message});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};