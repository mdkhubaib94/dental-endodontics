# Oral Department Credentials

## 🦷 Oral Department Users

### Chief Doctor (Oral Department)
- **Email:** `oral.chief@dental.com`
- **Password:** `Oral@123`
- **Identity:** `ORAL_CHIEF_001`
- **Department:** Oral
- **Specialization:** Oral and Maxillofacial Surgery
- **Role:** Chief Doctor

**Permissions:**
- View all Oral department cases
- Approve/Reject Oral cases
- Request Redo for cases
- Manage doctors in Oral department
- View department analytics

---

### Doctor (Oral Department)
- **Email:** `oral.doctor@dental.com`
- **Password:** `Oral@456`
- **Identity:** `ORAL_DOC_001`
- **Department:** Oral
- **Specialization:** Oral Surgery
- **Staff ID:** `STAFF_ORAL_001`
- **Role:** Doctor

**Permissions:**
- Create Oral case sheets
- View own cases
- Update case information
- Submit cases for chief approval

---

## 🔐 Security Notes

⚠️ **IMPORTANT:** Please change these default passwords after first login!

## 📝 How to Create Additional Users

### Create More Oral Department Users

Run the scripts in the `server/scripts/` directory:

```bash
# Create Oral Chief Doctor
node server/scripts/create-oral-chief.js

# Create Oral Doctor
node server/scripts/create-oral-doctor.js
```

### Create Users via Admin Panel

Chief Doctors can also create additional doctors, PGs, and UGs through the admin dashboard:
1. Login as Chief Doctor
2. Navigate to "Assign Doctor" section
3. Fill in the required details
4. System will auto-generate credentials and send via email

---

## 🏥 Department Configuration

The Oral department is configured to handle:
- Chief Complaint
- History of Present Illness
- Past Medical/Dental History
- Extra-oral and Intra-oral Examination
- Radiographic Findings
- Diagnosis (Provisional & Final)
- Treatment Planning
- Procedure Details
- Post-operative Instructions
- Follow-up Management

---

## 🔗 API Endpoints

All Oral department endpoints are available at:
- Base URL: `/api/oral`
- Chief Doctor Cases: `/api/oral/chief/all-cases`
- Doctor Cases: `/api/oral/doctor/:doctorId`
- Patient Cases: `/api/oral/patient/:patientId`
- Approve Case: `/api/oral/:id/approve`

---

## 📞 Support

For any issues or questions regarding the Oral department setup, please contact the system administrator.
