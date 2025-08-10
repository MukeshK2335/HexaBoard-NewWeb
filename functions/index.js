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

                            await admin.firestore().collection("users").doc(userRecord.uid).collection("coding_challenge").add({});

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

            await admin.firestore().collection("users").doc(userRecord.uid).collection("coding_challenge").add({});

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

exports.getFreshersCount = functions.https.onCall(async (data, context) => {
    try {
        const freshersRef = admin.firestore().collection("users");
        const q = freshersRef.where("role", "==", "fresher");
        const snapshot = await q.count().get();
        return { count: snapshot.data().count };
    } catch (error) {
        console.error("Error getting freshers count:", error);
        throw new functions.https.HttpsError("internal", "Unable to fetch freshers count.", error.message);
    }
});

exports.getCoursesCount = functions.https.onCall(async (data, context) => {
    try {
        const coursesRef = admin.firestore().collection("courses");
        const snapshot = await coursesRef.count().get();
        return { count: snapshot.data().count };
    } catch (error) {
        console.error("Error getting courses count:", error);
        throw new functions.https.HttpsError("internal", "Unable to fetch courses count.", error.message);
    }
});

exports.getSubmissionsCount = functions.https.onCall(async (data, context) => {
    try {
        const submissionsRef = admin.firestore().collection("submissions");
        const snapshot = await submissionsRef.count().get();
        return { count: snapshot.data().count };
    } catch (error) {
        console.error("Error getting submissions count:", error);
        throw new functions.https.HttpsError("internal", "Unable to fetch submissions count.", error.message);
    }
});

exports.getActiveUsersCount = functions.https.onCall(async (data, context) => {
    try {
        // For simplicity, let's define active users as those with role 'fresher' and 'status' as 'active'
        // You might need to adjust this based on your actual 'active user' definition and data structure
        const activeUsersRef = admin.firestore().collection("users");
        const q = activeUsersRef.where("role", "==", "fresher").where("status", "==", "active");
        const snapshot = await q.count().get();
        return { count: snapshot.data().count };
    } catch (error) {
        console.error("Error getting active users count:", error);
        throw new functions.https.HttpsError("internal", "Unable to fetch active users count.", error.message);
    }
});

exports.deleteFresher = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated and is an admin
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete freshers.');
    }

    const { uid, email } = data;

    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID (uid) is required.');
    }

    try {
        // Delete user from Firebase Authentication
        await admin.auth().deleteUser(uid);

        // Delete user's document from Firestore
        await admin.firestore().collection('users').doc(uid).delete();

        // Optionally, delete any subcollections or related data for the user
        // For example, if freshers have a 'courses' subcollection:
        const coursesRef = admin.firestore().collection('users').doc(uid).collection('courses');
        const coursesSnapshot = await coursesRef.get();
        const batch = admin.firestore().batch();
        coursesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Successfully deleted user: ${email} (UID: ${uid})`);
        return { success: true, message: `User ${email} deleted successfully.` };
    } catch (error) {
        console.error(`Error deleting user ${email} (UID: ${uid}):`, error);
        // Check if the error is due to user not found in Auth
        if (error.code === 'auth/user-not-.found') {
            // If user not found in Auth, still try to delete from Firestore
            try {
                await admin.firestore().collection('users').doc(uid).delete();
                console.log(`User ${email} not found in Auth but deleted from Firestore.`);
                return { success: true, message: `User ${email} not found in Auth but deleted from Firestore.` };
            } catch (firestoreError) {
                console.error(`Error deleting user from Firestore after Auth error:`, firestoreError);
                throw new functions.https.HttpsError('internal', 'Failed to delete user from Firestore after Auth error.', firestoreError.message);
            }
        }
        throw new functions.https.HttpsError('internal', 'Failed to delete user.', error.message);
    }
});