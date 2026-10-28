import ChatMessage from '../models/ChatMessage.js';
import ServiceRequest from '../models/ServiceRequest.js';

/**
 * @desc    Get historical chat messages for a service request
 * @route   GET /api/chat/:serviceRequestId
 * @access  Private (User or Vendor)
 */
export const getChatHistory = async (req, res) => {
  try {
    const { serviceRequestId } = req.params;

    if (!serviceRequestId) {
      return res.status(400).json({ success: false, message: 'serviceRequestId is required' });
    }

    const messages = await ChatMessage.find({ serviceRequest: serviceRequestId })
      .sort({ createdAt: 1 })
      .lean();

    const formatted = messages.map((m) => ({
      _id: m._id,
      id: m._id,
      serviceRequestId: m.serviceRequest,
      senderId: m.sender,
      senderModel: m.senderModel,
      senderName: m.senderName,
      text: m.message,
      message: m.message,
      read: m.read,
      createdAt: m.createdAt,
      timestamp: m.createdAt,
    }));

    return res.status(200).json({
      success: true,
      messages: formatted,
    });
  } catch (error) {
    console.error('getChatHistory error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching chat transcript' });
  }
};

/**
 * @desc    Send a chat message via REST fallback
 * @route   POST /api/chat/:serviceRequestId
 * @access  Private (User or Vendor)
 */
export const postChatMessage = async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    const { text, message } = req.body;

    const content = (text || message || '').trim();
    if (!content) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty' });
    }

    const senderModel = req.user?.role === 'vendor' || req.vendor ? 'Vendor' : 'User';
    const senderId = req.user?._id || req.vendor?._id;
    const senderName = req.user?.name || req.vendor?.name || (senderModel === 'Vendor' ? 'Service Partner' : 'Customer');

    const newMsg = await ChatMessage.create({
      serviceRequest: serviceRequestId,
      senderModel,
      sender: senderId,
      senderName,
      message: content,
    });

    const formatted = {
      _id: newMsg._id,
      id: newMsg._id,
      serviceRequestId: newMsg.serviceRequest,
      senderId: newMsg.sender,
      senderModel: newMsg.senderModel,
      senderName: newMsg.senderName,
      text: newMsg.message,
      message: newMsg.message,
      createdAt: newMsg.createdAt,
      timestamp: newMsg.createdAt,
    };

    const io = req.app.get('socketio');
    if (io) {
      io.to(`chat_${serviceRequestId}`).emit('receiveMessage', formatted);
    }

    return res.status(201).json({
      success: true,
      message: formatted,
    });
  } catch (error) {
    console.error('postChatMessage error:', error);
    return res.status(500).json({ success: false, message: 'Error sending message' });
  }
};

/**
 * @desc    Get unread message count for a service request
 * @route   GET /api/chat/:serviceRequestId/unread
 * @access  Private
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    const currentModel = req.user?.role === 'vendor' || req.vendor ? 'Vendor' : 'User';

    // Unread count is messages sent by the OTHER model
    const otherModel = currentModel === 'Vendor' ? 'User' : 'Vendor';
    const count = await ChatMessage.countDocuments({
      serviceRequest: serviceRequestId,
      senderModel: otherModel,
      read: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({ success: false, message: 'Error counting unread messages' });
  }
};

/**
 * @desc    Mark messages as read for a service request
 * @route   POST/PUT /api/chat/:serviceRequestId/read
 * @access  Private
 */
export const markChatRead = async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    const currentModel = req.user?.role === 'vendor' || req.vendor ? 'Vendor' : 'User';
    const otherModel = currentModel === 'Vendor' ? 'User' : 'Vendor';

    await ChatMessage.updateMany(
      { serviceRequest: serviceRequestId, senderModel: otherModel, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'Chat marked as read',
    });
  } catch (error) {
    console.error('markChatRead error:', error);
    return res.status(500).json({ success: false, message: 'Error marking chat read' });
  }
};

