import { Router } from 'express';
import auth from '../middleware/auth.js';
import CaseDraft from '../models/CaseDraft.js';

const router = Router();

const normalizeValue = (value) => String(value || '').trim();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const patientId = normalizeValue(req.query.patientId);
    const routeKey = normalizeValue(req.query.routeKey);

    if (!patientId || !routeKey) {
      return res.status(400).json({
        success: false,
        message: 'patientId and routeKey are required',
      });
    }

    const draft = await CaseDraft.findOne({
      userId: req.user._id,
      patientId,
      routeKey,
    })
      .select('patientId routeKey step data updatedAt')
      .lean();

    return res.json({ success: true, draft: draft || null });
  } catch (error) {
    console.error('Error loading case draft:', error);
    return res.status(500).json({ success: false, message: 'Failed to load case draft' });
  }
});

router.put('/', async (req, res) => {
  try {
    const patientId = normalizeValue(req.body?.patientId);
    const routeKey = normalizeValue(req.body?.routeKey);
    const rawStep = Number(req.body?.step);
    const data = req.body?.data && typeof req.body.data === 'object' ? req.body.data : {};

    if (!patientId || !routeKey) {
      return res.status(400).json({
        success: false,
        message: 'patientId and routeKey are required',
      });
    }

    const draft = await CaseDraft.findOneAndUpdate(
      {
        userId: req.user._id,
        patientId,
        routeKey,
      },
      {
        $set: {
          step: Number.isFinite(rawStep) ? rawStep : 0,
          data,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
      .select('patientId routeKey step data updatedAt')
      .lean();

    return res.json({ success: true, draft });
  } catch (error) {
    console.error('Error saving case draft:', error);
    return res.status(500).json({ success: false, message: 'Failed to save case draft' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const patientId = normalizeValue(req.query.patientId);
    const routeKey = normalizeValue(req.query.routeKey);

    if (!patientId || !routeKey) {
      return res.status(400).json({
        success: false,
        message: 'patientId and routeKey are required',
      });
    }

    await CaseDraft.deleteOne({
      userId: req.user._id,
      patientId,
      routeKey,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error clearing case draft:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear case draft' });
  }
});

router.get('/last/:patientId', async (req, res) => {
  try {
    const patientId = normalizeValue(req.params.patientId);
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'patientId is required' });
    }

    const draft = await CaseDraft.findOne({
      userId: req.user._id,
      patientId,
    })
      .sort({ updatedAt: -1 })
      .select('routeKey step updatedAt')
      .lean();

    return res.json({ success: true, resumeTarget: draft || null });
  } catch (error) {
    console.error('Error loading last case draft:', error);
    return res.status(500).json({ success: false, message: 'Failed to load latest case draft' });
  }
});

export default router;