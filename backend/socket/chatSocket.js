import ChatMessage from '../models/ChatMessage.js';

export const setupChatSocket = (io) => {
  io.on('connection', (socket) => {
    // Join chat room for a specific service request
    socket.on('joinChatRoom', (serviceRequestId) => {
      if (serviceRequestId) {
        const roomName = `chat_${serviceRequestId}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Client ${socket.id} joined ${roomName}`);
      }
    });

    // Leave chat room
    socket.on('leaveChatRoom', (serviceRequestId) => {
      if (serviceRequestId) {
        const roomName = `chat_${serviceRequestId}`;
        socket.leave(roomName);
        console.log(`[Socket.IO] Client ${socket.id} left ${roomName}`);
      }
    });

    // Handle incoming chat messages
    socket.on('sendMessage', async (payload, callback) => {
      try {
        const {
          serviceRequestId,
          senderId,
          senderModel = 'Vendor',
          senderName = '',
          text,
          message,
        } = payload || {};

        const content = (text || message || '').trim();
        if (!serviceRequestId || !content) {
          if (typeof callback === 'function') {
            callback({ success: false, error: 'serviceRequestId and message are required' });
          }
          return;
        }

        const savedMessage = await ChatMessage.create({
          serviceRequest: serviceRequestId,
          senderModel: senderModel === 'User' ? 'User' : 'Vendor',
          sender: senderId,
          senderName: senderName || (senderModel === 'Vendor' ? 'Service Partner' : 'Customer'),
          message: content,
        });

        const formatted = {
          _id: savedMessage._id,
          id: savedMessage._id,
          serviceRequestId: savedMessage.serviceRequest,
          senderId: savedMessage.sender,
          senderModel: savedMessage.senderModel,
          senderName: savedMessage.senderName,
          text: savedMessage.message,
          message: savedMessage.message,
          createdAt: savedMessage.createdAt,
          timestamp: savedMessage.createdAt,
        };

        const roomName = `chat_${serviceRequestId}`;
        io.to(roomName).emit('receiveMessage', formatted);

        if (typeof callback === 'function') {
          callback({ success: true, message: formatted });
        }
      } catch (err) {
        console.error('[Socket.IO] Error in sendMessage:', err);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });
  });
};
