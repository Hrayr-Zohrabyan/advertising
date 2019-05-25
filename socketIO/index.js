import AuthenticationHelper from '../helpers/AuthenticationHelper';
import Utils from '../helpers/Utils';
import Chats from '../models/chats';

export default class SocketIO {
  static clients = {};

  static start(io) {
    io.on('connection', (socket) => {
      const decoded = SocketIO.validateSocket(socket.handshake.query);
      if (!decoded) {
        socket.disconnect();
      }
      SocketIO.registerId(socket.id, decoded.userId);
      socket.on('sendMessage', async (payload) => {
        const message = JSON.parse(payload);
        if (SocketIO.clients[message.for]) {
          try {
            const chat = await Chats.findOne({
              user1: Utils.smallerString(decoded.userId, message.for),
              user2: Utils.largerString(decoded.userId, message.for)
            });
            if (!chat) {
              const newChat = await Chats.create({
                project: decoded.project,
                user1: Utils.smallerString(decoded.userId, message.for),
                user2: Utils.largerString(decoded.userId, message.for),
                messages: [
                  {
                    userId: decoded.userId, 
                    body: message.body
                  }
                ]
              });
              socket.to(SocketIO.clients[message.for]).emit('message', {body: message.body, id: newChat.messages[newChat.messages.length-1].id});
            } else {
              chat.messages.push({
                userId: decoded.userId, 
                body: message.body
              });
              await chat.save();
              socket.to(SocketIO.clients[message.for]).emit('message', {body: message.body, id: chat.messages[chat.messages.length-1].id});
            }
          } catch (e) {
            console.error(e);
          }
        }
      });
      socket.on('readMessage', async (payload) => {
        const message = JSON.parse(payload);
        try {
          const chat = await Chats.findOne({
            user1: Utils.smallerString(decoded.userId, message.for),
            user2: Utils.largerString(decoded.userId, message.for),
          });
          for (let chatMessage of chat.messages) {
            if (chatMessage.id == payload.id) {
              chatMessage.seen = true;
            }
          }
          await chat.save();
          socket.to(SocketIO.clients[message.for]).emit('messageIsRead', {id: message.id});
        } catch (e) {
          console.error(e);
        }
      });
      socket.on('disconnect', () => {
        SocketIO.unregisterId();
      });
    });
  }

  static validateSocket(handshakeQuery) {
    const token = handshakeQuery.Authorization;
    if (!token) {
      return false;
    }
    const tokenResponse = AuthenticationHelper.decodeToken(token);
    if(tokenResponse.authSuccess) {
      return tokenResponse.decoded;
    } else {
      return false;
    }
  }

  static registerId(socketId, userId) {
    SocketIO.clients[userId] = socketId;
  }

  static unregisterId(userId) {
    if (SocketIO.clients[userId]) {
      SocketIO.clients[userId] = null;
    }
  }
}