import CallLog from "../models/model.callLog.js";

export const logCall = async (req, res) => {
  try {
    const call = await CallLog.create(req.body);
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getCallLogs = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = {};
    if (userId) filter.$or = [{ caller: userId }, { receiver: userId }];

    const logs = await CallLog.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const flagCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { flaggedBy, reason } = req.body;

    const call = await CallLog.findById(id);
    if (!call) return res.status(404).json({ success: false, error: "Call not found" });

    call.isFlagged = true;
    call.flaggedBy = flaggedBy;
    call.flaggedReason = reason;
    call.flaggedAt = new Date();

    await call.save();

    res.status(200).json({ success: true, data: call });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getFlaggedCalls = async (req, res) => {
  try {
    const flagged = await CallLog.find({ isFlagged: true }).sort({ flaggedAt: -1 });
    res.status(200).json({ success: true, count: flagged.length, data: flagged });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const unflagCall = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await CallLog.findById(id);
    if (!call) return res.status(404).json({ success: false, error: "Call not found" });

    call.isFlagged = false;
    call.flaggedBy = null;
    call.flaggedReason = null;
    call.flaggedAt = null;

    await call.save();

    res.status(200).json({ success: true, message: "Call unflagged successfully", data: call });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
