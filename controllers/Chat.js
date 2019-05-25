import AuthenticationHelper from '../helpers/AuthenticationHelper';
import Utils from '../helpers/Utils';
import Chats from  '../models/chats';

/**
 * routers.get('/chats', userChat);
 */
export const userChat = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);

  try {
  await AuthenticationHelper.checkPermission(req.projectId, req.headers.authorization, ['SUPER_USER', 'CHAT']);
  try {
  const chats = await Chats.find({
    $or: [
      {user1: tokenResponse.decoded.userId},
      {user2: tokenResponse.decoded.userId}
    ]
  });
  return res.json({success: true, data: chats});
  } catch (err) {
    return res.status(403).json({success: false, error: {message: err.message}});
  }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};

/**
 * routers.get('/chats/:partner', singleChat);
 */
export const singleChat = async (req, res, next) => {
  const params = AuthenticationHelper.requireParams(req.query, [], []);
  if (!params.result) return res.status(400).json({success: false, error: {message: params.message}});
  const tokenResponse = AuthenticationHelper.decodeToken(req.headers.authorization);

  try {
    await AuthenticationHelper.checkPermission(req.projectId, req.headers.authorization, ['SUPER_USER', 'CHAT']);
    try {
      if (tokenResponse.decoded.userId === req.params.otherUser) {
        return res.status(403).json({success: false, error: {message: 'The users must be different'}});
      }
      const chat = await Chats.findOne({
        user1: Utils.smallerString(tokenResponse.decoded.userId, req.params.partner),
        user2: Utils.largerString(tokenResponse.decoded.userId, req.params.partner)
      });
      if (!chat) {
        return res.status(404).json({success: true, error: {message: 'Chat not found'}});
      }
      return res.json({success: true, data: chat});
    } catch (err) {
      return res.status(403).json({success: false, error: {message: err.message}});
    }
  } catch (err) {
    return res.status(403).json({success: false, error: {message: 'No permission to use this API call'}});
  }
};