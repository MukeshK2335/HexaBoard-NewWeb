const functions = require("firebase-functions");
const admin = require("firebase-admin");
const csv = require("csv-parser");
const Busboy = require("busboy");
const stream = require("stream");
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Function to send a welcome email using SendGrid
async function sendWelcomeEmail(email, name, userId, password) {
    try {
        await admin.firestore().collection('mail').add({ // 'mail' is the default collection, change if you configured differently
            to: email,
            message: {
                subject: 'Welcome to HexaBoard - Your Account Details!',
                html: `
                    <p>Hello ${name},</p>
                    <p>Your account has been created for HexaBoard. Here are your login details:</p>
                    <p><strong>User ID:</strong> ${userId}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p>Please keep this information secure.</p>
                    <p>Thank you,<br>The HexaBoard Team</p>
                `,
            },
        });
        console.log(`Welcome email trigger sent for ${email}`);
    } catch (error) {
        console.error('Error triggering welcome email:', error);
    }
}

// Helper function to find or create a department
async function findOrCreateDepartment(departmentName) {
    const departmentsRef = admin.firestore().collection("departments");
    const q = departmentsRef.where("name", "==", departmentName).limit(1);
    const snapshot = await q.get();

    if (!snapshot.empty) {
        const departmentDoc = snapshot.docs[0];
        return { id: departmentDoc.id, ...departmentDoc.data() };
    } else {
        // Create new department
        const newDepartmentRef = await departmentsRef.add({
            name: departmentName,
            description: `Department for ${departmentName}`,
            manager: "", // Default or placeholder
            location: "", // Default or placeholder
            memberCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { id: newDepartmentRef.id, name: departmentName, memberCount: 0 };
    }
}

exports.uploadFreshers = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const busboy = new Busboy({ headers: req.headers });
        const users = [];

        busboy.on("file", (fieldname, file, filename) => {
            const bufferStream = new stream.PassThrough();
            file.pipe(bufferStream);

            bufferStream
                .pipe(csv())
                .on("data", (row) => {
                    if (row.email && row.name && row.department) { // Ensure department is present
                        users.push({
                            email: row.email.trim(),
                            name: row.name.trim(),
                            role: row.role?.trim() || "fresher",
                            departmentName: row.department.trim(), // Use departmentName from CSV
                        });
                    }
                })
                .on("end", async () => {
                    const success = [];
                    const failed = [];

                    for (const user of users) {
                        const password = generatePassword();
                        try {
                            // Find or create department
                            const department = await findOrCreateDepartment(user.departmentName);

                            const userRecord = await admin.auth().createUser({
                                email: user.email,
                                password,
                                displayName: user.name,
                            });

                            await admin.firestore().collection("users").doc(userRecord.uid).set({
                                name: user.name,
                                email: user.email,
                                role: user.role,
                                departmentId: department.id, // Assign department ID
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });

                            // Increment department member count
                            await admin.firestore().collection("departments").doc(department.id).update({
                                memberCount: admin.firestore.FieldValue.increment(1),
                                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                            });

                            // Send welcome email with generated password and user ID
                            await sendWelcomeEmail(user.email, user.name, user.email, password);

                            success.push({ email: user.email });
                        } catch (err) {
                            failed.push({ email: user.email, error: err.message });
                        }
                    }

                    res.status(200).json({ success, failed });
                });
        });

        busboy.on("finish", () => {
            // No-op: handled in 'end' above
        });

        req.pipe(busboy);
    });
});

function generatePassword(length = 10) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

exports.addFresher = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const { name, email, departmentName, startDate } = req.body; // Get departmentName

        if (!departmentName) {
            return res.status(400).json({ success: false, error: "Department name is required." });
        }

        try {
            // Find or create department
            const department = await findOrCreateDepartment(departmentName);

            const password = generatePassword(); // Generate a random password

            const userRecord = await admin.auth().createUser({
                email,
                password, // Set the generated password
                displayName: name,
            });

            await admin.firestore().collection("users").doc(userRecord.uid).set({
                name,
                email,
                departmentId: department.id, // Assign department ID
                startDate: startDate || null, // Set to null if undefined
                role: "fresher",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Increment department member count
            await admin.firestore().collection("departments").doc(department.id).update({
                memberCount: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Send welcome email with generated password and user ID
            await sendWelcomeEmail(email, name, email, password);

            res.status(200).json({ success: true, userId: userRecord.uid, password: password });
        } catch (error) {
            console.error("Error adding fresher:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});