import express from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/role.js';
import Bill from '../models/bill-model.js';
import PedodonticsCase from '../models/PedodonticsCase.js';
import CompleteDentureCase from '../models/CompleteDentureCase.js';
import Fpd from '../models/Fpd-model.js';
import Implant from '../models/Implant-model.js';
import ImplantPatientCase from '../models/ImplantPatient-model.js';
import PartialDentureCase from '../models/partial-model.js';
import GeneralCase from '../models/GeneralCase.js';

const router = express.Router();

// Helper to get today window
const getTodayWindow = () => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return { start, end };
};

// GET /api/billing/patient/:patientId/today-cases
// Returns all case sheets created today for the given patient across departments
router.get('/patient/:patientId/today-cases', auth, requireRole(['admin']), async (req, res) => {
	try {
		const { patientId } = req.params;
		const { start, end } = getTodayWindow();

		const [
			generalCases,
			pedodontics,
			completeDenture,
			fpd,
			implant,
			implantPatient,
			partial,
		] = await Promise.all([
			GeneralCase.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			PedodonticsCase.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			CompleteDentureCase.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			Fpd.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			Implant.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			ImplantPatientCase.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
			PartialDentureCase.find({ patientId, createdAt: { $gte: start, $lt: end } }).select('patientId patientName doctorName createdAt'),
		]);

		const mapCases = (department, list) =>
			list.map((c) => ({
				caseId: String(c._id),
				department,
				patientId: c.patientId,
				patientName: c.patientName,
				doctorName: c.doctorName,
				caseDate: c.createdAt,
			}));

		const allCases = [
			...mapCases('general', generalCases),
			...mapCases('pedodontics', pedodontics),
			...mapCases('complete_denture', completeDenture),
			...mapCases('fpd', fpd),
			...mapCases('implant', implant),
			...mapCases('implant_patient', implantPatient),
			...mapCases('partial_denture', partial),
		].sort((a, b) => new Date(b.caseDate) - new Date(a.caseDate));

		return res.json({ success: true, data: allCases });
	} catch (error) {
		console.error('Error fetching today cases for billing:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch today cases for billing', error: error.message });
	}
});

// GET /api/billing/:patientId - previous bills for a patient
router.get('/:patientId', auth, requireRole(['admin']), async (req, res) => {
	try {
		const { patientId } = req.params;
		const bills = await Bill.find({ patientId }).sort({ createdAt: -1 });
		return res.json(bills);
	} catch (error) {
		console.error('Error fetching bills:', error);
		return res.status(500).json({ success: false, message: 'Failed to fetch bills', error: error.message });
	}
});

// POST /api/billing - create a new bill entry
router.post('/', auth, requireRole(['admin']), async (req, res) => {
	try {
		const { patientId, patientName, totalAmount, paymentMethod, description, cases } = req.body;

		if (!patientId || totalAmount === undefined || totalAmount === null) {
			return res.status(400).json({ success: false, message: 'patientId and totalAmount are required' });
		}

		const bill = new Bill({
			patientId,
			patientName,
			totalAmount,
			paymentMethod: paymentMethod || 'cash',
			description,
			cases: Array.isArray(cases)
				? cases.map((c) => ({
						caseId: c.caseId,
						department: c.department,
						doctorName: c.doctorName,
						caseDate: c.caseDate ? new Date(c.caseDate) : undefined,
					}))
				: [],
			createdBy: req.user?.Identity || req.user?.name || undefined,
		});

		await bill.save();

		return res.status(201).json({ success: true, message: 'Bill created successfully', data: bill });
	} catch (error) {
		console.error('Error creating bill:', error);
		return res.status(500).json({ success: false, message: 'Failed to create bill', error: error.message });
	}
});

export default router;
