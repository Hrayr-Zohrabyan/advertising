import Users from '../models/users';
import moment from 'moment';

export default class AvailabilityHelper {
  static async check(project, supplierId, orderDate) {
    orderDate = moment(orderDate);
    const user = await Users.findOne({id: supplierId});
    const orderWeekDay = orderDate.format('dddd').toLowerCase();
    const orderTime = orderDate.format('HH:mm');

    if(project.projectOptions.supplierHasAvailability) {
      for (let availabilityExclusion of user.availability.exclusions) {
        if (moment(availabilityExclusion).isSame(orderDate, 'day')) {
          return Promise.reject({message: 'User is not available at that time.'});
        }
      }
      if (!user.availability[orderWeekDay].active) {
        return Promise.reject({message: 'User is not available at that time.'});
      }
      if (moment(orderTime, 'HH:mm').isBefore(moment(user.availability[orderWeekDay].hours.start, 'HH:mm')) || moment(orderTime, 'HH:mm').isAfter(moment(user.availability[orderWeekDay].hours.end, 'HH:mm'))) {
        return Promise.reject({message: 'User is not available at that time.'});
      }
      if (!project.projectOptions.multipleOrdersAtTheSameTime) {
        for (let orderExclusion of user.availability.orders) {
          if (orderDate.isAfter(moment(orderExclusion).subtract(project.projectOptions.orderTakesHoursBefore, 'hour')) && orderDate.isBefore(moment(orderExclusion).add(project.projectOptions.orderTakesHoursAfter, 'hour'))) {
            return Promise.reject({message: 'User is not available at that time.'});
          }
        }
      }
    }
    
    return Promise.resolve();
  }

  static reccurs(listing, searchDate) {
    if (listing.isRecurring) {
      if (listing.recurringCycle == 'daily') {
        if (moment(searchDate).isAfter(moment(listing.listingDate), 'day')) {
          return true;
        }
        return false;
      } else if (listing.recurringCycle == 'weekly') {
        if (moment(searchDate).isAfter(moment(listing.listingDate), 'day') && moment(searchDate).format('dddd') == moment(listing.listingDate).format('dddd')) {
          return true;
        }
        return false;
      } else if (listing.recurringCycle == 'monthly') {
        if (moment(searchDate).isAfter(moment(listing.listingDate), 'day') && moment(searchDate).format('DD') == moment(listing.listingDate).format('DD')) {
          return true;
        }
        return false;
      }
    }
    return false;
  }
}