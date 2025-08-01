const functions = require("firebase-functions");
const admin = require("firebase-admin");
const csv = require("csv-parser");
const Busboy = require("busboy");
const stream = require("stream");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();

// Set SendGrid API Key from Firebase functions config
sgMail.setApiKey(functions.config().sendgrid.key);

// Limit concurrent containers
functions.runWith({ maxInstances: 10 });

function generatePassword(length = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Function to send a welcome email using SendGrid
async function sendWelcomeEmail(email, name, password) {
    const msg = {
        to: email,
        from: "noreply@yourdomain.com", // Replace with your verified SendGrid sender email
        subject: "Welcome to HexaBoard!",
        html: `
            <p>Hello ${name},</p>
            <p>Your account has been created. Here are your login credentials:</p>
            <ul>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Password:</strong> ${password}</li>
            </ul>
            <p>You can log in at <a href="https://hexaboard-newweb.web.app">HexaBoard</a>.</p>
        `,
    };

    try {
        await sgMail.send(msg);
        console.log(`Welcome email sent to ${email} via SendGrid`);
    } catch (error) {
        console.error(`Failed to send welcome email to ${email} via SendGrid:`, error);
        if (error.response) {
            console.error(error.response.body)
        }
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
                            password: password, // Store the generated password
                            role: user.role,
                            departmentId: department.id, // Assign department ID
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });

                        // Increment department member count
                        await admin.firestore().collection("departments").doc(department.id).update({
                            memberCount: admin.firestore.FieldValue.increment(1),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });

                        // Send welcome email
                        await sendWelcomeEmail(user.email, user.name, password);

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

exports.addFresher = functions.https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { name, email, department: departmentName, startDate } = req.body; // Get departmentName
    const password = generatePassword();

    try {
        // Find or create department
        const department = await findOrCreateDepartment(departmentName);

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name,
        });

        await admin.firestore().collection("users").doc(userRecord.uid).set({
            name,
            email,
            departmentId: department.id, // Assign department ID
            startDate,
            role: "fresher",
            password: password, // Store the generated password
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Increment department member count
        await admin.firestore().collection("departments").doc(department.id).update({
            memberCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send welcome email
        await sendWelcomeEmail(email, name, password);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error adding fresher:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

