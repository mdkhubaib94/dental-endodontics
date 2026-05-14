import mongoose from 'mongoose';

const BillSchema = new mongoose.Schema({
	patientId: {
		type: String,
		required: true,
		index: true,
	},
	patientName: {
		type: String,
	},
	// Optional short identifier for the visit/day if needed later
	visitDate: {
		type: Date,
		default: () => new Date(),
		index: true,
	},
	cases: [
		{
			caseId: {
				type: String,
			},
			department: {
				type: String,
			},
			doctorName: {
				type: String,
			},
			caseDate: {
				type: Date,
			},
		},
	],
	totalAmount: {
		type: Number,
		required: true,
		min: [0, 'Total amount cannot be negative'],
	},
	paymentMethod: {
		type: String,
		default: 'cash',
	},
	description: {
		type: String,
	},
	createdBy: {
		// Admin identity or name
		type: String,
	},
}, {
	timestamps: true,
});

BillSchema.index({ patientId: 1, createdAt: -1 });

const Bill = mongoose.models.Bill || mongoose.model('Bill', BillSchema);

export default Bill;
