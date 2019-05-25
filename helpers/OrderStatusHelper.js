import orderStatuses from '../constants/orderStatuses';
import AuthenticationHelper from './AuthenticationHelper';

export default class OrderStatusHelper {
  static statusCorrect(status) {
    if (orderStatuses.indexOf(status) == -1) {
      return false;
    }
    return true;
  }

  static statusChangeValid(rawToken, oldStatus, newStatus) {
    if (OrderStatusHelper.statusCorrect(newStatus)) {
      const userType = AuthenticationHelper.decodeToken(rawToken).decoded.userType;
      if (userType !== 'supplier' || (oldStatus == 'pending' && (newStatus !== 'accepted' && newStatus !== 'rejected'))) {
        return false;
      }
      if (oldStatus == 'accepted' && (newStatus !== 'active' && newStatus !== 'cancelled')) {
        return false;
      }
      if (userType !== 'supplier' || (oldStatus == 'active' && newStatus !== 'completed')) {
        return false;
      }
      return true;
    } else {
      return false;
    }
  }
}