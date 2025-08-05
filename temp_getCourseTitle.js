import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlrQOpX-BWgJ6fb5zQks9MfmTke1Ls3ys",
    authDomain: "hexaboard-a9ea8.firebaseapp.com",
    projectId: "hexaboard-a9ea8",
    storageBucket: "hexaboard-a9ea8.firebasestorage.app",
    messagingSenderId: "86808097323",
    appId: "1:86808097323:web:6f17bdc779424f9c0b706e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getCourseTitle(courseId) {
    try {
        const courseDocRef = doc(db, "courses", courseId);
        const courseDocSnap = await getDoc(courseDocRef);

        if (courseDocSnap.exists()) {
            console.log(courseDocSnap.data().title);
        } else {
            console.log("Course not found");
        }
    } catch (error) {
        console.error("Error fetching course:", error);
    }
}

getCourseTitle("k3EW6qrAPoBKAF8gKsQq");
